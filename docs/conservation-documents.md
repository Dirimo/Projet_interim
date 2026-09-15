# Pièces justificatives : conservation et sécurité

Ce document accompagne le modèle `DocumentCandidat` et le module
`backend/src/documents/`. Il décrit ce qui est en place, et surtout **ce qui ne
l'est pas** — les pièces concernées (NIR, pièce d'identité, RIB) comptent parmi
les données personnelles les plus sensibles que la plateforme manipule.

Il n'a pas été relu par un délégué à la protection des données. Les durées
ci-dessous sont des propositions à arbitrer par l'agence, pas des obligations
constatées.

---

## Ce que la plateforme stocke

| Champ            | Contenu                                               |
| ---------------- | ----------------------------------------------------- |
| `type`           | NIR, DIPLOME, CV, PIECE_IDENTITE, RIB                 |
| `nomOrigine`     | Nom du fichier tel que téléversé, pour réaffichage    |
| `typeMime`       | Constaté à la réception, restreint à la liste blanche |
| `taille`         | Octets, plafonnée à 10 Mo                             |
| `cheminStockage` | Identifiant opaque dans le stockage, jamais un nom    |
| `empreinte`      | SHA-256 du contenu                                    |
| `verifieLe`      | Date du contrôle par l'agence, nulle tant qu'absent   |
| `expireLe`       | Péremption, pour les pièces qui en ont une            |

**Le binaire n'est jamais en base.** Il vit dans le dossier désigné par
`STOCKAGE_DOCUMENTS`, sous un nom généré (UUID), rangé par deux caractères de
préfixe. Une colonne `bytea` rendrait chaque lecture de fiche coûteuse et les
sauvegardes impraticables.

**Un seul document par type et par candidat.** Déposer à nouveau remplace, et
l'ancien binaire est effacé. Un dossier qui accumulerait trois RIB ne dirait
plus lequel fait foi.

**Un remplacement annule la vérification.** Le contrôle de l'agence portait sur
le fichier précédent.

---

## Qui accède à quoi

| Acteur                | Droit                                              |
| --------------------- | -------------------------------------------------- |
| La personne concernée | Dépose, télécharge et retire ses propres pièces    |
| L'agence              | **Lit** les pièces de ses candidats, pour vérifier |
| L'établissement       | Aucun accès                                        |

L'agence ne peut ni déposer ni retirer à la place de quelqu'un : ces gestes
appartiennent à la personne, et un document retiré par un tiers serait
indéfendable en cas de litige.

Le cloisonnement par agence s'applique comme sur le reste du vivier :
`exigerAppartenance()` est appelée avant toute lecture côté back-office.

**Aucune racine n'est servie statiquement.** Un document ne sort que par une
route authentifiée qui vérifie à qui il appartient, et l'en-tête de réponse est
`Content-Disposition: attachment` — jamais `inline`, pour qu'un PDF téléversé ne
s'exécute pas dans le contexte de l'API.

---

## Durées de conservation — à arbitrer

Aucune purge automatique n'est en place. Les durées ci-dessous sont proposées
comme point de départ ; la commande `pnpm cli purger:documents` les applique à
la demande, jamais seule.

| Pièce            | Proposition                               | Raison                                                           |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Pièce d'identité | **Effacer dès la vérification constatée** | Rien n'oblige à conserver la copie une fois l'identité contrôlée |
| RIB              | Durée de la relation, puis effacement     | Sert au virement ; sans mission en cours il n'a plus d'objet     |
| NIR              | Durée de la relation, puis effacement     | Sert à la DPAE et à la paie                                      |
| Diplômes         | Durée de la relation + 5 ans              | Justifie les qualifications ayant permis un placement            |
| CV               | 2 ans après le dernier contact            | Durée usuelle admise pour une candidature                        |

**La question la plus lourde est celle de la pièce d'identité.** La conserver
au-delà du contrôle est difficile à justifier : la vérification peut être
constatée (`verifieLe`) sans que la copie soit gardée. C'est la première
décision à prendre avec un conseil juridique, parce qu'elle change ce que le
produit doit faire, pas seulement sa configuration.

---

## Ce qui manque avant un usage réel

1. **Aucun chiffrement au repos.** Les fichiers sont écrits en clair sur le
   disque. En production, le volume doit être chiffré, ou le contenu chiffré
   applicativement avec une clé hors du dépôt.
2. **Aucune analyse antivirale.** Un fichier téléversé est accepté sur la foi de
   son type MIME déclaré et de sa taille. Un passage par ClamAV, ou un service
   équivalent, est à prévoir avant que l'agence n'ouvre ces pièces.
3. **Le type MIME n'est pas vérifié contre le contenu.** Il est comparé à une
   liste blanche, mais reste une déclaration du navigateur. Une inspection de la
   signature du fichier (les premiers octets) le confirmerait.
4. **Aucune purge automatique.** La commande existe, le déclenchement
   périodique non.
5. **Aucune journalisation des accès.** Savoir qui a ouvert la pièce d'identité
   de qui, et quand, fait partie de ce qu'une autorité de contrôle demande.
6. **Aucune restitution automatisée.** Le droit à la portabilité s'exerce
   aujourd'hui par courriel, traité à la main.

---

## Purge manuelle

```bash
# Ce qui serait supprimé, sans rien écrire
pnpm cli purger:documents --type CV --jours 730 --sec

# Appliquer
pnpm cli purger:documents --type CV --jours 730
```

La commande ne touche qu'un type à la fois et exige un âge explicite : une purge
qui se déclencherait sur des valeurs par défaut est une perte de données qui
attend son heure.

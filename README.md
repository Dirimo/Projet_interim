# Relève

Agence d'intérim numérique pour l'aide à domicile.

L'agence place des intérimaires — auxiliaires de vie, aides-soignants, AES — chez des **services
d'aide et d'accompagnement à domicile (SAAD)** qui ont un besoin de remplacement, souvent à très
court terme. La plateforme remplace le tableur et le téléphone : vivier de candidats, référentiel
client, dépôt de besoin, matching, contractualisation, relevés d'heures.

Le SAAD est le **seul** type de client : `TypeClient` ne porte qu'une valeur, les particuliers
employeurs sont hors périmètre. Face à Hublo, qui vend un outil de recrutement, et à Mediflash, qui
contourne le salariat, la différenciation tient dans un vrai contrat de mission d'intérim —
l'analyse concurrentielle est dans
[`docs/analyse-de-marche.html`](docs/analyse-de-marche.html).

---

## État d'avancement

Le projet est un **POC de onze jours**. Deux sont consommés, neuf restent.

| Jalon                                             | Périmètre                                                                                                 | État                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| **J1–J2 — Socle et vivier**                       | Monorepo, authentification et rôles, référentiels, fiches candidats, back-office                          | **Livré**, 220 tests |
| **J3–J5 — Comptes, mission, profil**              | Inscription des deux profils, dépôt de besoin, candidature, validation, espace personnel de l'intérimaire | **Livré**            |
| **J5–J7 — Données publiques et matching**         | Import France Travail, baromètre, taux suggéré, moteur de matching à score explicable                     | **Livré**            |
| J7–J9 — Tableau de bord, SEO, no-code, conformité | Trois états de mission, pages publiques, n8n, RGAA / RGESN / RGPD                                         | À faire · 8 j·dev    |
| J10–J11 — Tests, livrables, soutenance            | Couverture transmise, étude de marché, chiffrage réel, pitch                                              | À faire · 4 j·dev    |

**26 j·dev pour 27 disponibles** à trois personnes. Les trois premiers jalons sont livrés ; restent
**12 j·dev** — tableau de bord, pages publiques et SEO, automatisations n8n, conformité, couverture
et livrables de soutenance. Le chiffrage
par fonctionnalité, le plan de repli et les livrables datés sont dans le cahier des charges figé à
J+2, qui sert de référence pour l'écart entre estimé et réel.

**La boucle produit est fermée** : un service publie un besoin, un intérimaire qualifié le voit et
postule, le service le confirme, la mission apparaît dans son suivi. Restent en base sans API les
contrats, les relevés d'heures et les factures.

---

## Stack

| Couche       | Choix                                                                |
| ------------ | -------------------------------------------------------------------- |
| Monorepo     | pnpm workspaces, TypeScript strict                                   |
| API          | NestJS 11, Prisma 6, Zod 4, Swagger                                  |
| Base         | PostgreSQL 16 + PostGIS (le géomatching candidat → lieu en dépendra) |
| File de jobs | Redis 7 (prévu pour BullMQ : matching différé, relances)             |
| Front        | Nuxt 4, Vue 3, rendu serveur                                         |
| Auth         | JWT signé HS256, mots de passe en Argon2id                           |
| Design       | Figma `9pCZmDqcx6nuuMRoYdLmNH`, transposé en tokens CSS              |

`shared` est le point d'articulation : les schémas Zod y sont écrits **une seule fois**
et servent à la fois à valider les entrées de l'API et les formulaires du front. Le package ne
dépend pas de Prisma, pour rester importable par le navigateur.

---

## Démarrage

Prérequis : **Node ≥ 22**, **pnpm 12**, **Docker**.

```bash
pnpm install                 # installe le workspace
cp .env.example backend/.env

pnpm infra:up                # PostgreSQL (5434), Redis (6380), Mailpit (8025)
pnpm db:migrate              # applique la migration
pnpm db:seed                 # jeu de données de démonstration

pnpm dev                     # API sur :3001, front sur :3000
```

Les courriels de confirmation partent sur **Mailpit** : rien à configurer, ils s'ouvrent dans le
navigateur sur **http://localhost:8025**. Aucun message ne sort de la machine, ce qui permet de
dérouler une inscription complète sans écrire à une vraie adresse.

````

```bash
pnpm test                    # 83 tests : contrats + intégration API
````

La base d'intégration (`passerelle_test`) est créée et migrée automatiquement au
premier lancement, puis vidée à chaque suite. Elle est distincte de la base de
développement.

Documentation de l'API générée : <http://localhost:3001/api/docs>.

Les ports **5434** et **6380** sont décalés volontairement : 5432, 5433 et 6379 sont souvent déjà
pris sur un poste de développement (Postgres local, WSL).

### Comptes de démonstration

Mot de passe commun : `Releve2026!`. Relancer `pnpm db:seed` réécrit les mots de passe, c'est
le moyen le plus simple de récupérer un accès en local.

| Adresse                        | Rôle                    | Rattachement             |
| ------------------------------ | ----------------------- | ------------------------ |
| `admin@releve.example`         | Administrateur d'agence | Agence pilote            |
| `charge@releve.example`        | Chargé de recrutement   | Agence pilote            |
| `secteur@les-tilleuls.example` | Client                  | Les Tilleuls (SAAD)      |
| `sophie.marchand@example.org`  | Candidat                | Fiche de Sophie Marchand |

Les deux derniers n'ont pas encore d'écran : leurs espaces arrivent aux lots 2 et 3. Leur jeton
porte déjà le bon rattachement.

---

## Données publiques

La plateforme consomme les offres d'intérim publiées sur **France Travail** pour les métiers du
secteur (codes ROME `J1501` aide-soignant, `K1302` assistance auprès d'adultes, `K1304` services
domestiques), et en tire un **baromètre de tension** par métier et par département.

```bash
# Collecte, nettoyage et enregistrement
pnpm cli importer:offres --jours 30 --departement 44,85,49

# Tout nettoyer et compter, sans rien écrire
pnpm cli importer:offres --jours 30 --sec

# Rejouer l'instantané livré avec le dépôt, sans réseau ni identifiants
pnpm cli importer:offres --fichier donnees/offres-echantillon.json

# Enregistrer un nouvel instantané brut
pnpm cli exporter:offres --jours 30 --sortie donnees/instantane.json

# Afficher le baromètre
pnpm cli barometre --jours 30 --departement 44
```

Les identifiants se créent sur [francetravail.io](https://francetravail.io) (application + souscription
à « Offres d'emploi v2 ») et se renseignent dans `backend/.env`. Sans eux, seul l'import par fichier
fonctionne.

### Ce que fait le nettoyage

La donnée brute n'est pas exploitable telle quelle. Sur un échantillon réel de 600 offres :

| Étape                              | Effet mesuré         |
| ---------------------------------- | -------------------- |
| Écartées faute de lieu exploitable | 5 offres             |
| Républications fusionnées          | 97 offres, soit 16 % |
| **Retenues**                       | **498**              |
| dont salaire exploitable           | 264                  |
| dont sans salaire annoncé          | 234                  |

- **Salaires** : huit formes de libellé coexistent (`Horaire de 15.0 Euros`,
  `Mensuel de 1800.0 Euros à 2000.0 Euros sur 12.0 mois`, `Annuel de 24000.0 Euros`, suivies parfois
  d'un commentaire libre). Tout est ramené à un taux horaire ; sur une fourchette on prend le milieu.
  Un libellé illisible donne `null`, jamais une valeur inventée.
- **Dédoublonnage** : les agences republient la même offre sous un nouvel identifiant. L'empreinte
  (métier + intitulé normalisé + employeur + commune) les fusionne, sinon la tension mesurée serait
  gonflée de 16 %.
- **Intitulés** : « Aide soignant (F/H) », « AIDE-SOIGNANT H/F - URGENT » sont ramenés à
  l'appellation du référentiel ROME, seule chaîne stable sur laquelle regrouper.
- **Lieux** : le département est tiré du libellé (`85 - Chaize-Giraud`), avec repli sur le code
  postal, et trois chiffres conservés pour l'outre-mer.

Ces règles sont des fonctions pures, sans base ni réseau, couvertes par 21 tests unitaires.

### Limite à énoncer

La médiane ne porte que sur les offres qui **annoncent** une rémunération, soit un peu plus de la
moitié. Le baromètre expose `offresSansSalaire` pour que la page le dise, plutôt que d'afficher un
chiffre qui aurait l'air complet.

---

## Matching

Le moteur répond à une question simple — **qui peut y aller, et dans quel ordre** — en deux temps
qui ne se mélangent jamais.

**1. Une porte binaire.** Elle écarte, avec un motif nommé : profil non validé par l'agence,
filière absente, diplôme non détenu ou expiré, absence déclarée sur la période, mission déjà
décrochée sur les mêmes dates, domicile au-delà du rayon déclaré, coordonnées manquantes. Rien ne
sert de classer quelqu'un qui ne peut pas y aller — et l'écarté sait pourquoi.

**2. Un score sur 100, toujours rendu décomposé.**

| Composante    | Poids | Ce qui est mesuré                                                     |
| ------------- | ----- | --------------------------------------------------------------------- |
| Compétences   | 40    | Diplôme exigé détenu ; son ancienneté départage, plafonnée à dix ans  |
| Zone          | 35    | Distance réelle au lieu, décroissance linéaire jusqu'au rayon déclaré |
| Disponibilité | 25    | Part de la vacation réellement couverte par les créneaux déclarés     |

Le total n'est jamais affiché sans ses trois lignes : un chargé de recrutement doit pouvoir dire à
un candidat pourquoi il est troisième, et un score devient indéfendable dès qu'on le conteste sans
pouvoir le décomposer.

```
89/100  Sophie Marchand
        Competences    32/40  Diplome exige detenu, obtenu il y a 5 ans
        Zone           32/35  A 3.2 km du lieu, pour un rayon declare de 35 km
        Disponibilite  25/25  100 % du creneau couvert par les disponibilites declarees
```

Le barème vit dans `backend/src/matching/score.ts`, **sans dépendance à Prisma ni à Nest** : il se
teste seul, avec des valeurs écrites à la main, et un poids se discute sans monter de base.

Deux partis pris à connaître. La distance est calculée par haversine en mémoire plutôt que par
PostGIS : à l'échelle d'un vivier d'agence c'est instantané et ça reste testable sans base. Et le
score est **figé sur la candidature** au moment où elle est déposée : le recalculer à l'affichage
le ferait bouger après coup — parce que le candidat a déplacé une disponibilité — et rendrait la
décision de l'établissement incompréhensible a posteriori.

---

## Design

Les maquettes vivent dans le fichier Figma `9pCZmDqcx6nuuMRoYdLmNH`. Le fichier **ne déclare
aucune variable Figma** : les couleurs y sont des hex posés à la main sur les écrans. Elles ont
donc été relevées et regroupées dans `frontend/app/assets/css/main.css`, qui devient la seule
source de vérité côté code.

| Ce que le Figma donne | Ce que le code en fait                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| Couleurs des écrans   | Tokens `--ground`, `--surface`, `--ink`, `--dom`, `--eta`…              |
| Rayons                | `--r-champ` 12px, `--r-marque` 13px, `--r-tuile` 14px, `--r-carte` 16px |
| Icônes                | SVG exportés, inlinés par `AppIcon.vue` avec `currentColor`             |
| Cadre mobile 402 px   | Layout `onboarding`, centré plutôt qu'étiré sur grand écran             |

Les icônes sont **inlinées** et non chargées en `<img>` : une balise image ne se recolore pas, et
le même tracé doit servir la puce verte d'un choix sélectionné et la puce grise d'un autre.

**Le thème sombre n'existe pas dans le Figma.** Les teintes sombres de `main.css` sont une
transposition des mêmes hues, faite pour que les écrans déjà codés restent lisibles. À faire
valider — ou à faire dessiner.

---

## Structure du dépôt

Trois paquets à la racine : le serveur, le client, et ce qu'ils partagent.

```
backend/                          API NestJS
  donnees/
    offres-echantillon.json       102 offres réelles, rejouables sans réseau
  prisma/
    schema.prisma                 modèle complet du produit + 3 invariants métier
    migrations/                   socle, session révocable, offres, SAAD, vérification e-mail
    seed.ts                       agence, qualifications, SAAD, candidats, comptes
  src/
    auth/                         authentification, rôles, sessions, mots de passe
      auth.decorateurs.ts         @Public, @Roles, @UtilisateurCourant, @AgenceCourante
      verification-email.service.ts  émission, confirmation et renvoi du lien
      jwt-auth.guard.ts           garde globale : fermé par défaut
      roles.guard.ts              contrôle de rôle
      sessions.service.ts         jetons de rafraîchissement, rotation, révocation
      inscriptions.service.ts     auto-inscription entreprise et intérimaire
      mots-de-passe.ts            Argon2id
    candidats/                    vivier : fiche, qualifications, disponibilités
    clients/                      clients SAAD et lieux d'intervention
    mail/                         sortie courriel, un seul point de sortie
      gabarits.ts                 les messages en clair, texte et HTML
    matching/                     porte d'éligibilité et score explicable
      score.ts                    le barème, sans Prisma ni Nest : testable seul
    missions/                     dépôt de besoin, visibilité par profil, annulation
    mon-profil/                   ce que l'intérimaire modifie sur sa propre fiche
    propositions/                 candidatures, décision du client, mission confirmée
    donnees-publiques/            France Travail : collecte, nettoyage, baromètre
      france-travail.client.ts    OAuth2 et pagination de l'API Offres d'emploi
      normalisation.ts            salaires et dédoublonnage (pur, testé sans base)
      offres.service.ts           import, médianes, taux suggéré
      cache.service.ts            Redis, namespacé par base, dégradation propre
      tension.controller.ts       GET /api/tension et /api/tension/suggestion
    cli/main.ts                   importer:offres, exporter:offres, barometre
    qualifications/               référentiel partagé
    utilisateurs/                 gestion des comptes
    common/
      zod-validation.pipe.ts      valide avec les schémas de @releve/shared
    health/                       sonde /api/sante
  test/                           146 tests d'intégration
    fixtures.ts                   deux agences symétriques, app de test
    cloisonnement.spec.ts         étanchéité entre agences
    roles.spec.ts                 gardes de rôle et routes publiques
    inscription.spec.ts           parcours des deux profils, permissions
    missions.spec.ts              la boucle complète, vue par les trois profils
    score.spec.ts                 le barème seul, sans base ni réseau
    matching.spec.ts              classement, écartés motivés, score figé
    mon-profil.spec.ts            ce que le candidat ne peut pas s'accorder
    verification-email.spec.ts    le lien : usage unique, péremption, non-énumération
    disponibilites.spec.ts        chevauchements, travail de nuit
    donnees-publiques.spec.ts     import, médianes, exposition API
    normalisation.spec.ts         salaires et empreintes, sans base ni réseau
    comptes.spec.ts               garde-fous d'administration
    sessions.spec.ts              rotation, rejeu, révocation
    debit.spec.ts                 limitation de débit

frontend/                         Front Nuxt
  server/                         Nitro : le navigateur ne voit jamais l'API
    middleware/session.ts         rafraîchit la session avant tout traitement
    routes/bff/[...chemin].ts     relais authentifié vers l'API
    routes/bff/auth/              connexion, déconnexion, inscription, vérification
    utils/session.ts              cookies httpOnly, rafraîchissement mutualisé
  app/
    assets/
      css/main.css                tokens du Figma : couleurs, rayons, familles
      icons/*.svg                 exports Figma, recolorés par currentColor
    components/                   AppBouton, AppCarte, AppBadge, AppAvatar, AppBarreApp
      AppIcon.vue                 inline les tracés pour qu'ils suivent la couleur
      AppAttenteVerification.vue  « consultez votre boîte mail », partagé par les deux parcours
    utils/mise-en-forme.ts        dates, durées et montants : une seule définition
    layouts/
      default.vue                 coque agence : en-tête, menu selon le rôle
      onboarding.vue              cadre 402 px des écrans issus des maquettes
    composables/
      useSession.ts               identité connectée (aucun jeton côté page)
      useApi.ts                   appel via le relais /bff
    middleware/
      auth.global.ts              tout est fermé sauf liste blanche
    pages/
      bienvenue.vue               splash des maquettes, enchaîne vers /connexion
      connexion.vue
      inscription/                choix du parcours, entreprise, intérimaire
      verification.vue            cible du lien reçu : confirme, puis redirige selon le rôle
      index.vue                   vivier candidats
      candidats/[id].vue          fiche candidat complète
      clients/index.vue           liste des clients
      clients/[id].vue            fiche client et ses lieux
      tension.vue                 baromètre du marché, données France Travail
      missions/                   tableau des missions et fiche, côté intérimaire
      candidature/[id].vue        accusé de réception d'une candidature
      suivi.vue                   mission confirmée, contact et itinéraire
      etablissement/              accueil, dépôt de besoin, profil d'un candidat
      mon-espace.vue              espace des profils externes
      comptes.vue                 administration des accès
      mon-compte.vue              changement de son mot de passe

shared/                           @releve/shared — contrat API ↔ front
  src/
    enums.ts                      énumérations et libellés d'affichage
    motifs.ts                     expressions régulières de saisie
    siret.ts                      validation SIRET (14 chiffres + clé de Luhn)
    auth.ts, utilisateur.ts, inscription.ts
    candidat.ts, disponibilite.ts
    client.ts, lieu.ts, qualification.ts
    mission.ts, proposition.ts    dépôt de besoin, candidature, décision
    matching.ts, profil.ts        score décomposé, espace personnel
    verification.ts               confirmation d'adresse et destination par rôle
    tension.ts                    baromètre et suggestion de taux
    pagination.ts
  test/                           23 tests unitaires des règles partagées

docs/
  analyse-de-marche.html          concurrence, positionnement, proposition de valeur
  questions-a-trancher.md         décisions en attente, par échéance
docker-compose.yml                PostgreSQL + PostGIS, Redis
```

---

## Modèle de données : les trois invariants

Le schéma porte trois décisions structurantes, commentées dans `schema.prisma`.

**1. Un seul candidat, avec un tableau `filieres`.** Beaucoup d'intérimaires du secteur font du
domicile **et** de l'établissement. Dupliquer la fiche ferait diverger les disponibilités — le pire
bug possible ici. Le filtrage se fait donc avec `has` et jamais avec une égalité.

**2. Le client contractuel n'est pas le lieu d'intervention.** Un SAAD signe la mission ;
l'intervention a lieu chez le bénéficiaire. `Client` et `LieuIntervention` sont deux modèles
distincts, et le client n'a pas d'adresse propre.

**3. La convention collective est portée par le client.** Principe d'égalité de traitement avec les
salariés de l'entreprise utilisatrice : c'est sa convention qui fixe le salaire de référence de
l'intérimaire, pas celle du candidat.

### RGPD

Le secteur concentre des données sensibles. La règle de conception est de **ne pas collecter ce
dont la mission n'a pas besoin** :

- le bénéficiaire n'est jamais nommé — `LieuIntervention.beneficiaireRef` est une référence
  pseudonymisée (`BEN-0147`) ;
- les consignes d'un lieu servent à l'accès au logement, pas à décrire une pathologie ;
- l'aptitude du candidat se résume à une date de visite médicale et deux booléens. La plateforme a
  besoin de savoir si quelqu'un est déployable, pas pourquoi. Aucun motif, aucun document médical.

---

## Sécurité

**Fermé par défaut.** `JwtAuthGuard` est enregistrée en garde globale : toute route exige un jeton
valide tant qu'elle n'est pas explicitement marquée `@Public()`. Une route ajoutée sans y penser est
donc protégée, pas ouverte. Les seules routes publiques sont la connexion, les deux inscriptions,
la confirmation d'adresse, le rafraîchissement, la déconnexion et `GET /api/sante`.

**L'adresse e-mail est prouvée avant tout accès.** Une inscription n'ouvre aucune session : elle
envoie un lien, et c'est lui — à usage unique, valable 48 heures, stocké en base sous forme
d'empreinte SHA-256 comme les jetons de session — qui crée l'accès. Sans cela, l'adresse saisie
n'était qu'une chaîne de caractères : rien n'obligeait à la posséder, et on pouvait ouvrir un
compte au nom de quelqu'un d'autre sur une plateforme où cette adresse est à la fois l'identifiant
de connexion et le canal par lequel une mission se décroche.

Le refus de connexion pour adresse non confirmée est renvoyé **après** la vérification du mot de
passe, jamais avant : annoncé plus tôt, il apprendrait à n'importe qui qu'un compte existe pour une
adresse donnée, et ruinerait le soin pris ailleurs à rendre les échecs indiscernables. Pour la même
raison, le renvoi du lien répond toujours 204 — adresse inconnue, déjà confirmée ou réellement
réexpédiée se ressemblent vues du dehors.

Les comptes créés par l'agence, par le seed ou par les fixtures naissent confirmés : la
vérification atteste que _celui qui s'inscrit_ possède l'adresse qu'il déclare, question qui ne se
pose pas quand un administrateur identifié ouvre le compte.

**Cloisonnement multi-agence.** Le décorateur `@AgenceCourante()` extrait l'agence du jeton ; les
services la reçoivent en paramètre obligatoire. Un enregistrement d'une autre agence répond **404 et
non 403** : on ne confirme pas son existence. Les comptes externes (client, candidat) tiennent leur
périmètre de leur rattachement plutôt que d'une colonne `agenceId` dupliquée, qui deviendrait fausse
en silence si un client changeait d'agence.

**Rôles.** `@Roles(...)` filtre par rôle ; sans décorateur, tout compte authentifié passe.
Le back-office (`ADMIN_AGENCE`, `CHARGE_RECRUTEMENT`) voit le vivier et les clients ; seul
`ADMIN_AGENCE` gère les accès ; la lecture du référentiel de qualifications est ouverte à tous les
comptes authentifiés, parce qu'un candidat et un client en ont besoin pour lire une mission.

**Mots de passe.** Argon2id. Douze caractères minimum à la création — longueur plutôt que règles de
complexité, conformément aux recommandations ANSSI/CNIL. Une empreinte leurre est vérifiée quand
l'e-mail est inconnu, pour qu'une réponse instantanée ne révèle pas l'absence de compte. Un compte
désactivé et un mot de passe faux renvoient le même message.

**Session révocable.** Le JWT d'accès dure 15 minutes et n'est pas annulable ; c'est un jeton de
rafraîchissement opaque, stocké sous forme d'empreinte SHA-256, qui porte la session (12 heures par
défaut). Il est à usage unique et tourne à chaque échange. Rejouer un jeton déjà consommé au-delà
d'un sursis de 30 secondes est traité comme un vol : toute la chaîne est révoquée. Le sursis existe
parce qu'un chargement de page lance plusieurs requêtes, et que celle qui arrive juste après la
rotation porte encore l'ancien jeton sans que personne ne l'ait volé.

Désactiver un compte, réinitialiser ou changer un mot de passe révoque toutes ses sessions — y
compris celle qui fait la demande, sans quoi la mesure ne fermerait pas la session d'un voleur.

**Aucun jeton côté navigateur.** Les deux jetons vivent dans des cookies `httpOnly` que seul Nitro
lit ; la page appelle `/bff/**` sur son propre domaine et le relais compose l'en-tête
`Authorization`. Une faille XSS n'a donc rien à voler, et l'API n'a pas besoin d'ouvrir CORS au
navigateur. Le rafraîchissement est mutualisé entre requêtes concurrentes, pour ne pas déclencher la
détection de rejeu décrite plus haut.

**Bourrinage.** Dix tentatives de connexion par minute et par adresse. Au-delà de cinq échecs
consécutifs sur un même compte, la réponse est ralentie de façon exponentielle jusqu'à cinq
secondes, et le compteur s'oublie après quinze minutes sans échec. Délibérément pas un verrouillage :
bloquer un compte donnerait à un attaquant le moyen de fermer l'agence à 6 h 30, et annoncer « compte
verrouillé » trahirait son existence.

**Garde-fous d'administration.** Un administrateur ne peut ni se désactiver, ni changer son propre
rôle ; on refuse de retirer les droits du dernier administrateur actif d'une agence ; le rôle d'un
compte client ou candidat ne se change pas, ce serait une escalade de privilèges déguisée.

---

## Règles métier appliquées

| Règle                                                            | Où                           | Pourquoi                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SIRET : 14 chiffres **et** clé de Luhn                           | `contracts/siret.ts`         | Le SIRET part dans la DPAE et sur la facture ; une coquille se paie en rejet administratif                     |
| Le SIRET n'est pas modifiable                                    | `clientUpdateSchema`         | Un autre SIRET, c'est une autre entité juridique — donc un autre client                                        |
| Pas de suppression de client, seulement `actif: false`           | `clients.service.ts`         | Un client porte des missions, contrats et factures                                                             |
| Disponibilités : aucun chevauchement                             | `contracts/disponibilite.ts` | Deux créneaux qui se recouvrent feraient compter deux fois le même intérimaire au matching                     |
| Un créneau dont la fin précède le début traverse minuit          | idem                         | 20:00–07:00 est une nuit en établissement, pas une faute de frappe                                             |
| Le planning hebdomadaire se remplace en bloc                     | `PUT /disponibilites`        | Le chevauchement se vérifie sur l'ensemble ; une édition ligne à ligne ouvrirait une course entre deux onglets |
| Passer `ACTIF` exige une qualification vérifiée et non expirée   | `candidats.service.ts`       | C'est ce statut qui rend le candidat proposable sur une mission                                                |
| Retirer la dernière qualification vérifiée d'un actif est refusé | idem                         | Mieux vaut refuser que désactiver le candidat dans son dos                                                     |

La règle sur le statut `ACTIF` est une décision d'implémentation, pas une exigence du cahier des
charges : si l'agence veut pouvoir activer sans justificatif, elle se retire en deux lignes dans
`candidats.service.ts`.

---

## API

Base : `http://localhost:3001/api`. Toutes les routes sauf mention contraire exigent
`Authorization: Bearer <jeton>`.

### Authentification

| Méthode | Route                           | Accès                                          |
| ------- | ------------------------------- | ---------------------------------------------- |
| `POST`  | `/auth/connexion`               | public                                         |
| `POST`  | `/auth/inscription/entreprise`  | public — crée le compte et le client           |
| `POST`  | `/auth/inscription/interimaire` | public — crée le compte et le candidat         |
| `POST`  | `/auth/verification/confirmer`  | public — le lien du courriel, ouvre la session |
| `POST`  | `/auth/verification/renvoyer`   | public — toujours 204                          |
| `POST`  | `/auth/rafraichir`              | public — porteur du jeton de session           |
| `POST`  | `/auth/deconnexion`             | public — porteur du jeton de session           |
| `GET`   | `/auth/moi`                     | authentifié                                    |
| `GET`   | `/auth/mon-espace`              | authentifié — vue selon le profil              |
| `POST`  | `/auth/mot-de-passe`            | authentifié — changement par l'intéressé       |
| `GET`   | `/sante`                        | public                                         |

### Candidats

| Méthode  | Route                                                | Accès       |
| -------- | ---------------------------------------------------- | ----------- |
| `GET`    | `/candidats`                                         | back-office |
| `GET`    | `/candidats/:id`                                     | back-office |
| `POST`   | `/candidats`                                         | back-office |
| `PATCH`  | `/candidats/:id`                                     | back-office |
| `POST`   | `/candidats/:id/qualifications`                      | back-office |
| `PATCH`  | `/candidats/:id/qualifications/:qualificationId`     | back-office |
| `DELETE` | `/candidats/:id/qualifications/:qualificationId`     | back-office |
| `PUT`    | `/candidats/:id/disponibilites`                      | back-office |
| `POST`   | `/candidats/:id/indisponibilites`                    | back-office |
| `DELETE` | `/candidats/:id/indisponibilites/:indisponibiliteId` | back-office |

### Clients et lieux

| Méthode | Route                        | Accès       |
| ------- | ---------------------------- | ----------- |
| `GET`   | `/clients`                   | back-office |
| `GET`   | `/clients/:id`               | back-office |
| `POST`  | `/clients`                   | back-office |
| `PATCH` | `/clients/:id`               | back-office |
| `GET`   | `/clients/:id/lieux`         | back-office |
| `POST`  | `/clients/:id/lieux`         | back-office |
| `PATCH` | `/clients/:id/lieux/:lieuId` | back-office |

### Référentiel et comptes

| Méthode | Route                            | Accès          |
| ------- | -------------------------------- | -------------- |
| `GET`   | `/qualifications`                | authentifié    |
| `POST`  | `/qualifications`                | administrateur |
| `GET`   | `/utilisateurs`                  | administrateur |
| `POST`  | `/utilisateurs`                  | administrateur |
| `PATCH` | `/utilisateurs/:id`              | administrateur |
| `POST`  | `/utilisateurs/:id/mot-de-passe` | administrateur |

### Missions

| Méthode | Route                           | Accès                         |
| ------- | ------------------------------- | ----------------------------- |
| `GET`   | `/missions`                     | authentifié — vue par profil  |
| `GET`   | `/missions/resume`              | authentifié — tableau de bord |
| `GET`   | `/missions/options-publication` | back-office ou client         |
| `GET`   | `/missions/:id`                 | authentifié — vue par profil  |
| `POST`  | `/missions`                     | back-office ou client         |
| `PATCH` | `/missions/:id`                 | back-office ou client         |
| `POST`  | `/missions/:id/annuler`         | back-office ou client         |
| `GET`   | `/missions/:id/candidats`       | back-office ou client         |
| `POST`  | `/missions/:id/candidatures`    | candidat                      |

**Ce que chaque profil voit est décidé dans le service, jamais dans le contrôleur.** L'agence voit
son périmètre, le client ses missions, le candidat les missions ouvertes **de son agence** plus
celles où il a postulé. Les consignes d'accès au domicile ne sortent que pour l'agence, le client
et le candidat retenu : quelqu'un qui consulte l'annonce n'a pas à lire le code de la porte.

### Candidatures

| Méthode | Route                       | Accès                              |
| ------- | --------------------------- | ---------------------------------- |
| `GET`   | `/propositions`             | authentifié — vue par profil       |
| `GET`   | `/propositions/courante`    | candidat — prochaine confirmée     |
| `GET`   | `/propositions/:id`         | authentifié — vue par profil       |
| `POST`  | `/propositions/:id/valider` | back-office ou client              |
| `POST`  | `/propositions/:id/refuser` | authentifié — sens selon le profil |

Une candidature déposée par l'intéressé naît `ACCEPTEE_CANDIDAT` : en cliquant, il a déjà dit oui,
seule la décision du client manque. Valider en retient un, écarte les autres et pourvoit la
mission **en une transaction** — sinon deux validations concurrentes laisseraient deux personnes
persuadées d'avoir la mission.

### Mon profil — espace de l'intérimaire

| Méthode  | Route                                   | Accès    |
| -------- | --------------------------------------- | -------- |
| `GET`    | `/mon-profil`                           | candidat |
| `GET`    | `/mon-profil/completude`                | candidat |
| `PATCH`  | `/mon-profil`                           | candidat |
| `PUT`    | `/mon-profil/disponibilites`            | candidat |
| `POST`   | `/mon-profil/diplomes`                  | candidat |
| `DELETE` | `/mon-profil/diplomes/:qualificationId` | candidat |

Routes séparées de `/candidats` plutôt que des gardes assouplies : le back-office garde ses règles
intactes, et ce qu'un candidat peut toucher se lit d'un coup d'œil sur un seul fichier. **Ce qui en
est absent l'est pour une raison** : le `statut` appartient à l'agence — se rendre actif soi-même
viderait la vérification de son sens ; l'adresse e-mail est l'identifiant de connexion ; la visite
médicale et la vaccination sont constatées sur pièce, jamais déclarées. Un diplôme déclaré naît
**non vérifié** et ne rend éligible à rien tant que l'agence ne l'a pas contrôlé.

`/mon-profil/completude` répond à la question que pose tout inscrit — pourquoi aucune mission ne
m'est proposée — en listant les manques dans l'ordre où ils bloquent.

### Tension du marché

| Méthode | Route                 | Accès       |
| ------- | --------------------- | ----------- |
| `GET`   | `/tension`            | authentifié |
| `GET`   | `/tension/suggestion` | authentifié |

`/tension/suggestion` retombe sur la médiane nationale quand le département ne dit rien, et renvoie
`perimetre: 'aucun'` plutôt que d'inventer un taux.

« back-office » = `ADMIN_AGENCE` ou `CHARGE_RECRUTEMENT`.

---

## Scripts

| Commande                                 | Effet                                               |
| ---------------------------------------- | --------------------------------------------------- |
| `pnpm dev`                               | Contracts compilés, puis API et front en parallèle  |
| `pnpm dev:backend` / `pnpm dev:frontend` | Un seul des deux                                    |
| `pnpm build`                             | Contracts, puis API, puis front                     |
| `pnpm test`                              | Contrats (23) puis intégration API (214 tests)      |
| `pnpm test:shared`                       | Règles partagées seules, sans base                  |
| `pnpm test:backend`                      | Intégration API seule                               |
| `pnpm typecheck`                         | TypeScript sur les trois paquets, tests compris     |
| `pnpm lint` / `pnpm format`              | ESLint / Prettier                                   |
| `pnpm infra:up` / `pnpm infra:down`      | Conteneurs PostgreSQL, Redis et Mailpit             |
| `pnpm db:migrate`                        | `prisma migrate dev`                                |
| `pnpm db:seed`                           | Jeu de données de démonstration                     |
| `pnpm db:studio`                         | Prisma Studio                                       |
| `pnpm db:reset`                          | **Détruit** la base locale et rejoue les migrations |

---

## Limites connues

**Le jeton d'accès survit jusqu'à 15 minutes à une révocation.** La session ne peut plus être
prolongée dès qu'elle est coupée, mais le JWT en cours reste accepté jusqu'à son expiration. Le
réduire supposerait une vérification en base à chaque requête — arbitrage entre latence et délai de
coupure, à poser si le contexte l'exige.

**La limitation de débit est en mémoire du processus.** Elle se remet à zéro à chaque redémarrage et
ne se partage pas entre instances. Dès que l'API tournera sur plus d'une instance, il faudra la
faire passer par Redis, déjà présent dans le `docker-compose`.

**La colonne PostGIS `geom` n'est toujours alimentée par rien.** Le matching calcule les distances
par haversine en mémoire, ce qui suffit largement à l'échelle d'un vivier d'agence. `geom` et son
index attendent un volume qui les justifie ; d'ici là, c'est du schéma mort et il faut le dire.

**Les adresses ne sont pas géocodées automatiquement.** Latitude et longitude se saisissent à la
main, et une fiche sans coordonnées est **écartée** du matching — jamais placée à distance nulle,
ce qui la ferait remonter en tête du classement. Brancher un géocodeur sur l'adresse est le
prochain gain évident.

**Aucune notification métier.** Le seul courriel envoyé est celui de confirmation d'adresse : un
candidat retenu ne l'apprend qu'en ouvrant son suivi, un établissement qu'en ouvrant son accueil.
La sortie courriel existe maintenant (`backend/src/mail/`), il reste à y brancher les événements —
c'est ce que les automatisations n8n du jalon suivant doivent couvrir.

**Pas de mot de passe oublié.** `POST /auth/mot-de-passe` exige d'être déjà connecté. Quelqu'un qui
oublie le sien dépend d'un administrateur qui le réinitialise à la main. Le canal courriel et les
jetons à usage unique étant désormais en place, la réinitialisation réutilisera les deux — c'est le
prochain manque à combler, et il est bloquant en production.

**`connexionSchema` accepte 8 caractères** là où la création en exige 12, pour ne pas bloquer un
compte historique.

**Les tests d'intégration partagent une base** et s'exécutent en série. Suffisant à cette échelle,
mais à revoir si la suite s'allonge.

**Le produit s'appelle Relève, le code s'appelle Relève.** Les paquets (`@releve/shared`),
le titre de page dans `nuxt.config.ts` et l'en-tête du back-office portent encore le nom de
travail. Sans conséquence technique, mais visible en soutenance.

**Aucun test ne couvre le front.** Les 140 tests portent sur l'API et les règles partagées ; les
pages Nuxt, les layouts et `AppIcon` ne sont vérifiés que par le typecheck et le lint.

**La couverture n'est pas mesurée.** `vitest run --coverage` n'est câblé nulle part, alors que le
rapport de couverture est un livrable attendu.

### Piège de développement

Nuxt pré-charge `@releve/shared` au démarrage. Après toute modification du paquet partagé,
**redémarrer le serveur Nuxt** : sinon une page tombe en 500 sur le symbole nouvellement ajouté.

Le cas le plus vicieux — `doesn't provide an export named` sur un symbole pourtant bien exporté —
vient de l'interop CommonJS de Vite sur un paquet lié par le workspace. Il est désormais réglé à
la source par `vite.optimizeDeps.include` dans `nuxt.config.ts`, qui force le pré-bundling. Si un
symptôme proche réapparaît, supprimer `frontend/node_modules/.vite` puis relancer.

---

## Questions métier en attente

Le socle est livré et testé. Restent des questions métier, pas du code :

Elles sont détaillées dans [`docs/questions-a-trancher.md`](docs/questions-a-trancher.md), prêtes à
être envoyées : chaque question y indique ce qu'elle bloque et à partir de quand. **Le format
d'export attendu par le logiciel de paie est la plus urgente** — il conditionne une partie du
modèle, et une réponse tardive se paie en reprise de données.

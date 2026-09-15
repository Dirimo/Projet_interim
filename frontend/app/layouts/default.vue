<script setup lang="ts">
import { ROLE_LIBELLES, ROLES_AGENCE, type RoleUtilisateur } from '@releve/shared';

const { utilisateur, deconnexion } = useSession();

/**
 * Le menu suit le profil : le back-office et les deux espaces externes n'ont
 * aucune page en commun, sauf « Mon compte ».
 */
const interne = computed(
  () =>
    !!utilisateur.value &&
    (ROLES_AGENCE as readonly RoleUtilisateur[]).includes(utilisateur.value.role),
);

/**
 * Le canvas pose la navigation de l'espace connecte dans une barre laterale,
 * une entree par ligne. Les destinations restent celles du middleware : un lien
 * vers une section interdite se ferait renvoyer sur l'accueil du profil.
 */
const liens = computed<{ to: string; label: string }[]>(() => {
  const compte = { to: '/mon-compte', label: 'Mon compte' };

  if (!utilisateur.value) {
    return [];
  }

  if (interne.value) {
    return [
      { to: '/', label: 'Vivier' },
      { to: '/clients', label: 'Clients' },
      { to: '/tension', label: 'Tension' },
      ...(utilisateur.value.role === 'ADMIN_AGENCE' ? [{ to: '/comptes', label: 'Comptes' }] : []),
      compte,
    ];
  }

  if (utilisateur.value.role === 'CANDIDAT') {
    return [
      { to: '/tableau-de-bord', label: 'Tableau de bord' },
      { to: '/missions', label: 'Missions' },
      { to: '/suivi', label: 'Suivi' },
      { to: '/mon-profil', label: 'Mon profil' },
      { to: '/mon-espace', label: 'Mon espace' },
      compte,
    ];
  }

  return [
    { to: '/etablissement', label: 'Accueil' },
    { to: '/etablissement/publier', label: 'Publier' },
    { to: '/mon-espace', label: 'Mon espace' },
    compte,
  ];
});

/**
 * Navigation publique du canvas. Son entree « Missions » n'est pas reprise :
 * `GET /missions` exige une session, il n'existe donc pas de liste publique a
 * ouvrir. C'est « Comment ça marche » qui tient la place.
 */
const liensVitrine = [
  { to: '/accueil', label: 'Accueil' },
  { to: '/fonctionnement', label: 'Comment ça marche' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

/**
 * Les trois colonnes du pied de page du canvas. « Conditions d'utilisation » et
 * « Politique de confidentialite » n'y figurent pas : ces deux textes n'existent
 * pas encore, et un lien vers une page absente vaut moins qu'une ligne en moins.
 * Les mentions legales, elles, ont leur page.
 */
const colonnesPied = [
  {
    titre: 'Candidats',
    liens: [
      { to: '/fonctionnement', label: 'Comment ça marche' },
      { to: '/inscription', label: 'Créer un compte' },
      { to: '/connexion', label: 'Se connecter' },
    ],
  },
  {
    titre: 'Agence',
    liens: [
      { to: '/a-propos', label: 'À propos' },
      { to: '/contact', label: 'Contact' },
      { to: '/faq', label: 'FAQ' },
    ],
  },
  {
    titre: 'Légal',
    liens: [{ to: '/mentions-legales', label: 'Mentions légales' }],
  },
];

const annee = new Date().getFullYear();

async function sortir(): Promise<void> {
  // La deconnexion revoque la session cote API : on attend qu'elle aboutisse
  // avant de quitter la page, sinon la session survivrait au clic.
  await deconnexion();
  await navigateTo('/connexion');
}
</script>

<template>
  <!-- Coque publique du canvas : en-tete collant, contenu, pied de page. -->
  <div v-if="!utilisateur" class="site">
    <header class="entete">
      <div class="dedans">
        <NuxtLink to="/accueil" class="marque">
          <AppLogo :taille="30" />
          <span>Relève</span>
        </NuxtLink>

        <nav class="menu">
          <NuxtLink v-for="lien in liensVitrine" :key="lien.to" :to="lien.to">
            {{ lien.label }}
          </NuxtLink>
        </nav>

        <div class="acces">
          <NuxtLink to="/connexion" class="lien-bouton secondaire">Se connecter</NuxtLink>
          <NuxtLink to="/inscription" class="lien-bouton primaire">S'inscrire</NuxtLink>
        </div>
      </div>
    </header>

    <main class="contenu">
      <slot />
    </main>

    <footer class="pied">
      <div class="dedans colonnes">
        <div>
          <NuxtLink to="/accueil" class="marque marque-pied">
            <AppLogo :taille="26" />
            <span>Relève</span>
          </NuxtLink>
          <p class="accroche">Le soin, sans attendre</p>
          <p class="baseline">Agence d'intérim spécialisée dans l'aide à domicile.</p>
        </div>

        <div v-for="colonne in colonnesPied" :key="colonne.titre">
          <p class="titre-colonne">{{ colonne.titre }}</p>
          <ul>
            <li v-for="lien in colonne.liens" :key="lien.to">
              <NuxtLink :to="lien.to">{{ lien.label }}</NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="mentions">
        <div class="dedans">© {{ annee }} Relève</div>
      </div>
    </footer>
  </div>

  <!-- Coque de l'espace connecte : barre laterale et colonne de contenu. -->
  <div v-else class="espace">
    <aside class="laterale">
      <NuxtLink :to="liens[0]?.to ?? '/'" class="marque">
        <AppLogo :taille="28" />
        <span>Relève</span>
      </NuxtLink>

      <nav>
        <NuxtLink v-for="lien in liens" :key="lien.to" :to="lien.to">{{ lien.label }}</NuxtLink>
      </nav>

      <div class="session">
        <p class="compte">{{ utilisateur.email }}</p>
        <p class="role">{{ ROLE_LIBELLES[utilisateur.role] }}</p>
        <button type="button" class="sortir" @click="sortir()">Se déconnecter</button>
      </div>
    </aside>

    <main class="contenu-app">
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* ---------- Coque publique ---------- */

.site {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.dedans {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: 28px;
}

.entete {
  position: sticky;
  top: 0;
  z-index: 20;
  /* Le canvas laisse transparaitre le fond sous l'en-tete ; color-mix garde le
   * procede quand --ground change avec le theme. */
  background: color-mix(in srgb, var(--ground) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.entete .dedans {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: center;
  justify-content: space-between;
  padding-block: 16px;
}

.marque {
  display: flex;
  flex: none;
  gap: 10px;
  align-items: center;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
}

/* Navigation publique : le canvas l'etale entre la marque et les deux boutons,
 * et la laisse passer a la ligne plutot que de la comprimer. */
.menu {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px 2px;
  align-items: center;
}

.menu a {
  padding: 8px 12px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
  text-decoration: none;
  border-radius: 9px;
}

.menu a:hover {
  color: var(--dom-fonce);
  background: var(--surface-2);
}

.menu a.router-link-active {
  font-weight: 700;
  color: var(--dom-fonce);
  background: var(--surface-2);
}

.menu a:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.acces {
  display: flex;
  gap: 10px;
}

.lien-bouton {
  padding: 10px 16px;
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 11px;
}

.lien-bouton.secondaire {
  color: var(--dom-fonce);
  background: var(--surface);
  border-color: var(--line-forte);
}

.lien-bouton.secondaire:hover {
  border-color: var(--dom);
}

.lien-bouton.primaire {
  padding-inline: 18px;
  color: var(--surface);
  background: var(--dom);
}

.lien-bouton.primaire:hover {
  background: var(--dom-fonce);
}

.lien-bouton:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

/* Ni largeur ni gouttiere ici : l'accueil vitrine a besoin de bandes pleine
 * largeur, et chaque page publique pose sa propre colonne. */
.contenu {
  flex: 1;
  width: 100%;
}

.pied {
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.colonnes {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) repeat(auto-fit, minmax(160px, 1fr));
  gap: 32px;
  padding-block: 48px;
}

.marque-pied {
  margin-bottom: 14px;
  font-size: 18px;
}

.accroche {
  margin: 0 0 10px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--eta);
}

.baseline {
  max-width: 36ch;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

.titre-colonne {
  margin: 0 0 14px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.colonnes ul {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.colonnes a {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.colonnes a:hover {
  color: var(--dom);
}

.mentions {
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--muted);
}

.mentions .dedans {
  padding-block: 18px;
}

/* ---------- Coque de l'espace connecte ---------- */

.espace {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100vh;
}

.laterale {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 22px 18px;
  background: var(--surface);
  border-right: 1px solid var(--line);
}

.laterale .marque {
  padding-inline: 6px;
  font-size: 19px;
}

.laterale nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.laterale nav a {
  padding: 12px 14px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--muted);
  text-decoration: none;
  border-radius: 11px;
}

.laterale nav a:hover {
  color: var(--dom-fonce);
  background: var(--surface-2);
}

.laterale nav a.router-link-exact-active {
  font-weight: 700;
  color: var(--dom-fonce);
  background: var(--surface-2);
}

.session {
  margin-top: auto;
  padding-inline: 6px;
}

.compte {
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
}

.role {
  margin: 2px 0 12px;
  font-size: 12.5px;
  color: var(--muted);
}

.sortir {
  padding: 0;
  font-family: var(--sans);
  font-size: 13.5px;
  color: var(--muted);
  background: none;
  border: 0;
  cursor: pointer;
}

.sortir:hover {
  color: var(--dom);
}

.sortir:focus-visible,
.laterale a:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.contenu-app {
  max-width: 1180px;
  padding: 34px 40px 70px;
}

/* Le canvas ne dessine que le poste de travail : sous 900 px la barre laterale
 * repasse en bandeau horizontal, seule facon de garder le contenu lisible. */
@media (max-width: 900px) {
  .espace {
    grid-template-columns: minmax(0, 1fr);
  }

  .laterale {
    flex-wrap: wrap;
    flex-direction: row;
    gap: 12px 20px;
    align-items: center;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .laterale nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .session {
    display: flex;
    gap: 12px;
    align-items: baseline;
    margin-top: 0;
    margin-left: auto;
  }

  .role {
    margin: 0;
  }

  .contenu-app {
    padding: 24px 20px 56px;
  }
}

@media (max-width: 560px) {
  .dedans {
    padding-inline: 20px;
  }
}
</style>

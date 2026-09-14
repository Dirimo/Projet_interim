import { ROLES_AGENCE, type RoleUtilisateur } from '@releve/shared';

/**
 * Tout est ferme par defaut. Une page ouverte se declare explicitement dans
 * PAGES_OUVERTES : c'est le sens le moins dangereux, un ecran ajoute sans y
 * penser reste protege.
 */
const PAGES_OUVERTES = new Set([
  '/bienvenue',
  '/connexion',
  '/inscription',
  '/inscription/entreprise',
  '/inscription/interimaire',
]);

/**
 * Pages communes aux deux profils externes : leur fiche et leur mot de passe.
 * Le reste du site est le back-office de l'agence, et l'API le refuserait de
 * toute facon — autant ne pas afficher un ecran qui se videra.
 */
const PAGES_EXTERNES = new Set(['/mon-espace', '/mon-compte']);

/**
 * Sections propres a chaque profil externe, issues des ecrans Figma. Elles sont
 * declarees en prefixes parce que plusieurs portent un identifiant
 * (`/missions/:id`, `/etablissement/candidats/:id`), qu'un Set d'egalites ne
 * saurait pas couvrir.
 */
const SECTIONS_PAR_ROLE: Partial<Record<RoleUtilisateur, readonly string[]>> = {
  CANDIDAT: ['/missions', '/suivi', '/candidature'],
  CLIENT: ['/etablissement'],
};

/** Page d'atterrissage apres connexion, par profil externe. */
const ACCUEILS_EXTERNES: Partial<Record<RoleUtilisateur, string>> = {
  CANDIDAT: '/missions',
  CLIENT: '/etablissement',
};

function estInterne(role: RoleUtilisateur): boolean {
  return (ROLES_AGENCE as readonly RoleUtilisateur[]).includes(role);
}

function sectionAutorisee(role: RoleUtilisateur, chemin: string): boolean {
  return (SECTIONS_PAR_ROLE[role] ?? []).some(
    (prefixe) => chemin === prefixe || chemin.startsWith(`${prefixe}/`),
  );
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { utilisateur, rafraichir } = useSession();
  const ouverte = PAGES_OUVERTES.has(to.path);

  // Les jetons sont httpOnly : le middleware ne peut pas les lire. C'est donc
  // l'API qui tranche, via /auth/moi, et le resultat reste en memoire pour les
  // navigations suivantes.
  if (!utilisateur.value) {
    await rafraichir();
  }

  if (!utilisateur.value) {
    return ouverte ? undefined : navigateTo('/connexion');
  }

  const role = utilisateur.value.role;
  const interne = estInterne(role);
  const accueil = interne ? '/' : (ACCUEILS_EXTERNES[role] ?? '/mon-espace');

  if (ouverte) {
    return navigateTo(accueil);
  }

  if (!interne && !PAGES_EXTERNES.has(to.path) && !sectionAutorisee(role, to.path)) {
    return navigateTo(accueil);
  }
});

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

async function sortir(): Promise<void> {
  // La deconnexion revoque la session cote API : on attend qu'elle aboutisse
  // avant de quitter la page, sinon la session survivrait au clic.
  await deconnexion();
  await navigateTo('/connexion');
}
</script>

<template>
  <div class="coque">
    <header class="entete">
      <p class="marque">Relève</p>
      <p class="sous-titre">
        Interim aide a domicile
        <template v-if="utilisateur"
          >&middot; {{ interne ? 'back-office agence' : 'mon espace' }}</template
        >
      </p>

      <div v-if="utilisateur" class="session">
        <span class="compte">
          {{ utilisateur.email }} &middot; {{ ROLE_LIBELLES[utilisateur.role] }}
        </span>
        <button type="button" class="sortir" @click="sortir()">Se deconnecter</button>
      </div>
      <nav v-if="utilisateur" class="menu">
        <template v-if="interne">
          <NuxtLink to="/">Vivier</NuxtLink>
          <NuxtLink to="/clients">Clients</NuxtLink>
          <NuxtLink to="/tension">Tension</NuxtLink>
          <NuxtLink v-if="utilisateur.role === 'ADMIN_AGENCE'" to="/comptes">Comptes</NuxtLink>
        </template>
        <template v-else>
          <!-- Les ecrans issus du Figma sont propres a chaque profil externe :
               le soignant cherche des missions, l'etablissement en publie. -->
          <template v-if="utilisateur.role === 'CANDIDAT'">
            <NuxtLink to="/missions">Missions</NuxtLink>
            <NuxtLink to="/suivi">Suivi</NuxtLink>
          </template>
          <template v-else-if="utilisateur.role === 'CLIENT'">
            <NuxtLink to="/etablissement">Accueil</NuxtLink>
            <NuxtLink to="/etablissement/publier">Publier</NuxtLink>
          </template>
          <NuxtLink to="/mon-espace">Mon espace</NuxtLink>
        </template>
        <NuxtLink to="/mon-compte">Mon compte</NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.coque {
  max-width: 1040px;
  margin: 0 auto;
  padding-inline: 20px;
  padding-block: 0 64px;
}

.entete {
  padding-block: 28px 22px;
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
}

.marque {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sous-titre {
  margin: 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

.menu {
  flex-basis: 100%;
  display: flex;
  gap: 18px;
  padding-top: 6px;
}

.menu a {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
  padding-bottom: 3px;
  border-bottom: 2px solid transparent;
}

.menu a:hover {
  color: var(--ink);
}

.menu a.router-link-exact-active {
  color: var(--dom);
  border-bottom-color: var(--dom);
}

.session {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.compte {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
}

.sortir {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.sortir:hover {
  border-color: var(--dom);
  color: var(--dom);
}
</style>

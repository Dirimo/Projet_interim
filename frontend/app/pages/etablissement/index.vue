<script setup lang="ts">
import {
  CANDIDATS,
  ETABLISSEMENT_CONNECTE,
  MISSION_DU_SOIR,
  STATISTIQUES,
} from '~/data/missions-demo';

useHead({ title: 'Accueil etablissement - Passerelle' });

/** La maquette relie la mission du soir a ses candidats sans preciser lequel :
 *  on ouvre le premier profil du vivier de demonstration. */
const premierCandidat = computed(() => CANDIDATS[0]);
</script>

<template>
  <section class="accueil">
    <header class="tete">
      <div>
        <p class="bonjour">Bonjour {{ ETABLISSEMENT_CONNECTE.contact }}</p>
        <h1>{{ ETABLISSEMENT_CONNECTE.nom }}</h1>
        <p class="mention">{{ ETABLISSEMENT_CONNECTE.mention }}</p>
      </div>
      <!-- Aucun centre de notifications dans le projet : la cloche du design
           reste visible mais inactive. -->
      <button type="button" class="cloche" disabled aria-label="Notifications a venir">
        <AppIcon nom="bell" :taille="20" />
      </button>
    </header>

    <AppCarte variante="pleine" class="urgence">
      <AppBadge teinte="corail">Besoin urgent</AppBadge>
      <p class="titre-urgence">Un remplacement a organiser rapidement ?</p>
      <p class="texte-urgence">
        Publiez une mission en quelques etapes et recevez des profils disponibles.
      </p>
      <AppBouton icone="plus" to="/etablissement/publier">Publier une mission</AppBouton>
    </AppCarte>

    <section class="apercu">
      <h2>Vue d'ensemble</h2>
      <ul class="statistiques">
        <li
          v-for="statistique in STATISTIQUES"
          :key="statistique.libelle"
          :class="statistique.teinte"
        >
          <p class="valeur">{{ statistique.valeur }}</p>
          <p class="libelle">{{ statistique.libelle }}</p>
        </li>
      </ul>
    </section>

    <NuxtLink
      v-if="premierCandidat"
      :to="`/etablissement/candidats/${premierCandidat.id}`"
      class="lien-mission"
    >
      <AppCarte class="recente">
        <div class="entete-recente">
          <p class="titre-recente">{{ MISSION_DU_SOIR.titre }}</p>
          <AppBadge teinte="vert">{{ MISSION_DU_SOIR.candidats }} candidats</AppBadge>
        </div>
        <p class="poste">{{ MISSION_DU_SOIR.poste }}</p>
        <p class="lieu">{{ MISSION_DU_SOIR.lieu }}</p>
      </AppCarte>
    </NuxtLink>
  </section>
</template>

<style scoped>
.accueil {
  max-width: 720px;
  padding-block: 28px 0;
}

.tete {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.bonjour {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--muted);
}

h1 {
  margin: 0 0 4px;
  font-size: 23px;
  font-weight: 400;
}

.mention {
  margin: 0;
  font-size: 10px;
  color: var(--muted);
}

.cloche {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--ink);
  background: var(--surface);
  border: 0;
  border-radius: 999px;
  opacity: 0.5;
  cursor: not-allowed;
}

.urgence {
  display: grid;
  justify-items: start;
  gap: 14px;
}

.titre-urgence {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.texte-urgence {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--dom-contraste);
}

/* Le bouton de cette carte est vert sur vert sombre : c'est le seul endroit du
 * design ou la variante primaire n'est pas posee sur le fond clair. */
.urgence :deep(.bouton) {
  max-width: 340px;
}

.apercu {
  margin-top: 24px;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
}

.statistiques {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statistiques li {
  padding: 14px;
  border-radius: var(--r-carte);
}

.statistiques .vert {
  background: var(--dom-soft);
}

.statistiques .lavande {
  background: var(--lavande);
}

.statistiques .corail {
  background: var(--eta-soft);
}

.valeur {
  margin: 0 0 5px;
  font-size: 24px;
}

.libelle {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.lien-mission {
  display: block;
  margin-top: 24px;
  color: inherit;
  text-decoration: none;
}

.lien-mission:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 3px;
  border-radius: var(--r-carte);
}

.recente {
  display: grid;
  gap: 12px;
}

.entete-recente {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.titre-recente {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.poste {
  margin: 0;
  font-size: 14px;
}

.lieu {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
</style>

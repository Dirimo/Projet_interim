<script setup lang="ts">
import { FILTRES, MISSIONS } from '~/data/missions-demo';

useHead({ title: 'Missions disponibles - Passerelle' });

const recherche = ref('');
const filtre = ref<string>(FILTRES[0] ?? '');

/**
 * La maquette montre une barre de recherche et trois filtres sans dire ce
 * qu'ils font. Plutot que des controles inertes, ils operent sur le jeu de
 * donnees local : le jour ou la liste viendra de l'API, ces deux refs
 * deviendront des parametres de requete.
 */
const missions = computed(() => {
  const terme = recherche.value.trim().toLowerCase();

  const filtrees = MISSIONS.filter((mission) => {
    const correspond =
      terme === '' ||
      mission.etablissement.nom.toLowerCase().includes(terme) ||
      mission.etablissement.localisation.toLowerCase().includes(terme);

    return correspond && (filtre.value !== "Aujourd'hui" || mission.jour === "Aujourd'hui");
  });

  if (filtre.value === 'Mieux remunerees') {
    return [...filtrees].sort((a, b) => tauxNumerique(b) - tauxNumerique(a));
  }

  return filtrees;
});

/** « 18,50 EUR/h » -> 18.5, pour trier sans stocker le montant deux fois. */
function tauxNumerique(mission: (typeof MISSIONS)[number]): number {
  return Number.parseFloat(mission.tauxHoraire.replace(',', '.'));
}
</script>

<template>
  <section class="missions">
    <header class="entete">
      <div class="salutation">
        <p class="bonjour">Bonjour Camille</p>
        <h1>Trouvez votre mission</h1>
      </div>
      <AppAvatar initiales="CM" teinte="lavande" />
    </header>

    <div class="recherche">
      <AppIcon nom="search" :taille="18" />
      <label class="sr-only" for="recherche">Rechercher une mission</label>
      <input
        id="recherche"
        v-model="recherche"
        type="search"
        placeholder="Ville, etablissement ou date"
      />
      <AppIcon nom="sliders" :taille="18" />
    </div>

    <div class="filtres">
      <button
        v-for="option in FILTRES"
        :key="option"
        type="button"
        class="filtre"
        :aria-pressed="filtre === option"
        @click="filtre = option"
      >
        <AppBadge :teinte="filtre === option ? 'vert' : 'neutre'">{{ option }}</AppBadge>
      </button>
    </div>

    <h2 class="titre-liste">
      {{ missions.length }} {{ missions.length > 1 ? 'missions' : 'mission' }} pres de vous
    </h2>

    <p v-if="missions.length === 0" class="vide">Aucune mission ne correspond a cette recherche.</p>

    <ul v-else class="liste">
      <li v-for="mission in missions" :key="mission.id">
        <NuxtLink :to="`/missions/${mission.id}`" class="lien">
          <AppCarte variante="posee" class="carte">
            <div class="resume">
              <AppAvatar :initiales="mission.etablissement.initiales" />
              <div class="copie">
                <p class="nom">{{ mission.etablissement.nom }}</p>
                <p class="lieu">{{ mission.etablissement.localisation }}</p>
              </div>
              <AppBadge v-if="mission.urgente" teinte="corail">Urgent</AppBadge>
            </div>

            <div class="details">
              <AppBadge teinte="vert">{{ mission.jour }}</AppBadge>
              <AppBadge>{{ mission.horaires }}</AppBadge>
            </div>

            <div class="pied">
              <p class="taux">{{ mission.tauxHoraire }}</p>
              <span class="ouvrir"><AppIcon nom="arrow-right" :taille="16" /></span>
            </div>
          </AppCarte>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.missions {
  padding-block: 28px 0;
}

.entete {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.bonjour {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--muted);
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 400;
}

.recherche {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 48px;
  max-width: 560px;
  padding-inline: 14px;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-carte);
}

.recherche input {
  flex: 1;
  min-width: 0;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--ink);
  background: none;
  border: 0;
}

.recherche input::placeholder {
  color: var(--muted);
}

.recherche input:focus-visible {
  outline: none;
}

.recherche:focus-within {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.filtre {
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
}

.filtre:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 3px;
  border-radius: 999px;
}

.titre-liste {
  margin: 22px 0 12px;
  font-size: 16px;
  font-weight: 700;
}

.vide {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

/* Le Figma empile les cartes ; sur le web elles se rangent en grille des que
 * la largeur le permet. */
.liste {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lien {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.lien:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 3px;
  border-radius: var(--r-carte);
}

.carte {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.resume {
  display: flex;
  gap: 10px;
  align-items: center;
}

.copie {
  flex: 1;
  min-width: 0;
}

.nom {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 700;
}

.lieu {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.taux {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--dom-fonce);
}

.ouvrir {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--dom-fonce);
  background: var(--dom-soft);
  border-radius: 999px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>

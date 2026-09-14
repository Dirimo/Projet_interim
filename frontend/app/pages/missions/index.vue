<script setup lang="ts">
import type { MissionResume, PageResultat } from '@releve/shared';

useHead({ title: 'Missions disponibles - Relève' });

const { requete } = useApi();
const { utilisateur } = useSession();

/**
 * Les trois filtres de la maquette, traduits en intentions reelles.
 *
 * « A proximite » trie desormais par distance reelle entre le domicile du
 * candidat et le lieu d'intervention. Les missions dont la distance n'est pas
 * mesurable passent en fin de liste plutot qu'en tete : une distance inconnue
 * n'est pas une distance nulle.
 */
const FILTRES = ['A proximite', "Aujourd'hui", 'Mieux remunerees'] as const;

const recherche = ref('');
const filtre = ref<(typeof FILTRES)[number]>(FILTRES[0]);

/**
 * La recherche part a l'API, pas au tableau : le vivier peut etre long. On
 * attend 300 ms de silence avant d'interroger, sinon chaque frappe declenche un
 * appel et les reponses arrivent dans le desordre.
 */
const terme = ref('');
let minuterie: ReturnType<typeof setTimeout> | undefined;

watch(recherche, (valeur) => {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    terme.value = valeur.trim();
  }, 300);
});

onBeforeUnmount(() => clearTimeout(minuterie));

const { data, error } = await useAsyncData(
  'missions-disponibles',
  () =>
    requete<PageResultat<MissionResume>>('/missions', {
      query: {
        statut: 'PUBLIEE',
        limite: 50,
        ...(terme.value ? { recherche: terme.value } : {}),
        ...(filtre.value === "Aujourd'hui"
          ? { depuis: jourIso(new Date()), jusqua: jourIso(new Date()) }
          : {}),
      },
    }),
  { watch: [terme, filtre] },
);

function jourIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Adaptation vers ce que la carte du Figma affiche.
 *
 * « Urgent » n'est pas un champ : c'est une mission qui commence aujourd'hui ou
 * demain. Le calculer ici evite d'ajouter une colonne qui dirait la meme chose
 * que la date, et qui finirait fausse le lendemain.
 */
const missions = computed(() => {
  const cartes = (data.value?.donnees ?? []).map((mission) => ({
    id: mission.id,
    etablissement: {
      nom: mission.client.raisonSociale,
      initiales: initiales(mission.client.raisonSociale),
      localisation: `${mission.lieu.libelle} · ${mission.lieu.ville}`,
    },
    urgente: ["Aujourd'hui", 'Demain'].includes(jourCourt(mission.dateDebut)),
    jour: jourCourt(mission.dateDebut),
    horaires: horaires(mission.heureDebut, mission.heureFin),
    tauxHoraire: tauxCourt(mission.tauxHoraire),
    taux: mission.tauxHoraire ?? 0,
    distance: mission.distanceKm,
  }));

  if (filtre.value === 'Mieux remunerees') {
    return [...cartes].sort((a, b) => b.taux - a.taux);
  }

  if (filtre.value === 'A proximite') {
    return [...cartes].sort(
      (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY),
    );
  }

  return cartes;
});

const prenom = computed(() => prenomAffiche(utilisateur.value?.email));
</script>

<template>
  <section class="missions">
    <header class="entete">
      <div class="salutation">
        <p class="bonjour">Bonjour {{ prenom }}</p>
        <h1>Trouvez votre mission</h1>
      </div>
      <AppAvatar :initiales="initiales(prenom)" teinte="lavande" />
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

    <p v-if="error" class="vide">
      Missions indisponibles pour le moment. Reessayer dans un instant.
    </p>

    <p v-else-if="missions.length === 0" class="vide">
      Aucune mission ne correspond a cette recherche.
    </p>

    <ul v-else class="liste">
      <li v-for="mission in missions" :key="mission.id">
        <NuxtLink :to="`/missions/${mission.id}`" class="lien">
          <AppCarte variante="posee" class="carte">
            <div class="resume">
              <AppAvatar :initiales="mission.etablissement.initiales" />
              <div class="copie">
                <p class="nom">{{ mission.etablissement.nom }}</p>
                <p class="lieu">
                  {{ mission.etablissement.localisation }}
                  <template v-if="mission.distance !== null">
                    &middot; {{ mission.distance }} km
                  </template>
                </p>
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

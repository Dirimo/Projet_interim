<script setup lang="ts">
import {
  MENTION_SOURCE_FRANCE_TRAVAIL,
  type OffrePubliqueResume,
  type PageResultat,
  type TriOffres,
} from '@releve/shared';

/**
 * Le marché de l'intérim : les offres publiques republiées depuis France
 * Travail.
 *
 * Page volontairement distincte de `/missions`. Ces annonces appartiennent à
 * d'autres employeurs — souvent des agences concurrentes — et la candidature se
 * fait chez la source : Relève ne la reçoit pas. Les mélanger aux missions de
 * l'agence ferait croire à un candidat qu'il postule ici, et il attendrait une
 * réponse qui ne viendrait jamais.
 *
 * Trois éléments sont obligatoires au titre de la licence de réutilisation de
 * la base d'offres France Travail, pas décoratifs : la mention de la source, le
 * lien vers l'annonce d'origine, et la date de dernière actualisation.
 */

useHead({
  title: "Le marché de l'intérim — Relève",
  meta: [
    {
      name: 'description',
      content:
        "Les offres d'intérim du secteur de l'aide à la personne publiées sur France Travail, mises à jour deux fois par jour.",
    },
  ],
});

const { requete } = useApi();

const recherche = ref('');
const departement = ref('');
const tri = ref<TriOffres>('RECENTES');
const page = ref(1);

const { data, pending, error, refresh } = await useAsyncData(
  'offres-publiques',
  () =>
    requete<PageResultat<OffrePubliqueResume>>('/offres', {
      query: {
        page: page.value,
        limite: 20,
        tri: tri.value,
        ...(recherche.value.trim().length >= 2 ? { recherche: recherche.value.trim() } : {}),
        ...(departement.value.trim() ? { departement: departement.value.trim() } : {}),
      },
    }),
  { watch: [page, tri] },
);

const offres = computed(() => data.value?.donnees ?? []);
const total = computed(() => data.value?.total ?? 0);
const pages = computed(() => Math.max(1, Math.ceil(total.value / (data.value?.limite || 20))));

/** Un changement de filtre doit repartir de la première page, sinon la liste
 * s'ouvre sur une page qui n'existe plus dans le nouveau résultat. */
function filtrer() {
  page.value = 1;
  refresh();
}

function allerA(cible: number) {
  page.value = Math.min(pages.value, Math.max(1, cible));
}

/**
 * Sur ce secteur, trois offres sur quatre n'annoncent aucune rémunération. Le
 * dire franchement vaut mieux qu'un tiret muet que le visiteur lirait comme un
 * bug.
 */
function salaire(offre: OffrePubliqueResume): string {
  return offre.salaireLibelle ?? 'Rémunération non précisée';
}

function lieu(offre: OffrePubliqueResume): string {
  if (offre.communeNom) {
    return offre.departement ? `${offre.communeNom} (${offre.departement})` : offre.communeNom;
  }

  return offre.departement ? `Département ${offre.departement}` : 'France entière';
}

const dateCourte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

function publiee(iso: string): string {
  return dateCourte.format(new Date(iso));
}
</script>

<template>
  <main class="vitrine offres">
    <p class="vitrine-accroche">Le marché</p>
    <h1 class="vitrine-titre">Les offres d'intérim du secteur</h1>
    <p class="vitrine-chapeau">
      Les missions d'intérim de l'aide à la personne publiées sur France Travail, partout en France.
      Ces offres ne sont pas celles de Relève : la candidature se fait chez France Travail.
      <NuxtLink to="/fonctionnement">Voir comment postuler avec Relève</NuxtLink>.
    </p>

    <form class="filtres" @submit.prevent="filtrer()">
      <label>
        <span>Métier ou employeur</span>
        <input v-model="recherche" type="search" placeholder="aide-soignant, auxiliaire de vie…" />
      </label>

      <label>
        <span>Département</span>
        <input
          v-model="departement"
          type="text"
          inputmode="numeric"
          placeholder="44"
          maxlength="3"
        />
      </label>

      <label>
        <span>Trier par</span>
        <select v-model="tri">
          <option value="RECENTES">Les plus récentes</option>
          <option value="TAUX_DECROISSANT">Rémunération décroissante</option>
        </select>
      </label>

      <button type="submit">Filtrer</button>
    </form>

    <p v-if="error" class="alerte">
      Les offres sont momentanément indisponibles. Réessayer dans un instant.
    </p>

    <p v-else-if="pending" class="vide">Chargement des offres…</p>

    <p v-else-if="!offres.length" class="vide">
      Aucune offre ne correspond à cette recherche. Élargir le département ou effacer les filtres.
    </p>

    <template v-else>
      <p class="compte">
        <strong>{{ total }}</strong> offre{{ total > 1 ? 's' : '' }} en ligne
      </p>

      <ul class="liste">
        <li v-for="offre in offres" :key="offre.id" class="offre">
          <NuxtLink :to="`/offres/${offre.id}`" class="lien">
            <h2>{{ offre.intitule }}</h2>
          </NuxtLink>

          <p class="employeur">
            {{ offre.entreprise ?? 'Employeur non précisé' }} &middot; {{ lieu(offre) }}
          </p>

          <ul class="attributs">
            <li v-if="offre.typeContratLibelle">{{ offre.typeContratLibelle }}</li>
            <li v-if="offre.dureeTravailLibelle" class="duree">
              {{ offre.dureeTravailLibelle.split('\n')[0] }}
            </li>
            <li v-if="offre.experienceExigee">Expérience exigée</li>
            <li v-if="offre.nombrePostes > 1">{{ offre.nombrePostes }} postes</li>
          </ul>

          <p class="salaire" :class="{ absent: !offre.salaireLibelle }">{{ salaire(offre) }}</p>

          <p class="meta">
            Publiée le {{ publiee(offre.publieeLe) }}
            <span v-if="offre.actualiseeLe">
              &middot; actualisée le {{ publiee(offre.actualiseeLe) }}
            </span>
            &middot; <span class="source">France Travail</span>
          </p>
        </li>
      </ul>

      <nav v-if="pages > 1" class="pagination" aria-label="Pages d'offres">
        <button type="button" :disabled="page <= 1" @click="allerA(page - 1)">Précédent</button>
        <span>Page {{ page }} sur {{ pages }}</span>
        <button type="button" :disabled="page >= pages" @click="allerA(page + 1)">Suivant</button>
      </nav>
    </template>

    <p class="mention">{{ MENTION_SOURCE_FRANCE_TRAVAIL }}</p>
  </main>
</template>

<style scoped>
.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 32px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.filtres label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.filtres input,
.filtres select {
  padding: 9px 12px;
  font: inherit;
  font-weight: 400;
  border: 1px solid var(--line);
  border-radius: 9px;
}

.filtres button {
  padding: 10px 20px;
  font: inherit;
  font-weight: 600;
  color: var(--surface);
  background: var(--dom);
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.compte {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 14px;
}

.liste {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.offre {
  padding: 20px 22px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.offre .lien {
  color: inherit;
  text-decoration: none;
}

.offre h2 {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.3;
}

.offre .lien:hover h2,
.offre .lien:focus-visible h2 {
  text-decoration: underline;
}

.employeur {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--muted);
}

.attributs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.attributs li {
  padding: 4px 10px;
  font-size: 12.5px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.attributs .duree {
  white-space: pre-line;
}

.salaire {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}

.salaire.absent {
  font-weight: 400;
  color: var(--muted);
}

.meta {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
}

.meta .source {
  font-weight: 600;
}

.pagination {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin-top: 28px;
  font-size: 14px;
}

.pagination button {
  padding: 9px 18px;
  font: inherit;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.45;
  cursor: default;
}

.vide,
.alerte {
  padding: 28px;
  text-align: center;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}

/* Mention de source : obligation de licence, elle reste visible sur la page et
 * ne doit pas se perdre dans le pied de page du site. */
.mention {
  margin-top: 36px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--muted);
}
</style>

<script setup lang="ts">
import { MENTION_SOURCE_FRANCE_TRAVAIL, type OffrePubliqueDetail } from '@releve/shared';

/**
 * Détail d'une offre republiée.
 *
 * La page restitue l'annonce entière — la licence de réutilisation demande de
 * rendre le contenu mis à disposition, pas un résumé — et n'offre aucun bouton
 * de candidature interne. Le seul chemin est `urlOrigine` : Relève ne reçoit
 * pas ces candidatures, et un formulaire ici laisserait un candidat attendre
 * une réponse qui ne viendrait jamais.
 */

const route = useRoute();
const { requete } = useApi();

const { data: offre, error } = await useAsyncData(`offre-${route.params.id}`, () =>
  requete<OffrePubliqueDetail>(`/offres/${route.params.id}`),
);

useHead(() => ({
  title: offre.value ? `${offre.value.intitule} — Relève` : 'Offre — Relève',
  meta: [
    {
      name: 'description',
      content: offre.value?.description?.slice(0, 180) ?? "Offre d'intérim du secteur.",
    },
  ],
}));

const dateCourte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function jour(iso: string | null): string | null {
  return iso ? dateCourte.format(new Date(iso)) : null;
}

const lieu = computed(() => {
  if (!offre.value) {
    return '';
  }

  const { communeNom, codePostal, departement } = offre.value;

  if (communeNom) {
    return codePostal ? `${communeNom} (${codePostal})` : communeNom;
  }

  return departement ? `Département ${departement}` : 'France entière';
});

/**
 * Les horaires arrivent en lignes collées ("35H/semaine\nTravail en journée").
 * On les éclate plutôt que de les afficher d'un bloc, où la seconde ligne
 * passerait inaperçue.
 */
const horaires = computed(() =>
  (offre.value?.horaires ?? []).flatMap((ligne) =>
    ligne
      .split('\n')
      .map((partie) => partie.trim())
      .filter(Boolean),
  ),
);
</script>

<template>
  <main class="vitrine detail">
    <p v-if="error" class="alerte">
      Cette offre n'est plus diffusée. Elle a probablement été pourvue.
      <NuxtLink to="/offres">Revenir à la liste</NuxtLink>.
    </p>

    <template v-else-if="offre">
      <NuxtLink to="/offres" class="retour">← Toutes les offres</NuxtLink>

      <p class="vitrine-accroche">{{ offre.secteurActiviteLibelle ?? 'Intérim' }}</p>
      <h1 class="vitrine-titre">{{ offre.intitule }}</h1>

      <p class="employeur">{{ offre.entreprise ?? 'Employeur non précisé' }} &middot; {{ lieu }}</p>

      <ul class="attributs">
        <li v-if="offre.typeContratLibelle">{{ offre.typeContratLibelle }}</li>
        <li v-if="offre.experienceLibelle">Expérience : {{ offre.experienceLibelle }}</li>
        <li v-if="offre.qualificationLibelle">{{ offre.qualificationLibelle }}</li>
        <li v-if="offre.nombrePostes > 1">{{ offre.nombrePostes }} postes</li>
      </ul>

      <p class="salaire" :class="{ absent: !offre.salaireLibelle }">
        {{ offre.salaireLibelle ?? 'Rémunération non précisée par l’employeur' }}
      </p>

      <!-- Seul chemin pour postuler : la candidature se fait chez la source. -->
      <a
        v-if="offre.urlOrigine"
        :href="offre.urlOrigine"
        class="vitrine-bouton postuler"
        target="_blank"
        rel="noopener noreferrer"
      >
        Postuler sur France Travail
      </a>

      <section v-if="offre.description" class="bloc">
        <h2>Description du poste</h2>
        <p class="description">{{ offre.description }}</p>
      </section>

      <section v-if="horaires.length || offre.conditionsExercice.length" class="bloc">
        <h2>Conditions de travail</h2>
        <ul class="puces">
          <li v-for="ligne in horaires" :key="`h-${ligne}`">{{ ligne }}</li>
          <li v-for="ligne in offre.conditionsExercice" :key="`c-${ligne}`">{{ ligne }}</li>
        </ul>
      </section>

      <section v-if="offre.competences.length" class="bloc">
        <h2>Compétences attendues</h2>
        <ul class="puces">
          <li v-for="competence in offre.competences" :key="competence.libelle">
            {{ competence.libelle }}
            <span v-if="competence.exigence === 'E'" class="exigee">exigée</span>
          </li>
        </ul>
      </section>

      <section v-if="offre.entrepriseDescription" class="bloc">
        <h2>L'entreprise</h2>
        <p class="description">{{ offre.entrepriseDescription }}</p>
      </section>

      <!--
        Dates et source : obligations de licence. Elles disent au visiteur de
        quand date l'information qu'il lit, et d'où elle vient.
      -->
      <footer class="provenance">
        <p>
          Publiée le {{ jour(offre.publieeLe) }}
          <template v-if="offre.actualiseeLe">
            &middot; dernière actualisation le {{ jour(offre.actualiseeLe) }}
          </template>
        </p>
        <p>
          {{ MENTION_SOURCE_FRANCE_TRAVAIL }}
          <a
            v-if="offre.urlOrigine"
            :href="offre.urlOrigine"
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir l'annonce d'origine
          </a>
        </p>
      </footer>
    </template>
  </main>
</template>

<style scoped>
.detail {
  max-width: 780px;
}

.retour {
  display: inline-block;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
}

.retour:hover {
  text-decoration: underline;
}

.employeur {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--muted);
}

.attributs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

.attributs li {
  padding: 5px 12px;
  font-size: 13px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
}

.salaire {
  margin: 0 0 24px;
  font-size: 19px;
  font-weight: 650;
}

.salaire.absent {
  font-size: 15px;
  font-weight: 400;
  color: var(--muted);
}

.postuler {
  margin-bottom: 40px;
}

.bloc {
  margin-bottom: 34px;
}

.bloc h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 650;
}

/* L'annonce arrive en texte brut avec ses retours à la ligne : les préserver
 * est la seule façon de la restituer telle que l'employeur l'a écrite. */
.description {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.7;
  white-space: pre-line;
}

.puces {
  margin: 0;
  padding-left: 20px;
  font-size: 15px;
  line-height: 1.8;
}

.exigee {
  margin-left: 6px;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--surface);
  background: var(--eta);
  border-radius: 999px;
}

.provenance {
  padding-top: 24px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--muted);
}

.provenance p {
  margin: 0 0 8px;
}

.alerte {
  padding: 32px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}
</style>

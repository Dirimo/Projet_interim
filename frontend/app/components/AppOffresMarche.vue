<script setup lang="ts">
import { MENTION_SOURCE_FRANCE_TRAVAIL, type SuggestionsMarche } from '@releve/shared';

/**
 * Offres du marché proches du profil du candidat.
 *
 * Ce ne sont pas des missions Relève, et l'encart doit le dire sans ambiguïté :
 * elles viennent de France Travail, appartiennent à d'autres employeurs, et la
 * candidature se fait chez la source — l'agence ne la recevra pas. Un candidat
 * qui croirait postuler ici attendrait une réponse qui ne viendrait jamais.
 *
 * Citer la source et pointer vers l'annonce d'origine sont aussi des
 * obligations de la licence de réutilisation, qui s'appliquent partout où
 * l'offre est montrée — y compris derrière une session.
 *
 * Le rapprochement se fait sur le métier et la distance uniquement. Aucun score
 * n'est affiché : les offres France Travail n'annoncent pas leurs horaires
 * autrement qu'en texte libre, et un pourcentage calculé sur des champs absents
 * serait un chiffre inventé présenté comme une mesure.
 */

const { requete } = useApi();

const { data } = await useAsyncData('offres-marche', () =>
  requete<SuggestionsMarche>('/offres/suggestions', { query: { limite: 6 } }),
);

const suggestions = computed(() => data.value?.suggestions ?? []);

/** Chaque motif appelle une action différente du candidat, pas un message générique. */
const messageVide = computed(() => {
  switch (data.value?.motif) {
    case 'AUCUN_METIER':
      return 'Renseignez votre métier dans votre profil pour voir les offres du marché qui vous correspondent.';
    case 'ADRESSE_ABSENTE':
      return 'Renseignez votre adresse dans votre profil : sans elle, impossible de mesurer quelles offres sont à votre portée.';
    case 'AUCUNE_OFFRE':
      return "Aucune offre du marché dans votre rayon de déplacement pour l'instant. Élargir ce rayon dans votre profil en ferait apparaître davantage.";
    default:
      return null;
  }
});
</script>

<template>
  <section v-if="suggestions.length || messageVide" class="marche">
    <header>
      <h2>Ailleurs sur le marché</h2>
      <p class="chapeau">
        Des offres qui correspondent à votre métier et à votre rayon de déplacement, publiées par
        d'autres employeurs. <strong>La candidature se fait sur France Travail.</strong>
      </p>
    </header>

    <p v-if="messageVide" class="vide">{{ messageVide }}</p>

    <template v-else>
      <ul class="liste">
        <li v-for="offre in suggestions" :key="offre.id" class="offre">
          <div class="entete">
            <h3>{{ offre.intitule }}</h3>
            <!--
              Trois cas, et la nuance compte. France Travail ne géolocalise
              qu'une annonce sur sept : les autres sont situées au centre de
              leur commune, ce qui donne une distance juste à quelques
              kilomètres près. L'écrire « ~ 12 km » plutôt que « 12 km » évite
              de faire passer une approximation pour une mesure. Et quand même
              la commune n'a pas pu être située, on se contente du département.
            -->
            <span
              v-if="offre.distanceKm !== null"
              class="distance"
              :class="{ approx: offre.distanceApprochee }"
              :title="
                offre.distanceApprochee
                  ? 'Distance calculée depuis le centre de la commune'
                  : undefined
              "
            >
              {{ offre.distanceApprochee ? '~' : '' }}{{ offre.distanceKm }} km
            </span>
            <span v-else-if="offre.departement" class="distance approx">
              dép. {{ offre.departement }}
            </span>
          </div>

          <p class="employeur">
            {{ offre.entreprise ?? 'Employeur non précisé' }}
            <template v-if="offre.communeNom"> &middot; {{ offre.communeNom }}</template>
          </p>

          <ul class="attributs">
            <li v-if="offre.typeContratLibelle">{{ offre.typeContratLibelle }}</li>
            <li v-if="offre.dureeTravailLibelle">
              {{ offre.dureeTravailLibelle.split('\n')[0] }}
            </li>
            <li v-if="offre.experienceExigee">Expérience exigée</li>
          </ul>

          <div class="pied">
            <span class="salaire" :class="{ absent: !offre.salaireLibelle }">
              {{ offre.salaireLibelle ?? 'Rémunération non précisée' }}
            </span>
            <!-- Lien sortant : Relève ne reçoit pas ces candidatures. -->
            <a
              v-if="offre.urlOrigine"
              :href="offre.urlOrigine"
              target="_blank"
              rel="noopener noreferrer"
              class="voir"
            >
              Voir sur France Travail ↗
            </a>
          </div>
        </li>
      </ul>

      <p v-if="(data?.total ?? 0) > suggestions.length" class="reste">
        {{ data?.total }} offres correspondent à votre profil dans votre rayon.
      </p>
    </template>

    <p class="mention">{{ MENTION_SOURCE_FRANCE_TRAVAIL }}</p>
  </section>
</template>

<style scoped>
.marche {
  margin-top: 40px;
}

.marche h2 {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 650;
}

.chapeau {
  margin: 0 0 18px;
  max-width: 72ch;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

.liste {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * Bordure discontinue : elle distingue visuellement ces cartes de celles des
 * missions Relève, qui sont pleines. Le candidat doit voir au premier coup
 * d'oeil qu'il change de registre.
 */
.offre {
  padding: 16px 18px;
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: 14px;
}

.entete {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
}

.offre h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
}

.distance {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
}

/* Distance inconnue : la mention doit se lire comme moins précise, pas comme
 * une mesure au même titre que « 6 km ». */
.distance.approx {
  font-weight: 400;
  font-style: italic;
}

.employeur {
  margin: 6px 0 10px;
  font-size: 13.5px;
  color: var(--muted);
}

.attributs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.attributs li {
  padding: 3px 9px;
  font-size: 12px;
  background: var(--bg);
  border-radius: 999px;
}

.pied {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.salaire {
  font-size: 13.5px;
  font-weight: 600;
}

.salaire.absent {
  font-weight: 400;
  color: var(--muted);
}

.voir {
  font-size: 13px;
  font-weight: 600;
  color: var(--dom);
  text-decoration: none;
}

.voir:hover {
  text-decoration: underline;
}

.reste {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.vide {
  padding: 20px;
  font-size: 14px;
  color: var(--muted);
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: 14px;
}

.mention {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}
</style>

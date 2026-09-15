<script setup lang="ts">
import { ADRESSE_CONTACT } from '~/data/vitrine';

useHead({
  title: 'Mentions légales — Relève',
  // Une page d'identite legale incomplete n'a rien a faire dans un index de
  // moteur de recherche tant qu'elle n'est pas renseignee.
  meta: [{ name: 'robots', content: 'noindex' }],
});

/**
 * Mentions legales : la seule page du site dont le contenu ne peut pas etre
 * redige ici.
 *
 * Raison sociale, forme juridique, capital, SIRET, TVA, numero de declaration
 * de services a la personne, garantie financiere d'entreprise de travail
 * temporaire, directeur de la publication, hebergeur : ce sont des faits
 * juridiques propres a l'agence. En inventer un seul exposerait l'editeur, et
 * une valeur plausible mais fausse est pire qu'un trou visible.
 *
 * Chaque ligne a donc sa place et son intitule exact, avec la mention « à
 * compléter » affichee tant que la valeur n'est pas fournie. Il suffit de
 * remplir `valeur` ci-dessous.
 */
interface Mention {
  libelle: string;
  valeur?: string;
  precision?: string;
}

const EDITEUR: Mention[] = [
  { libelle: 'Raison sociale', precision: 'Dénomination exacte figurant au Kbis' },
  { libelle: 'Forme juridique et capital social' },
  { libelle: 'Siège social', precision: 'Adresse postale complète' },
  { libelle: 'Numéro SIRET' },
  { libelle: 'Numéro de TVA intracommunautaire' },
  { libelle: 'Directeur de la publication', precision: 'Nom et qualité' },
  { libelle: 'Adresse de contact', valeur: ADRESSE_CONTACT },
];

const ACTIVITE: Mention[] = [
  {
    libelle: 'Garantie financière (travail temporaire)',
    precision: "Organisme garant et adresse, exigés pour une entreprise de travail temporaire",
  },
  {
    libelle: 'Déclaration de services à la personne',
    precision: "Numéro de déclaration, le cas échéant",
  },
  { libelle: 'Assurance de responsabilité civile professionnelle' },
];

const HEBERGEMENT: Mention[] = [
  { libelle: 'Hébergeur', precision: 'Dénomination, adresse et téléphone' },
  { libelle: 'Localisation des données', precision: 'Pays d’hébergement des serveurs' },
];
</script>

<template>
  <main class="vitrine legales">
    <p class="vitrine-accroche">Mentions légales</p>
    <h1 class="vitrine-titre">Informations légales</h1>
    <p class="vitrine-chapeau">
      Les rubriques ci-dessous sont celles qu'un site d'agence de travail temporaire doit publier.
      Celles marquées « à compléter » attendent les informations de l'agence.
    </p>

    <section>
      <h2>Éditeur du site</h2>
      <dl>
        <template v-for="mention in EDITEUR" :key="mention.libelle">
          <dt>{{ mention.libelle }}</dt>
          <dd>
            <span v-if="mention.valeur">{{ mention.valeur }}</span>
            <span v-else class="manque">À compléter</span>
            <span v-if="mention.precision" class="precision">{{ mention.precision }}</span>
          </dd>
        </template>
      </dl>
    </section>

    <section>
      <h2>Activité réglementée</h2>
      <dl>
        <template v-for="mention in ACTIVITE" :key="mention.libelle">
          <dt>{{ mention.libelle }}</dt>
          <dd>
            <span v-if="mention.valeur">{{ mention.valeur }}</span>
            <span v-else class="manque">À compléter</span>
            <span v-if="mention.precision" class="precision">{{ mention.precision }}</span>
          </dd>
        </template>
      </dl>
    </section>

    <section>
      <h2>Hébergement</h2>
      <dl>
        <template v-for="mention in HEBERGEMENT" :key="mention.libelle">
          <dt>{{ mention.libelle }}</dt>
          <dd>
            <span v-if="mention.valeur">{{ mention.valeur }}</span>
            <span v-else class="manque">À compléter</span>
            <span v-if="mention.precision" class="precision">{{ mention.precision }}</span>
          </dd>
        </template>
      </dl>
    </section>

    <section>
      <h2>Données personnelles</h2>
      <p>
        Le site traite les données que vous saisissez pour constituer votre dossier candidat :
        identité, coordonnées, adresse et rayon de déplacement, disponibilités, diplômes et
        expérience professionnelle. L'adresse est transmise à un service de géocodage pour mesurer
        les distances entre votre domicile et les lieux d'intervention.
      </p>
      <p>
        Aucune donnée de santé n'est collectée : l'agence enregistre si vous êtes déployable, jamais
        pourquoi.
      </p>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et
        d'opposition, ainsi que d'un droit à la portabilité. Pour l'exercer, écrivez à
        <a :href="`mailto:${ADRESSE_CONTACT}`">{{ ADRESSE_CONTACT }}</a>.
      </p>
      <p class="reste">
        Restent à préciser par l'agence : la base légale de chaque traitement, les durées de
        conservation, les sous-traitants et destinataires, les éventuels transferts hors Union
        européenne, les coordonnées du délégué à la protection des données s'il en existe un, et le
        recours possible auprès de la CNIL.
      </p>
    </section>
  </main>
</template>

<style scoped>
.legales {
  max-width: 860px;
}

section {
  margin-top: 44px;
}

h2 {
  margin: 0 0 18px;
  font-size: clamp(22px, 3.5vw, 26px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

dt {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

dd {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 13px;
}

.manque {
  font-weight: 700;
  color: var(--ambre-encre);
}

.precision {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--muted);
}

p {
  max-width: 68ch;
  margin: 0 0 16px;
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--muted);
}

p:last-child {
  margin-bottom: 0;
}

.reste {
  padding: 18px;
  color: var(--ambre-encre);
  background: var(--ambre);
  border: 1px solid var(--ambre-line);
  border-radius: 14px;
}
</style>

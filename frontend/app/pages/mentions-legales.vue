<script setup lang="ts">
import { ACTIVITE, ADRESSE_CONTACT, DERNIERE_REVISION, EDITEUR, HEBERGEMENT } from '~/data/legal';

useHead({
  title: 'Mentions légales — Relève',
  // Une identite legale incomplete n'a rien a faire dans un index de moteur de
  // recherche tant qu'elle n'est pas renseignee.
  meta: [{ name: 'robots', content: 'noindex' }],
});
</script>

<template>
  <main class="vitrine legal">
    <p class="vitrine-accroche">Mentions légales</p>
    <h1 class="vitrine-titre">Informations légales</h1>
    <p class="vitrine-chapeau">
      Les rubriques ci-dessous sont celles qu'un site d'entreprise de travail temporaire doit
      publier. Celles marquées « à compléter » attendent les informations de l'agence : elles ne
      peuvent venir que d'elle, et une valeur inventée exposerait l'éditeur.
    </p>

    <section>
      <h2>Éditeur du site</h2>
      <AppMentions :mentions="EDITEUR" />
    </section>

    <section>
      <h2>Activité réglementée</h2>
      <p>
        Le placement d'intérimaires est une activité encadrée. La garantie financière en est la
        pièce maîtresse : elle protège les salariés temporaires en cas de défaillance de l'agence,
        et son absence interdit purement et simplement l'exercice.
      </p>
      <AppMentions :mentions="ACTIVITE" />
    </section>

    <section>
      <h2>Hébergement</h2>
      <AppMentions :mentions="HEBERGEMENT" />
    </section>

    <section>
      <h2>Propriété intellectuelle</h2>
      <p>
        Les contenus de ce site — textes, interface, identité visuelle — appartiennent à l'éditeur,
        sauf mention contraire. Les données publiques affichées dans le baromètre de tension
        proviennent de France Travail et restent soumises à leurs conditions de réutilisation.
      </p>
    </section>

    <section>
      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la
        <NuxtLink to="/politique-confidentialite">politique de confidentialité</NuxtLink>. Pour
        exercer vos droits, écrivez à
        <a :href="`mailto:${ADRESSE_CONTACT}`">{{ ADRESSE_CONTACT }}</a
        >.
      </p>
    </section>

    <p class="revision">Dernière révision : {{ DERNIERE_REVISION }}</p>
  </main>
</template>

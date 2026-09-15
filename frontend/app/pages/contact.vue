<script setup lang="ts">
import { ADRESSE_CONTACT, COORDONNEES, SUJETS_CONTACT } from '~/data/vitrine';

useHead({
  title: 'Contact — Relève',
  meta: [
    {
      name: 'description',
      content:
        "Une question sur une mission, un dossier candidat ou un contrat : écrivez à l'agence Relève.",
    },
  ],
});

const prenom = ref('');
const nom = ref('');
const email = ref('');
const sujet = ref<string>(SUJETS_CONTACT[0]);
const message = ref('');

/**
 * Le canvas dessine un formulaire qui s'envoie tout seul. L'API n'a aucune
 * route de contact, et rien ne serait plus trompeur qu'un bouton « Envoyer »
 * qui jette le message.
 *
 * La saisie compose donc un courriel que le logiciel de messagerie de la
 * personne ouvrira, pre-rempli. C'est un lien, pas un appel reseau : il
 * fonctionne sans JavaScript une fois la page rendue, et aucune donnee ne
 * transite par le site.
 */
const lienMessagerie = computed(() => {
  const objet = `[Relève] ${sujet.value}`;

  // La signature n'est ajoutee que si l'identite est saisie : un formulaire
  // vide ne doit pas produire un message reduit a un tiret cadratin.
  const signature = [`${prenom.value} ${nom.value}`.trim(), email.value.trim()].filter(Boolean);

  const corps = signature.length
    ? [message.value, '', '—', ...signature].join('\n')
    : message.value;

  return `mailto:${ADRESSE_CONTACT}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
});
</script>

<template>
  <main class="vitrine contact">
    <div>
      <p class="vitrine-accroche">Contact</p>
      <h1 class="vitrine-titre">Parlons de votre recherche</h1>
      <p class="chapeau">
        Une question sur une mission, sur votre dossier ou sur un contrat ? Écrivez-nous, nous
        répondons sous 24 heures ouvrées.
      </p>

      <div class="coordonnees">
        <div v-for="coordonnee in COORDONNEES" :key="coordonnee.libelle" class="coordonnee">
          <p class="libelle">{{ coordonnee.libelle }}</p>
          <p class="valeur">
            <a :href="`mailto:${coordonnee.valeur}`">{{ coordonnee.valeur }}</a>
          </p>
        </div>
      </div>

      <p class="structure">
        Vous représentez un service d'aide à domicile ? Votre structure est enregistrée par nos
        équipes, après vérification de votre déclaration SAP ou de votre autorisation : écrivez-nous
        à la même adresse.
      </p>
    </div>

    <form class="formulaire" @submit.prevent>
      <div class="paire">
        <label>
          <span>Prénom</span>
          <input id="prenom" v-model="prenom" type="text" autocomplete="given-name" />
        </label>

        <label>
          <span>Nom</span>
          <input id="nom" v-model="nom" type="text" autocomplete="family-name" />
        </label>
      </div>

      <label>
        <span>Adresse mail</span>
        <input id="email" v-model="email" type="email" autocomplete="email" />
      </label>

      <label>
        <span>Sujet</span>
        <select id="sujet" v-model="sujet">
          <option v-for="option in SUJETS_CONTACT" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>

      <label>
        <span>Votre message</span>
        <textarea id="message" v-model="message" rows="5" placeholder="Décrivez votre demande" />
      </label>

      <a :href="lienMessagerie" class="envoyer">Préparer mon message</a>

      <p class="note">
        Le bouton ouvre votre logiciel de messagerie avec le message déjà rédigé, à destination de
        {{ ADRESSE_CONTACT }}. Rien n'est enregistré sur ce site.
      </p>
    </form>
  </main>
</template>

<style scoped>
.contact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 48px;
  align-items: start;
  max-width: 1100px;
}

.chapeau {
  margin: 0 0 32px;
  font-size: 17px;
  line-height: 1.65;
  color: var(--muted);
}

.coordonnees {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.coordonnee {
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.libelle {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.valeur {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
}

.valeur a {
  color: inherit;
  text-decoration: none;
}

.valeur a:hover {
  color: var(--dom);
}

.structure {
  max-width: 52ch;
  margin: 26px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

/* ---------- Formulaire ---------- */

.formulaire {
  display: grid;
  gap: 16px;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 22px;
}

.paire {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
}

input,
select,
textarea {
  width: 100%;
  padding: 13px 15px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 400;
  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--line);
  border-radius: 11px;
}

textarea {
  line-height: 1.6;
  resize: vertical;
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.envoyer {
  padding: 15px;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--surface);
  text-align: center;
  text-decoration: none;
  background: var(--dom);
  border-radius: 12px;
}

.envoyer:hover {
  color: var(--surface);
  background: var(--dom-fonce);
}

.envoyer:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 3px;
}

.note {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--muted);
}

@media (max-width: 860px) {
  .contact {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
  }
}

@media (max-width: 560px) {
  .formulaire {
    padding: 22px;
  }

  .paire {
    grid-template-columns: 1fr;
  }
}
</style>

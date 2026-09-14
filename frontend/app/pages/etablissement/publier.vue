<script setup lang="ts">
import { CRENEAUX, NIVEAUX_URGENCE, POSTES, UNITES } from '~/data/missions-demo';

useHead({ title: 'Publier une mission - Passerelle' });

/**
 * Le Figma ne dessine que l'etape 2 sur 3. Les etapes 1 et 3 ne sont donc pas
 * inventees ici : la barre de progression reprend l'etat de la maquette, et le
 * bouton « Voir le recapitulatif » deplie un recapitulatif dans la page plutot
 * que de mener a un ecran qui n'existe pas.
 */
const ETAPE_COURANTE = 2;
const NOMBRE_ETAPES = 3;

const poste = ref(POSTES[0] ?? '');
const date = ref("Aujourd'hui");
const creneau = ref(CRENEAUX[0] ?? '');
const unite = ref(UNITES[0] ?? '');
const urgence = ref(NIVEAUX_URGENCE[0] ?? '');
const taux = ref('18,50');

const modificationTaux = ref(false);
const recapitulatif = ref(false);

const DATES = ["Aujourd'hui", 'Demain', 'Cette semaine'];

const resume = computed(() => [
  { libelle: 'Poste recherche', valeur: poste.value },
  { libelle: 'Date', valeur: date.value },
  { libelle: 'Horaires', valeur: creneau.value },
  { libelle: 'Unite ou service', valeur: unite.value },
  { libelle: "Niveau d'urgence", valeur: urgence.value },
  { libelle: 'Remuneration indicative', valeur: `${taux.value} EUR brut / heure` },
]);
</script>

<template>
  <section class="publier">
    <AppBarreApp titre="Nouvelle mission" action="Brouillon" />

    <div
      class="progression"
      role="progressbar"
      :aria-valuenow="ETAPE_COURANTE"
      :aria-valuemin="1"
      :aria-valuemax="NOMBRE_ETAPES"
      :aria-label="`Etape ${ETAPE_COURANTE} sur ${NOMBRE_ETAPES}`"
    >
      <span
        v-for="etape in NOMBRE_ETAPES"
        :key="etape"
        :class="{ faite: etape <= ETAPE_COURANTE }"
      />
    </div>

    <div class="corps">
      <header class="tete">
        <p class="etape">Etape {{ ETAPE_COURANTE }} sur {{ NOMBRE_ETAPES }}</p>
        <h1>Precisez votre besoin</h1>
        <p class="intro">
          Ces informations seront visibles par les professionnel&middot;les disponibles.
        </p>
      </header>

      <form class="formulaire" @submit.prevent="recapitulatif = true">
        <label class="champ">
          <span class="libelle">Poste recherche</span>
          <span class="boite">
            <AppIcon nom="ambulance" :taille="17" />
            <select v-model="poste">
              <option v-for="option in POSTES" :key="option">{{ option }}</option>
            </select>
            <AppIcon nom="chevron-down" :taille="15" />
          </span>
        </label>

        <div class="duo">
          <label class="champ">
            <span class="libelle">Date</span>
            <span class="boite">
              <AppIcon nom="calendar" :taille="17" />
              <select v-model="date">
                <option v-for="option in DATES" :key="option">{{ option }}</option>
              </select>
              <AppIcon nom="chevron-down" :taille="15" />
            </span>
          </label>

          <label class="champ">
            <span class="libelle">Horaires</span>
            <span class="boite">
              <AppIcon nom="clock" :taille="17" />
              <select v-model="creneau">
                <option v-for="option in CRENEAUX" :key="option">{{ option }}</option>
              </select>
              <AppIcon nom="chevron-down" :taille="15" />
            </span>
          </label>
        </div>

        <label class="champ">
          <span class="libelle">Unite ou service</span>
          <span class="boite">
            <AppIcon nom="hospital" :taille="17" />
            <select v-model="unite">
              <option v-for="option in UNITES" :key="option">{{ option }}</option>
            </select>
            <AppIcon nom="chevron-down" :taille="15" />
          </span>
        </label>

        <fieldset class="urgence">
          <legend class="libelle">Niveau d'urgence</legend>
          <div class="options">
            <button
              v-for="niveau in NIVEAUX_URGENCE"
              :key="niveau"
              type="button"
              class="option"
              :aria-pressed="urgence === niveau"
              @click="urgence = niveau"
            >
              <AppBadge :teinte="urgence === niveau ? 'corail' : 'neutre'">{{ niveau }}</AppBadge>
            </button>
          </div>
        </fieldset>

        <div class="remuneration">
          <div class="copie">
            <p class="libelle">Remuneration indicative</p>
            <p v-if="!modificationTaux" class="montant">{{ taux }} EUR brut / heure</p>
            <label v-else class="saisie">
              <span class="sr-only">Remuneration horaire brute en euros</span>
              <input v-model="taux" type="text" inputmode="decimal" />
              <span>EUR brut / heure</span>
            </label>
          </div>
          <button type="button" class="modifier" @click="modificationTaux = !modificationTaux">
            {{ modificationTaux ? 'Valider' : 'Modifier' }}
          </button>
        </div>

        <div class="actions">
          <AppBouton type="submit" icone="arrow-right">Voir le recapitulatif</AppBouton>
        </div>
      </form>

      <AppCarte v-if="recapitulatif" class="resume">
        <h2>Recapitulatif</h2>
        <dl>
          <div v-for="ligne in resume" :key="ligne.libelle">
            <dt>{{ ligne.libelle }}</dt>
            <dd>{{ ligne.valeur }}</dd>
          </div>
        </dl>
        <p class="avertissement">
          La publication reelle attend le domaine « mission » cote API : rien n'est envoye pour
          l'instant.
        </p>
      </AppCarte>
    </div>
  </section>
</template>

<style scoped>
.publier {
  padding-block: 16px 0;
}

.progression {
  display: flex;
  gap: 8px;
  max-width: 640px;
  padding-block: 10px;
}

.progression span {
  flex: 1;
  height: 4px;
  background: var(--line);
  border-radius: 2px;
}

.progression span.faite {
  background: var(--dom);
}

.corps {
  max-width: 640px;
  padding-top: 12px;
}

.etape {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--eta);
}

h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 400;
}

.intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--muted);
}

.formulaire {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.champ {
  display: grid;
  gap: 7px;
}

.libelle {
  font-size: 12px;
  color: var(--ink);
}

.boite {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 48px;
  padding-inline: 14px;
  color: var(--dom);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.boite select {
  flex: 1;
  min-width: 0;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--ink);
  background: none;
  border: 0;
  appearance: none;
  cursor: pointer;
}

.boite select:focus-visible {
  outline: none;
}

.boite:focus-within {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.duo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.urgence {
  margin: 0;
  padding: 0;
  border: 0;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.option {
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
}

.option:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 3px;
  border-radius: 999px;
}

.remuneration {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: var(--dom-soft);
  border-radius: var(--r-carte);
}

.remuneration .libelle {
  display: block;
  margin: 0 0 3px;
  font-size: 11px;
  color: var(--muted);
}

.montant {
  margin: 0;
  font-size: 17px;
  color: var(--dom-fonce);
}

.saisie {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  color: var(--dom-fonce);
}

.saisie input {
  width: 5em;
  padding: 4px 8px;
  font-family: var(--sans);
  font-size: 15px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.modifier {
  flex: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 12px;
  color: var(--dom);
  background: none;
  border: 0;
  cursor: pointer;
}

.actions {
  max-width: 360px;
}

.resume {
  margin-top: 24px;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 700;
}

dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

dt {
  font-size: 11px;
  color: var(--muted);
}

dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 600;
}

.avertissement {
  margin: 16px 0 0;
  font-size: 11px;
  color: var(--muted);
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

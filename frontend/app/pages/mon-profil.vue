<script setup lang="ts">
import type {
  CandidatDetail,
  CompletudeProfil,
  Disponibilite,
  QualificationResume,
} from '@releve/shared';
import { JOURS_SEMAINE } from '@releve/shared';

useHead({ title: 'Mon profil - Relève' });

const { requete } = useApi();

const { data: profil, refresh } = await useAsyncData('mon-profil', () =>
  requete<CandidatDetail>('/mon-profil'),
);

const { data: completude, refresh: rafraichirCompletude } = await useAsyncData(
  'mon-profil:completude',
  () => requete<CompletudeProfil>('/mon-profil/completude'),
);

const { data: referentiel } = await useAsyncData('referentiel-diplomes', () =>
  requete<QualificationResume[]>('/qualifications'),
);

const message = ref('');
const erreur = ref('');
const enCours = ref(false);

/**
 * Toutes les actions passent par ici : une seule gestion d'erreur, et la fiche
 * comme la complétude sont relues après chaque écriture. Sans cela, la barre de
 * progression resterait figée sur l'état d'avant.
 */
async function appliquer(action: () => Promise<unknown>, confirmation: string): Promise<void> {
  message.value = '';
  erreur.value = '';
  enCours.value = true;

  try {
    await action();
    await Promise.all([refresh(), rafraichirCompletude()]);
    message.value = confirmation;
  } catch (cause) {
    const corps = (
      cause as { data?: { message?: string; erreurs?: { champ: string; message: string }[] } }
    ).data;

    erreur.value = corps?.erreurs?.length
      ? corps.erreurs.map((souci) => `${souci.champ} : ${souci.message}`).join(' · ')
      : (corps?.message ?? 'Action impossible pour le moment.');
  } finally {
    enCours.value = false;
  }
}

/* ----------------------------------------------------- coordonnées et secteur */

const form = reactive({
  telephone: '',
  adresse: '',
  codePostal: '',
  ville: '',
  rayonKm: 20,
  permisB: false,
  vehicule: false,
});

watchEffect(() => {
  const fiche = profil.value;
  if (!fiche) return;

  form.telephone = fiche.telephone;
  form.adresse = fiche.adresse;
  form.codePostal = fiche.codePostal;
  form.ville = fiche.ville;
  form.rayonKm = fiche.rayonKm;
  form.permisB = fiche.permisB;
  form.vehicule = fiche.vehicule;
});

function enregistrer(): Promise<void> {
  return appliquer(
    () => requete<CandidatDetail>('/mon-profil', { method: 'PATCH', body: { ...form } }),
    'Profil mis a jour.',
  );
}

/* --------------------------------------------------------------- disponibilités */

const creneaux = ref<Disponibilite[]>([]);

watchEffect(() => {
  creneaux.value = (profil.value?.disponibilites ?? []).map((creneau) => ({
    jourSemaine: creneau.jourSemaine,
    heureDebut: creneau.heureDebut,
    heureFin: creneau.heureFin,
    recurrente: creneau.recurrente,
  }));
});

function ajouterCreneau(): void {
  creneaux.value = [
    ...creneaux.value,
    { jourSemaine: 1, heureDebut: '08:00', heureFin: '12:00', recurrente: true },
  ];
}

function retirerCreneau(index: number): void {
  creneaux.value = creneaux.value.filter((_, rang) => rang !== index);
}

function enregistrerCreneaux(): Promise<void> {
  return appliquer(
    () =>
      requete<CandidatDetail>('/mon-profil/disponibilites', {
        method: 'PUT',
        body: { disponibilites: creneaux.value },
      }),
    'Disponibilites enregistrees.',
  );
}

/* ---------------------------------------------------------------------- diplômes */

const diplomeChoisi = ref('');
const obtenuLe = ref('');

/** Les diplômes déjà déclarés ne sont pas reproposés. */
const diplomesDisponibles = computed(() => {
  const declares = new Set((profil.value?.qualificationsDetail ?? []).map((d) => d.qualificationId));

  return (referentiel.value ?? []).filter((option) => !declares.has(option.id));
});

watchEffect(() => {
  if (!diplomeChoisi.value) {
    diplomeChoisi.value = diplomesDisponibles.value[0]?.id ?? '';
  }
});

function declarer(): Promise<void> {
  return appliquer(
    () =>
      requete<CandidatDetail>('/mon-profil/diplomes', {
        method: 'POST',
        body: {
          qualificationId: diplomeChoisi.value,
          ...(obtenuLe.value ? { obtenueLe: obtenuLe.value } : {}),
        },
      }),
    "Diplome declare. L'agence le verifiera avant qu'il ne compte.",
  );
}

function retirerDiplome(qualificationId: string): Promise<void> {
  return appliquer(
    () =>
      requete<CandidatDetail>(`/mon-profil/diplomes/${qualificationId}`, { method: 'DELETE' }),
    'Diplome retire.',
  );
}
</script>

<template>
  <section v-if="profil" class="profil">
    <header class="tete">
      <h1>Mon profil</h1>
      <p class="intro">
        Ce que vous renseignez ici decide des missions qui vous sont proposees : votre secteur, vos
        creneaux et vos diplomes entrent directement dans le calcul.
      </p>
    </header>

    <AppCarte v-if="completude" class="jauge-carte">
      <div class="entete-jauge">
        <p class="titre-jauge">Profil complete a {{ completude.pourcentage }} %</p>
        <AppBadge :teinte="completude.manques.length ? 'corail' : 'vert'">
          {{ completude.manques.length ? `${completude.manques.length} a completer` : 'Complet' }}
        </AppBadge>
      </div>

      <div class="jauge"><span :style="{ width: `${completude.pourcentage}%` }" /></div>

      <ul v-if="completude.manques.length" class="manques">
        <li v-for="manque in completude.manques" :key="manque.cle">{{ manque.libelle }}</li>
      </ul>
    </AppCarte>

    <p v-if="message" class="succes" role="status">{{ message }}</p>
    <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>

    <section class="bloc">
      <h2>Coordonnees et secteur</h2>
      <form class="grille" @submit.prevent="enregistrer()">
        <label>
          <span>Telephone</span>
          <input id="telephone" v-model="form.telephone" type="tel" autocomplete="tel" />
        </label>

        <label class="large">
          <span>Adresse</span>
          <input id="adresse" v-model="form.adresse" type="text" autocomplete="street-address" />
        </label>

        <label>
          <span>Code postal</span>
          <input id="code-postal" v-model="form.codePostal" type="text" inputmode="numeric" />
        </label>

        <label>
          <span>Ville</span>
          <input id="ville" v-model="form.ville" type="text" />
        </label>

        <label class="large">
          <span>Rayon de deplacement : {{ form.rayonKm }} km</span>
          <input id="rayon" v-model.number="form.rayonKm" type="range" min="1" max="150" />
          <em class="aide">
            Au-dela de ce rayon, les missions ne vous sont pas proposees du tout.
          </em>
        </label>

        <label class="case">
          <input id="permis" v-model="form.permisB" type="checkbox" />
          <span>Permis B</span>
        </label>

        <label class="case">
          <input id="vehicule" v-model="form.vehicule" type="checkbox" />
          <span>Vehicule personnel</span>
        </label>

        <div class="action large">
          <AppBouton type="submit" :desactive="enCours">Enregistrer</AppBouton>
        </div>
      </form>
    </section>

    <section class="bloc">
      <h2>Mes disponibilites</h2>
      <p class="intro-bloc">
        Un creneau par ligne. Une vacation qui commence apres l heure de fin traverse minuit : c est
        le travail de nuit.
      </p>

      <ul class="creneaux">
        <li v-for="(creneau, index) in creneaux" :key="index">
          <select :id="`jour-${index}`" v-model.number="creneau.jourSemaine">
            <option v-for="(jour, rang) in JOURS_SEMAINE" :key="jour" :value="rang + 1">
              {{ jour }}
            </option>
          </select>
          <input :id="`debut-${index}`" v-model="creneau.heureDebut" type="time" />
          <input :id="`fin-${index}`" v-model="creneau.heureFin" type="time" />
          <button type="button" class="retirer" @click="retirerCreneau(index)">Retirer</button>
        </li>
      </ul>

      <p v-if="!creneaux.length" class="vide">
        Aucun creneau declare. Sans disponibilite, votre score de correspondance reste au plus bas.
      </p>

      <div class="actions-bloc">
        <AppBouton variante="secondaire" @click="ajouterCreneau()">Ajouter un creneau</AppBouton>
        <AppBouton :desactive="enCours" @click="enregistrerCreneaux()">
          Enregistrer mes creneaux
        </AppBouton>
      </div>
    </section>

    <section class="bloc">
      <h2>Mes diplomes</h2>
      <p class="intro-bloc">
        Un diplome declare ne compte qu une fois verifie par l agence. Tant qu il ne l est pas, il
        ne vous rend eligible a aucune mission.
      </p>

      <ul class="diplomes">
        <li v-for="diplome in profil.qualificationsDetail" :key="diplome.qualificationId">
          <div class="copie">
            <p class="nom-diplome">{{ diplome.libelle }}</p>
            <p class="meta">
              <template v-if="diplome.obtenueLe">Obtenu le {{ diplome.obtenueLe }}</template>
              <template v-else>Date d obtention non renseignee</template>
            </p>
          </div>

          <AppBadge v-if="diplome.expiree" teinte="corail">Expire</AppBadge>
          <AppBadge v-else-if="diplome.verifieeLe" teinte="vert">Verifie</AppBadge>
          <AppBadge v-else>En attente de verification</AppBadge>

          <button
            v-if="!diplome.verifieeLe"
            type="button"
            class="retirer"
            @click="retirerDiplome(diplome.qualificationId)"
          >
            Retirer
          </button>
        </li>
      </ul>

      <p v-if="!profil.qualificationsDetail.length" class="vide">
        Aucun diplome declare.
      </p>

      <form v-if="diplomesDisponibles.length" class="ajout" @submit.prevent="declarer()">
        <label>
          <span>Diplome</span>
          <select id="diplome" v-model="diplomeChoisi">
            <option v-for="option in diplomesDisponibles" :key="option.id" :value="option.id">
              {{ option.libelle }}
            </option>
          </select>
        </label>

        <label>
          <span>Obtenu le</span>
          <input id="obtenu-le" v-model="obtenuLe" type="date" />
        </label>

        <AppBouton type="submit" :desactive="enCours">Declarer</AppBouton>
      </form>
    </section>
  </section>
</template>

<style scoped>
.profil {
  max-width: 720px;
  padding-block: 32px 0;
  display: grid;
  gap: 24px;
}

.tete h1 {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.intro,
.intro-bloc {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.92rem;
}

.entete-jauge {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.titre-jauge {
  margin: 0;
  font-weight: 700;
}

.jauge {
  height: 6px;
  border-radius: 3px;
  background: var(--surface-2);
  overflow: hidden;
  margin: 10px 0 0;
}

.jauge span {
  display: block;
  height: 100%;
  background: var(--dom);
  border-radius: 3px;
}

.manques {
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.6;
}

.bloc {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-carte);
  padding: 20px;
  display: grid;
  gap: 14px;
}

.bloc h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.grille {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  align-items: end;
}

.grille .large {
  grid-column: 1 / -1;
}

label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

label.case {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.aide {
  font-family: var(--sans);
  font-style: normal;
  font-size: 0.8rem;
  letter-spacing: normal;
  text-transform: none;
  color: var(--muted);
  line-height: 1.45;
}

input,
select {
  font-family: var(--sans);
  font-size: 0.92rem;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-champ);
  background: var(--ground);
  color: var(--ink);
}

input[type='checkbox'],
input[type='range'] {
  padding: 0;
}

input[type='checkbox'] {
  width: auto;
}

.creneaux,
.diplomes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.creneaux li {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.diplomes li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.diplomes li:last-child {
  border-bottom: 0;
}

.diplomes .copie {
  flex: 1;
  min-width: 160px;
}

.nom-diplome {
  margin: 0;
  font-weight: 700;
  font-size: 0.94rem;
}

.meta {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.retirer {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-champ);
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
}

.retirer:hover {
  border-color: var(--eta);
  color: var(--eta);
}

.actions-bloc,
.ajout {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}

.vide {
  margin: 0;
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.5;
}

.succes,
.erreur {
  margin: 0;
  padding: 11px 14px;
  font-size: 0.9rem;
  line-height: 1.5;
  border-radius: var(--r-champ);
}

.succes {
  background: var(--dom-soft);
  color: var(--dom);
}

.erreur {
  background: var(--eta-soft);
  color: var(--eta);
}
</style>

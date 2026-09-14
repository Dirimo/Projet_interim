<script setup lang="ts">
import { FILIERE_LIBELLES, inscriptionInterimaireSchema, type Filiere } from '@passerelle/shared';

useHead({ title: 'Inscription interimaire — Passerelle' });

const { inscrire } = useSession();

const form = reactive({
  nom: '',
  prenom: '',
  telephone: '',
  filieres: [] as Filiere[],
  adresse: '',
  codePostal: '',
  ville: '',
  rayonKm: 20,
  permisB: false,
  vehicule: false,
  email: '',
  motDePasse: '',
  confirmation: '',
});

const erreurs = ref<Record<string, string>>({});
const erreurGenerale = ref('');
const envoi = ref(false);

function corps() {
  return {
    interimaire: {
      nom: form.nom,
      prenom: form.prenom,
      telephone: form.telephone,
      filieres: form.filieres,
      adresse: form.adresse,
      codePostal: form.codePostal,
      ville: form.ville,
      rayonKm: Number(form.rayonKm),
      permisB: form.permisB,
      vehicule: form.vehicule,
    },
    compte: { email: form.email, motDePasse: form.motDePasse },
  };
}

async function soumettre(): Promise<void> {
  erreurs.value = {};
  erreurGenerale.value = '';

  if (form.motDePasse !== form.confirmation) {
    erreurs.value.confirmation = 'Les deux mots de passe different';
    return;
  }

  const verifie = inscriptionInterimaireSchema.safeParse(corps());

  if (!verifie.success) {
    for (const souci of verifie.error.issues) {
      erreurs.value[String(souci.path.at(-1))] = souci.message;
    }
    return;
  }

  envoi.value = true;

  try {
    await inscrire('interimaire', corps());
    await navigateTo('/mon-espace');
  } catch (cause) {
    const erreur = cause as { statusCode?: number; data?: { message?: string } };
    erreurGenerale.value =
      erreur.statusCode === 409
        ? (erreur.data?.message ?? 'Un compte existe deja pour cette adresse.')
        : 'Inscription impossible pour le moment. Reessayer dans un instant.';
  } finally {
    envoi.value = false;
  }
}
</script>

<template>
  <section class="inscription">
    <p class="fil"><NuxtLink to="/inscription">Inscription</NuxtLink> / Interimaire</p>
    <h1>Creer mon profil</h1>
    <p class="intro">
      Votre compte est cree immediatement. L'agence verifie ensuite vos diplomes avant de vous
      proposer des missions.
    </p>

    <form novalidate @submit.prevent="soumettre">
      <fieldset>
        <legend>Vous</legend>

        <div class="paire">
          <label>
            <span>Prenom</span>
            <input id="prenom" v-model="form.prenom" type="text" autocomplete="given-name" />
            <em v-if="erreurs.prenom">{{ erreurs.prenom }}</em>
          </label>

          <label>
            <span>Nom</span>
            <input id="nom" v-model="form.nom" type="text" autocomplete="family-name" />
            <em v-if="erreurs.nom">{{ erreurs.nom }}</em>
          </label>
        </div>

        <label>
          <span>Telephone</span>
          <input id="telephone" v-model="form.telephone" type="tel" autocomplete="tel" />
          <em v-if="erreurs.telephone">{{ erreurs.telephone }}</em>
        </label>
      </fieldset>

      <fieldset>
        <legend>Ou vous intervenez</legend>

        <p class="explication">
          Les deux filieres sont possibles : beaucoup d'intervenants font du domicile et de
          l'etablissement.
        </p>

        <div class="cases">
          <label v-for="(libelle, code) in FILIERE_LIBELLES" :key="code" class="case">
            <input :id="`filiere-${code}`" v-model="form.filieres" type="checkbox" :value="code" />
            <span>{{ libelle }}</span>
          </label>
        </div>
        <em v-if="erreurs.filieres">{{ erreurs.filieres }}</em>
      </fieldset>

      <fieldset>
        <legend>Votre secteur</legend>

        <label>
          <span>Adresse</span>
          <input id="adresse" v-model="form.adresse" type="text" autocomplete="street-address" />
          <em v-if="erreurs.adresse">{{ erreurs.adresse }}</em>
        </label>

        <div class="paire">
          <label>
            <span>Code postal</span>
            <input
              id="code-postal"
              v-model="form.codePostal"
              type="text"
              inputmode="numeric"
              autocomplete="postal-code"
            />
            <em v-if="erreurs.codePostal">{{ erreurs.codePostal }}</em>
          </label>

          <label>
            <span>Ville</span>
            <input id="ville" v-model="form.ville" type="text" autocomplete="address-level2" />
            <em v-if="erreurs.ville">{{ erreurs.ville }}</em>
          </label>
        </div>

        <label>
          <span>Rayon de deplacement : {{ form.rayonKm }} km</span>
          <input id="rayon" v-model.number="form.rayonKm" type="range" min="1" max="150" />
          <em v-if="erreurs.rayonKm">{{ erreurs.rayonKm }}</em>
        </label>

        <div class="cases">
          <label class="case">
            <input id="permis" v-model="form.permisB" type="checkbox" />
            <span>J'ai le permis B</span>
          </label>
          <label class="case">
            <input id="vehicule" v-model="form.vehicule" type="checkbox" />
            <span>J'ai un vehicule</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Le compte</legend>

        <label>
          <span>Adresse e-mail</span>
          <input id="email" v-model="form.email" type="email" autocomplete="email" />
          <em v-if="erreurs.email">{{ erreurs.email }}</em>
        </label>

        <label>
          <span>Mot de passe</span>
          <input
            id="mot-de-passe"
            v-model="form.motDePasse"
            type="password"
            autocomplete="new-password"
          />
          <em v-if="erreurs.motDePasse">{{ erreurs.motDePasse }}</em>
        </label>

        <label>
          <span>Confirmer le mot de passe</span>
          <input
            id="confirmation"
            v-model="form.confirmation"
            type="password"
            autocomplete="new-password"
          />
          <em v-if="erreurs.confirmation">{{ erreurs.confirmation }}</em>
        </label>
      </fieldset>

      <p v-if="erreurGenerale" class="erreur">{{ erreurGenerale }}</p>

      <button type="submit" :disabled="envoi">
        {{ envoi ? 'Creation...' : 'Creer mon profil' }}
      </button>
    </form>

    <p class="note">
      Aucune donnee de sante ne vous est demandee. L'agence enregistre seulement si vous etes
      deployable, jamais pourquoi.
    </p>
  </section>
</template>

<style scoped>
.inscription {
  max-width: 560px;
  margin: 0 auto;
  padding-block: 44px 0;
}

.fil {
  margin: 0 0 14px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

h1 {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.intro {
  margin: 0 0 22px;
  font-size: 0.92rem;
  color: var(--muted);
  line-height: 1.5;
}

form {
  display: grid;
  gap: 18px;
}

fieldset {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 18px 20px 20px;
  background: var(--surface);
  border: 1px solid var(--line);
}

legend {
  padding: 0 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eta);
}

label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.paire {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 460px) {
  .paire {
    grid-template-columns: 1fr;
  }
}

.explication {
  margin: 0;
  font-size: 0.84rem;
  color: var(--muted);
  line-height: 1.45;
}

.cases {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.case {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-family: var(--sans);
  font-size: 0.9rem;
  text-transform: none;
  letter-spacing: normal;
  color: var(--ink);
}

.case input {
  width: auto;
  padding: 0;
  accent-color: var(--eta);
}

input,
select {
  font-family: var(--sans);
  font-size: 0.92rem;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--ground);
  color: var(--ink);
  text-transform: none;
  letter-spacing: normal;
}

input[type='range'] {
  padding: 0;
  border: 0;
  background: transparent;
  accent-color: var(--eta);
}

em {
  font-family: var(--sans);
  font-style: normal;
  font-size: 0.82rem;
  letter-spacing: normal;
  text-transform: none;
  color: var(--eta);
}

button {
  font-family: var(--sans);
  font-size: 0.9rem;
  font-weight: 700;
  padding: 11px 18px;
  border: 0;
  border-radius: 3px;
  background: var(--eta);
  color: var(--surface);
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: progress;
}

.erreur {
  margin: 0;
  font-size: 0.88rem;
  color: var(--eta);
  padding: 9px 11px;
  background: var(--eta-soft);
  border-left: 3px solid var(--eta);
}

.note {
  margin-top: 20px;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
}
</style>

<script setup lang="ts">
import { inscriptionEntrepriseSchema } from '@releve/shared';

useHead({ title: 'Inscription entreprise — Relève' });

const { inscrire } = useSession();

const form = reactive({
  raisonSociale: '',
  siret: '',
  contactNom: '',
  contactTel: '',
  email: '',
  motDePasse: '',
  confirmation: '',
});

const erreurs = ref<Record<string, string>>({});
const erreurGenerale = ref('');
const envoi = ref(false);

function corps() {
  return {
    entreprise: {
      raisonSociale: form.raisonSociale,
      siret: form.siret,
      ...(form.contactNom ? { contactNom: form.contactNom } : {}),
      ...(form.contactTel ? { contactTel: form.contactTel } : {}),
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

  // Le meme schema que l'API : les messages affiches ici sont exactement ceux
  // qu'elle renverrait, sans les attendre.
  const verifie = inscriptionEntrepriseSchema.safeParse(corps());

  if (!verifie.success) {
    for (const souci of verifie.error.issues) {
      erreurs.value[String(souci.path.at(-1))] = souci.message;
    }
    return;
  }

  envoi.value = true;

  try {
    await inscrire('entreprise', corps());
    await navigateTo('/mon-espace');
  } catch (cause) {
    const erreur = cause as { statusCode?: number; data?: { message?: string } };
    erreurGenerale.value =
      erreur.statusCode === 409
        ? (erreur.data?.message ?? 'Cette entreprise est deja inscrite.')
        : 'Inscription impossible pour le moment. Reessayer dans un instant.';
  } finally {
    envoi.value = false;
  }
}
</script>

<template>
  <section class="inscription">
    <p class="fil"><NuxtLink to="/inscription">Inscription</NuxtLink> / Entreprise</p>
    <h1>Inscrire mon service</h1>
    <p class="intro">
      Votre compte est cree immediatement. L'agence valide ensuite le service avant votre premier
      depot de besoin.
    </p>

    <form novalidate @submit.prevent="soumettre">
      <fieldset>
        <legend>Le service</legend>

        <label>
          <span>Raison sociale</span>
          <input id="raison-sociale" v-model="form.raisonSociale" type="text" required />
          <em v-if="erreurs.raisonSociale">{{ erreurs.raisonSociale }}</em>
        </label>

        <label>
          <span>SIRET</span>
          <input
            id="siret"
            v-model="form.siret"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="14 chiffres"
            required
          />
          <em v-if="erreurs.siret">{{ erreurs.siret }}</em>
        </label>

        <p class="perimetre">
          La plateforme ne travaille qu'avec des services d'aide et d'accompagnement a domicile
          (SAAD). Le type n'est donc pas a choisir.
        </p>
      </fieldset>

      <fieldset>
        <legend>Le contact</legend>

        <label>
          <span>Nom du contact</span>
          <input id="contact-nom" v-model="form.contactNom" type="text" autocomplete="name" />
          <em v-if="erreurs.contactNom">{{ erreurs.contactNom }}</em>
        </label>

        <label>
          <span>Telephone</span>
          <input id="contact-tel" v-model="form.contactTel" type="tel" autocomplete="tel" />
          <em v-if="erreurs.contactTel">{{ erreurs.contactTel }}</em>
        </label>
      </fieldset>

      <fieldset>
        <legend>Le compte</legend>

        <label>
          <span>Adresse e-mail</span>
          <input id="email" v-model="form.email" type="email" autocomplete="email" required />
          <em v-if="erreurs.email">{{ erreurs.email }}</em>
        </label>

        <label>
          <span>Mot de passe</span>
          <input
            id="mot-de-passe"
            v-model="form.motDePasse"
            type="password"
            autocomplete="new-password"
            required
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
            required
          />
          <em v-if="erreurs.confirmation">{{ erreurs.confirmation }}</em>
        </label>
      </fieldset>

      <p v-if="erreurGenerale" class="erreur">{{ erreurGenerale }}</p>

      <button type="submit" :disabled="envoi">
        {{ envoi ? 'Creation...' : 'Creer le compte' }}
      </button>
    </form>

    <p class="note">
      La convention collective applicable est renseignee par l'agence : c'est elle qui fixe le
      salaire de reference des interimaires mis a disposition.
    </p>
  </section>
</template>

<style scoped>
.inscription {
  max-width: 520px;
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
  border-radius: 0;
}

legend {
  padding: 0 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dom);
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

.perimetre {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
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
  background: var(--dom);
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

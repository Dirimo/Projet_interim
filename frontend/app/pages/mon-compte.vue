<script setup lang="ts">
import { MOT_DE_PASSE_LONGUEUR_MIN, ROLE_LIBELLES } from '@passerelle/shared';

const { requete } = useApi();
const { utilisateur } = useSession();

const ancien = ref('');
const nouveau = ref('');
const confirmation = ref('');

const message = ref('');
const succes = ref('');
const enCours = ref(false);

async function changer(): Promise<void> {
  message.value = '';
  succes.value = '';

  if (nouveau.value !== confirmation.value) {
    message.value = 'Les deux saisies du nouveau mot de passe different.';
    return;
  }

  enCours.value = true;

  try {
    await requete<void>('/auth/mot-de-passe', {
      method: 'POST',
      body: { ancien: ancien.value, nouveau: nouveau.value },
    });

    ancien.value = '';
    nouveau.value = '';
    confirmation.value = '';
    succes.value = 'Mot de passe change.';
  } catch (cause) {
    const corps = (
      cause as { data?: { message?: string; erreurs?: { champ: string; message: string }[] } }
    ).data;

    message.value = corps?.erreurs?.length
      ? corps.erreurs.map((e) => `${e.champ} : ${e.message}`).join(' · ')
      : (corps?.message ?? 'Erreur inattendue');
  } finally {
    enCours.value = false;
  }
}
</script>

<template>
  <section class="mon-compte">
    <h1>Mon compte</h1>

    <p v-if="utilisateur" class="identite">
      {{ utilisateur.email }} &middot; {{ ROLE_LIBELLES[utilisateur.role] }}
    </p>

    <form class="bloc" @submit.prevent="changer()">
      <h2>Changer mon mot de passe</h2>

      <p v-if="message" class="alerte">{{ message }}</p>
      <p v-if="succes" class="succes">{{ succes }}</p>

      <label>
        <span>Mot de passe actuel</span>
        <input
          id="ancien"
          v-model="ancien"
          type="password"
          autocomplete="current-password"
          required
        />
      </label>

      <label>
        <span>Nouveau mot de passe ({{ MOT_DE_PASSE_LONGUEUR_MIN }} caracteres minimum)</span>
        <input
          id="nouveau"
          v-model="nouveau"
          type="password"
          autocomplete="new-password"
          :minlength="MOT_DE_PASSE_LONGUEUR_MIN"
          required
        />
      </label>

      <label>
        <span>Confirmer le nouveau mot de passe</span>
        <input
          id="confirmation"
          v-model="confirmation"
          type="password"
          autocomplete="new-password"
          :minlength="MOT_DE_PASSE_LONGUEUR_MIN"
          required
        />
      </label>

      <button type="submit" :disabled="enCours">
        {{ enCours ? 'Enregistrement...' : 'Changer le mot de passe' }}
      </button>

      <p class="note">
        Les sessions deja ouvertes ailleurs restent valables jusqu a expiration de leur jeton, soit
        quinze minutes. En cas de compte compromis, demander en plus a un administrateur de
        desactiver le compte.
      </p>
    </form>
  </section>
</template>

<style scoped>
.mon-compte {
  max-width: 460px;
  padding-block: 32px 0;
}

h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

h2 {
  margin: 0 0 14px;
  font-size: 1rem;
  font-weight: 700;
}

.identite {
  margin: 0 0 22px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

.bloc {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
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

input {
  font-family: var(--sans);
  font-size: 0.92rem;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--ground);
  color: var(--ink);
}

button {
  font-family: var(--sans);
  font-size: 0.9rem;
  font-weight: 700;
  padding: 10px 18px;
  border: 0;
  border-radius: 3px;
  background: var(--dom);
  color: var(--surface);
  cursor: pointer;
  justify-self: start;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.note {
  margin: 0;
  font-size: 0.84rem;
  color: var(--muted);
}

.alerte,
.succes {
  margin: 0;
  font-size: 0.9rem;
  padding: 10px 12px;
  background: var(--eta-soft);
  border-left: 3px solid var(--eta);
  color: var(--ink);
}

.succes {
  background: var(--dom-soft);
  border-left-color: var(--dom);
}
</style>

<script setup lang="ts">
useHead({ title: 'Connexion - Relève' });

import { CODE_EMAIL_NON_VERIFIE } from '@releve/shared';

const { connexion, renvoyerVerification } = useSession();

const email = ref('');
const motDePasse = ref('');
const erreur = ref('');
const envoi = ref(false);

/**
 * Vrai quand le mot de passe etait bon mais l'adresse jamais confirmee. Distinct
 * d'`erreur` parce que la conduite a tenir n'est pas la meme : il n'y a rien a
 * corriger dans le formulaire, seulement un lien a rouvrir.
 */
const adresseNonConfirmee = ref(false);
const renvoi = ref(false);
const renvoye = ref(false);

async function soumettre(): Promise<void> {
  erreur.value = '';
  adresseNonConfirmee.value = false;
  renvoye.value = false;
  envoi.value = true;

  try {
    await connexion(email.value, motDePasse.value);
    await navigateTo('/');
  } catch (cause) {
    const reponse = cause as { statusCode?: number; data?: { code?: string; message?: string } };

    if (reponse.data?.code === CODE_EMAIL_NON_VERIFIE) {
      adresseNonConfirmee.value = true;
      erreur.value = reponse.data.message ?? "Votre adresse n'a pas encore ete confirmee.";
    } else if (reponse.statusCode === 401) {
      erreur.value = 'Identifiants invalides.';
    } else {
      erreur.value = "API injoignable. Verifier que l'API tourne (pnpm dev:backend).";
    }
  } finally {
    envoi.value = false;
  }
}

async function renvoyer(): Promise<void> {
  renvoi.value = true;
  await renvoyerVerification(email.value).catch(() => undefined);
  renvoi.value = false;
  renvoye.value = true;
}
</script>

<template>
  <section class="connexion">
    <!-- Le bloc de marque du Figma n'est pas repris : l'entete du site affiche
         deja « Relève » juste au-dessus. -->
    <p class="accroche">Le soin, sans attendre</p>
    <h1>Ravi de vous revoir</h1>
    <p class="intro">
      Retrouvez vos missions, vos disponibilites et vos echanges la ou vous les aviez laisses.
    </p>

    <!--
      La maquette ne dessine que deux rectangles vides : ils sont repris ici en
      vrais champs, avec un libelle masque pour les lecteurs d'ecran, puisque le
      design ne prevoit aucune place pour un libelle visible.
    -->
    <AppCarte class="formulaire">
      <form @submit.prevent="soumettre">
        <label class="champ">
          <span class="sr-only">Adresse e-mail</span>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="Adresse e-mail"
            required
          />
        </label>

        <label class="champ">
          <span class="sr-only">Mot de passe</span>
          <input
            id="mot-de-passe"
            v-model="motDePasse"
            type="password"
            autocomplete="current-password"
            placeholder="Mot de passe"
            required
          />
        </label>

        <p v-if="erreur" class="erreur">{{ erreur }}</p>

        <p v-if="renvoye" class="confirme" role="status">
          Un nouveau lien de confirmation vient de partir vers cette adresse.
        </p>

        <AppBouton
          v-else-if="adresseNonConfirmee"
          type="button"
          variante="secondaire"
          :desactive="renvoi"
          @click="renvoyer"
        >
          {{ renvoi ? 'Envoi...' : 'Renvoyer le lien de confirmation' }}
        </AppBouton>

        <AppBouton type="submit" :desactive="envoi">
          {{ envoi ? 'Connexion...' : 'Se connecter' }}
        </AppBouton>
      </form>
    </AppCarte>

    <AppBouton variante="secondaire" to="/inscription" class="inscrire">S'inscrire</AppBouton>

    <p class="legal">
      En continuant, vous acceptez nos <a href="#">conditions d'utilisation</a> et notre
      <a href="#">politique de confidentialite</a>.
    </p>

    <p class="aide">
      Demonstration : <code>admin@releve.example</code> / <code>Releve2026!</code> apres
      <code>pnpm db:seed</code>.
    </p>
  </section>
</template>

<style scoped>
.connexion {
  max-width: 420px;
  margin: 0 auto;
  padding-block: 48px 0;
}

.accroche {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--eta);
}

h1 {
  margin: 0 0 12px;
  font-size: 30px;
  font-weight: 400;
  line-height: 1.12;
}

.intro {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

.formulaire {
  padding: 20px;
}

form {
  display: grid;
  gap: 14px;
}

.champ {
  display: block;
}

input {
  width: 100%;
  height: 48px;
  padding-inline: 14px;
  font-family: var(--sans);
  font-size: 14px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-champ);
}

input::placeholder {
  color: var(--muted);
  opacity: 0.55;
}

input:focus-visible {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.erreur {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--eta);
  background: var(--eta-soft);
  border-radius: var(--r-champ);
}

.confirme {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  background: var(--dom-soft, #e6f4f1);
  border-radius: var(--r-champ);
}

.inscrire {
  margin-top: 12px;
}

.legal,
.aide {
  margin: 14px 0 0;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  color: var(--muted);
}

.legal a {
  color: inherit;
}

code {
  font-family: var(--mono);
  font-size: 0.95em;
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

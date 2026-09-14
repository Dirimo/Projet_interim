<script setup lang="ts">
useHead({ title: 'Inscription - Relève' });

/**
 * Les deux cartes du Figma mappent les deux parcours deja routes : le profil
 * soignant mene au formulaire interimaire, l'etablissement au formulaire
 * entreprise. La maquette ne dessine aucune carte selectionnee au chargement,
 * d'ou le choix nul et le bouton inactif tant que rien n'est coche.
 */
type Parcours = 'interimaire' | 'entreprise';

const choix = ref<Parcours | null>(null);

async function continuer(): Promise<void> {
  if (!choix.value) return;
  await navigateTo(`/inscription/${choix.value}`);
}
</script>

<template>
  <section class="inscription">
    <p class="accroche">Le soin, sans attendre</p>
    <h1>Quel type de profil etes-vous ?</h1>
    <p class="intro">
      Une mise en relation rapide, humaine et securisee pour les remplacements urgents.
    </p>

    <fieldset class="profils">
      <legend class="sr-only">Type de profil</legend>

      <label class="profil" :class="{ actif: choix === 'interimaire' }">
        <input v-model="choix" class="sr-only" type="radio" name="parcours" value="interimaire" />
        <span class="tuile"><AppIcon nom="ambulance" :taille="24" /></span>
        <span class="copie">
          <span class="titre">Je suis aide-soignant&middot;e</span>
          <span class="detail">Je trouve des missions adaptees a mes disponibilites.</span>
        </span>
        <AppIcon
          class="puce"
          :nom="choix === 'interimaire' ? 'check-circle' : 'circle'"
          :taille="20"
        />
      </label>

      <label class="profil" :class="{ actif: choix === 'entreprise' }">
        <input v-model="choix" class="sr-only" type="radio" name="parcours" value="entreprise" />
        <span class="tuile"><AppIcon nom="hospital" :taille="24" /></span>
        <span class="copie">
          <span class="titre">Je represente un etablissement</span>
          <span class="detail">EHPAD ou organisme : je publie un besoin de remplacement.</span>
        </span>
        <AppIcon
          class="puce"
          :nom="choix === 'entreprise' ? 'check-circle' : 'circle'"
          :taille="20"
        />
      </label>
    </fieldset>

    <div class="actions">
      <AppBouton icone="arrow-right" :desactive="!choix" @click="continuer()">Continuer</AppBouton>

      <p class="legal">
        En continuant, vous acceptez nos <a href="#">conditions d'utilisation</a> et notre
        <a href="#">politique de confidentialite</a>.
      </p>

      <p class="retour">Deja inscrit ? <NuxtLink to="/connexion">Se connecter</NuxtLink></p>
    </div>
  </section>
</template>

<style scoped>
.inscription {
  max-width: 760px;
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
  margin: 0 0 28px;
  max-width: 46ch;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
}

/* Les deux cartes sont empilees dans le Figma ; l'espace disponible sur le web
 * permet de les mettre cote a cote des que la largeur le supporte. */
.profils {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.profil {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-carte);
  cursor: pointer;
}

/* La maquette ne fournit que l'etat non selectionne : l'etat actif reprend le
 * vert de marque, deja porte par la puce cochee. */
.profil.actif {
  border-color: var(--dom);
}

.profil:focus-within {
  outline: 2px solid var(--dom);
  outline-offset: 2px;
}

.tuile {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--dom);
  background: var(--dom-soft);
  border-radius: var(--r-tuile);
}

.copie {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.titre {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.detail {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
}

.puce {
  color: var(--line);
}

.profil.actif .puce {
  color: var(--dom);
}

.actions {
  max-width: 342px;
  margin-top: 28px;
}

.legal,
.retour {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  color: var(--muted);
}

.legal a {
  color: inherit;
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

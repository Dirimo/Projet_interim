<script setup lang="ts">
useHead({ title: 'Inscription - Relève' });

/**
 * Un seul parcours public.
 *
 * Le canvas enchaine directement sur le formulaire candidat : il ne dessine pas
 * cet ecran de choix. Il est garde parce qu'il porte ce que le canvas ne dit
 * pas — qu'un etablissement ne s'inscrit pas seul. Seule la mise en forme suit
 * desormais le canvas.
 *
 * L'ancienne maquette dessinait deux cartes, dont une pour l'etablissement.
 * Elle a ete retiree : un ESMS est cree par l'agence, apres lecture de sa
 * declaration SAP, de son agrement ou de son arrete d'autorisation. Ces pieces
 * engagent juridiquement, et une structure qui se declarerait autorisee sans
 * que personne n'ouvre l'arrete ne serait pas verifiee du tout.
 *
 * La case a cocher disparait avec elle : choisir entre une seule chose n'est
 * pas un choix, et un bouton « Continuer » desactive tant qu'on n'a pas coche
 * l'unique option ne serait qu'un obstacle. La carte mene directement au
 * formulaire.
 */
</script>

<template>
  <section class="inscription">
    <p class="accroche">Le soin, sans attendre</p>
    <h1>Quel type de profil êtes-vous ?</h1>
    <p class="intro">
      Une mise en relation rapide, humaine et sécurisée pour les remplacements urgents.
    </p>

    <NuxtLink class="profil" to="/inscription/interimaire">
      <span class="tuile"><AppIcon nom="ambulance" :taille="24" /></span>
      <span class="copie">
        <span class="titre">Candidat / aide à domicile</span>
        <span class="detail">Je trouve des missions adaptées à mes disponibilités.</span>
      </span>
      <AppIcon class="fleche" nom="arrow-right" :taille="20" />
    </NuxtLink>

    <p class="structure">
      Vous représentez un service d'aide à domicile ? Votre structure est enregistrée par nos
      équipes, après vérification de votre déclaration SAP ou de votre autorisation.
      <a href="mailto:contact@releve.example">Écrivez-nous</a>.
    </p>

    <p class="deja">
      Déjà inscrit ?
      <NuxtLink to="/connexion">Connectez-vous</NuxtLink>
    </p>

    <p class="legal">
      En continuant, vous acceptez nos <a href="#">conditions d'utilisation</a> et notre
      <a href="#">politique de confidentialité</a>.
    </p>
  </section>
</template>

<style scoped>
.inscription {
  padding-inline: 28px;
  max-width: 720px;
  margin: 0 auto;
  padding-block: 56px 100px;
}

.accroche {
  margin: 0 0 14px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--eta);
}

h1 {
  margin: 0 0 10px;
  font-size: clamp(30px, 6vw, 40px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.intro {
  max-width: 46ch;
  margin: 0 0 30px;
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--muted);
}

.profil {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 24px;
  color: inherit;
  text-decoration: none;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.profil:hover {
  border-color: var(--dom);
}

.profil:focus-visible {
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
  background: var(--surface-2);
  border-radius: var(--r-tuile);
}

.copie {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.titre {
  font-size: 17px;
  font-weight: 600;
}

.detail {
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

.fleche {
  color: var(--muted);
}

.profil:hover .fleche {
  color: var(--dom);
}

.structure {
  max-width: 62ch;
  margin: 26px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--muted);
}

.structure a {
  color: var(--dom);
}

.deja {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.deja a {
  font-weight: 600;
  color: var(--dom);
  text-decoration: underline;
}

.legal {
  margin: 18px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
}

.legal a {
  color: inherit;
  text-decoration: underline;
}

@media (max-width: 560px) {
.inscription {
    padding-inline: 20px;
  }
}
</style>

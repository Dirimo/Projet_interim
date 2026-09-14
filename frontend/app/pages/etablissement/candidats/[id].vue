<script setup lang="ts">
import { trouverCandidat } from '~/data/missions-demo';

const route = useRoute();

const candidat = computed(() => trouverCandidat(String(route.params.id)));

if (!candidat.value) {
  throw createError({ statusCode: 404, statusMessage: 'Candidat introuvable', fatal: true });
}

useHead({ title: () => `${candidat.value?.nom ?? 'Candidat'} - Passerelle` });

const confirme = ref(false);
</script>

<template>
  <section v-if="candidat" class="profil">
    <!-- Le « ••• » du design ouvre un menu qui n'est pas dessine : la barre est
         reprise sans action plutot qu'avec un bouton sans contenu. -->
    <AppBarreApp titre="Profil candidat" />

    <div class="corps">
      <header class="identite">
        <AppAvatar :initiales="candidat.initiales" teinte="lavande" />
        <div class="copie">
          <h1>{{ candidat.nom }}</h1>
          <p class="qualification">{{ candidat.qualification }}</p>
          <div class="etiquettes">
            <AppBadge v-for="etiquette in candidat.etiquettes" :key="etiquette" teinte="vert">
              {{ etiquette }}
            </AppBadge>
          </div>
        </div>
      </header>

      <AppCarte variante="pleine" class="correspondance">
        <p class="score">{{ candidat.score }}%</p>
        <div>
          <p class="titre-score">{{ candidat.correspondance }}</p>
          <p class="justification">{{ candidat.justification }}</p>
        </div>
      </AppCarte>

      <AppCarte class="atouts">
        <div v-for="point in candidat.pointsForts" :key="point.libelle" class="atout">
          <AppIcon :nom="point.icone" :taille="18" />
          <div>
            <p class="libelle">{{ point.libelle }}</p>
            <p class="valeur">{{ point.valeur }}</p>
          </div>
        </div>
      </AppCarte>

      <section class="message">
        <h2>Message</h2>
        <p class="citation">{{ candidat.message }}</p>
      </section>

      <div class="actions">
        <AppBouton icone="check" :desactive="confirme" @click="confirme = true">
          {{ confirme ? 'Confirmation enregistree' : `Confirmer ${candidat.prenom}` }}
        </AppBouton>

        <!-- La messagerie n'existe pas encore cote produit. -->
        <AppBouton variante="secondaire" icone="message-circle" desactive>
          Echanger avant de confirmer
        </AppBouton>

        <p v-if="confirme" class="avertissement" role="status">
          Confirmation gardee dans la page : le domaine « mission » n'est pas encore expose par
          l'API.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profil {
  padding-block: 16px 0;
}

.corps {
  max-width: 640px;
  padding-top: 12px;
}

.identite {
  display: flex;
  gap: 14px;
  align-items: center;
}

.copie {
  flex: 1;
  min-width: 0;
}

h1 {
  margin: 0 0 4px;
  font-size: 21px;
  font-weight: 400;
}

.qualification {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--muted);
}

.etiquettes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.correspondance {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 18px;
  padding: 16px;
  border-radius: var(--r-carte);
}

.score {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  margin: 0;
  font-size: 18px;
  color: var(--dom-fonce);
  background: var(--dom-soft);
  border-radius: 999px;
}

.titre-score {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
}

.justification {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--dom-contraste);
}

.atouts {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.atout {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--dom);
}

.libelle {
  margin: 0 0 2px;
  font-size: 11px;
  color: var(--muted);
}

.valeur {
  margin: 0;
  font-size: 14px;
  color: var(--ink);
}

.message {
  margin-top: 18px;
}

h2 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
}

.citation {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
}

.actions {
  display: grid;
  gap: 10px;
  max-width: 360px;
  margin-top: 24px;
}

.avertissement {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
</style>

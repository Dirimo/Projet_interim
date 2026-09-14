<script setup lang="ts">
import type { MissionDetail, PropositionResume } from '@releve/shared';
import type { NomIcone } from '~/types/icone';

const route = useRoute();
const { requete } = useApi();

const identifiant = String(route.params.id);

const { data: donnees } = await useAsyncData(`mission:${identifiant}`, () =>
  requete<MissionDetail>(`/missions/${identifiant}`),
);

if (!donnees.value) {
  throw createError({ statusCode: 404, statusMessage: 'Mission introuvable', fatal: true });
}

/** Adaptation vers ce que la fiche du Figma affiche. */
const mission = computed(() => {
  const detail = donnees.value;
  if (!detail) return undefined;

  return {
    id: detail.id,
    etablissement: {
      nom: detail.client.raisonSociale,
      initiales: initiales(detail.client.raisonSociale),
      localisation: `${detail.lieu.libelle} · ${detail.lieu.ville}`,
    },
    urgente: ["Aujourd'hui", 'Demain'].includes(jourCourt(detail.dateDebut)),
    // La categorie du Figma etait un type d'etablissement. Le perimetre etant
    // reduit aux SAAD, c'est le diplome exige qui porte l'information utile.
    categorie: detail.qualificationRequise.code,
    description: detail.description ?? detail.motifRecours,
    prerequis: detail.prerequis,
    dejaPostule: detail.dejaPostule,
  };
});

useHead({ title: () => `${mission.value?.etablissement.nom ?? 'Mission'} - Relève` });

/** Les quatre lignes de la carte « informations essentielles » du Figma. */
const informations = computed<readonly { icone: NomIcone; libelle: string; valeur: string }[]>(
  () => {
    const detail = donnees.value;
    if (!detail) return [];

    return [
      { icone: 'calendar', libelle: 'Date', valeur: dateComplete(detail.dateDebut) },
      {
        icone: 'clock',
        libelle: 'Horaires',
        valeur: `${horaires(detail.heureDebut, detail.heureFin)} - ${dureeLisible(detail.dureeHeures)}`,
      },
      {
        icone: 'euro',
        libelle: 'Remuneration indicative',
        valeur: remuneration(detail.tauxHoraire),
      },
      { icone: 'map-pin', libelle: 'Lieu', valeur: detail.adresse },
    ];
  },
);

const envoi = ref(false);
const erreur = ref('');

/**
 * La candidature est un appel API, pas un lien.
 *
 * La porte d'eligibilite est cote serveur : elle repond 403 avec le motif exact
 * - diplome manquant, profil pas encore valide, filiere absente. On l'affiche
 * tel quel plutot qu'un message generique, parce que le candidat doit savoir ce
 * qui lui manque.
 */
async function candidater(): Promise<void> {
  erreur.value = '';
  envoi.value = true;

  try {
    await requete<PropositionResume>(`/missions/${identifiant}/candidatures`, { method: 'POST' });
    await navigateTo(`/candidature/${identifiant}`);
  } catch (cause) {
    const corps = (cause as { data?: { message?: string } }).data;
    erreur.value = corps?.message ?? 'Candidature impossible pour le moment.';
  } finally {
    envoi.value = false;
  }
}

const partage = ref('');

/**
 * « Partager » n'a pas de cible dans la maquette. Sur le web, la reponse
 * evidente est l'adresse de la page : on passe par le partage natif quand le
 * navigateur le propose, par le presse-papiers sinon.
 */
async function partager(): Promise<void> {
  const lien = window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: lien });
      return;
    }

    await navigator.clipboard.writeText(lien);
    partage.value = 'Lien copie.';
  } catch {
    // Partage annule par la personne, ou presse-papiers refuse : rien a signaler.
    partage.value = '';
  }
}
</script>

<template>
  <section v-if="mission" class="detail">
    <AppBarreApp titre="Detail de la mission" action="Partager" @action="partager()" />

    <div class="corps">
      <header class="etablissement">
        <AppAvatar :initiales="mission.etablissement.initiales" />
        <div class="copie">
          <div class="etiquettes">
            <AppBadge v-if="mission.urgente" teinte="corail">Urgent</AppBadge>
            <AppBadge v-if="mission.categorie" teinte="vert">{{ mission.categorie }}</AppBadge>
          </div>
          <h1>{{ mission.etablissement.nom }}</h1>
          <p class="lieu">{{ mission.etablissement.localisation }}</p>
        </div>
      </header>

      <p v-if="partage" class="partage" role="status">{{ partage }}</p>

      <AppCarte class="essentiel">
        <div v-for="information in informations" :key="information.libelle" class="information">
          <span class="tuile"><AppIcon :nom="information.icone" :taille="17" /></span>
          <div>
            <p class="libelle">{{ information.libelle }}</p>
            <p class="valeur">{{ information.valeur }}</p>
          </div>
        </div>
      </AppCarte>

      <section class="bloc">
        <h2>Votre mission</h2>
        <p class="texte">{{ mission.description }}</p>
      </section>

      <section class="bloc">
        <h2>Prerequis</h2>
        <div class="etiquettes">
          <AppBadge
            v-for="prerequis in mission.prerequis"
            :key="prerequis.libelle"
            :teinte="prerequis.verifie ? 'vert' : 'neutre'"
          >
            {{ prerequis.libelle }}
          </AppBadge>
        </div>
      </section>

      <div class="actions">
        <p v-if="erreur" class="refus" role="alert">{{ erreur }}</p>

        <AppBouton v-if="mission.dejaPostule" icone="check" to="/suivi">
          Candidature envoyee - voir le suivi
        </AppBouton>
        <AppBouton v-else icone="send" :desactive="envoi" @click="candidater()">
          {{ envoi ? 'Envoi...' : 'Je candidate a cette mission' }}
        </AppBouton>

        <p class="reassurance">L etablissement repond generalement dans la journee</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail {
  padding-block: 16px 0;
}

.corps {
  max-width: 640px;
  padding-top: 12px;
}

.etablissement {
  display: flex;
  gap: 12px;
  align-items: center;
}

.copie {
  flex: 1;
  min-width: 0;
}

.etiquettes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

h1 {
  margin: 4px 0 0;
  font-size: 21px;
  font-weight: 400;
}

.lieu {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.partage {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--dom);
}

.essentiel {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.information {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tuile {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--dom);
  background: var(--dom-soft);
  border-radius: 10px;
}

.libelle {
  margin: 0 0 2px;
  font-size: 11px;
  color: var(--muted);
}

.valeur {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.bloc {
  margin-top: 20px;
}

h2 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
}

.texte {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}

.actions {
  max-width: 360px;
  margin-top: 28px;
}

.refus {
  margin: 0 0 4px;
  padding: 10px 12px;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--eta);
  background: var(--eta-soft);
  border-radius: var(--r-champ);
}

.reassurance {
  margin: 10px 0 0;
  font-size: 11px;
  text-align: center;
  color: var(--muted);
}
</style>

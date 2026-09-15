import type { ReponseInscription } from '@releve/shared';

const PARCOURS = new Set(['entreprise', 'interimaire']);

/**
 * Inscription des deux profils.
 *
 * Contrairement a la connexion, ce relais ne pose aucun cookie : une
 * inscription n'ouvre plus de session. C'est le lien recu par courriel qui le
 * fait, via `/bff/auth/verification/confirmer`. La reponse ne porte donc rien
 * d'autre que l'adresse a afficher sur l'ecran d'attente.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const profil = getRouterParam(event, 'profil') ?? '';

  // La liste est close cote relais : sans elle, le segment d'URL serait
  // recopie tel quel dans l'appel a l'API.
  if (!PARCOURS.has(profil)) {
    throw createError({ statusCode: 404, statusMessage: 'Parcours d inscription inconnu' });
  }

  const donnees = await readBody<Record<string, unknown>>(event);

  try {
    const reponse = await $fetch<ReponseInscription>(
      `${config.apiBase}/auth/inscription/${profil}`,
      { method: 'POST', body: donnees },
    );

    setResponseStatus(event, 201);

    return reponse;
  } catch (cause) {
    return relayerErreur(event, cause);
  }
});

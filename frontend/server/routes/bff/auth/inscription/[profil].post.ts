import type { ReponseConnexion, UtilisateurSession } from '@releve/shared';

const PARCOURS = new Set(['entreprise', 'interimaire']);

/**
 * Inscription des deux profils, par le meme relais que la connexion : elle
 * ouvre une session, donc elle pose les memes cookies `httpOnly`. La page ne
 * voit jamais de jeton, ici comme ailleurs.
 */
export default defineEventHandler(async (event): Promise<UtilisateurSession | unknown> => {
  const config = useRuntimeConfig();
  const profil = getRouterParam(event, 'profil') ?? '';

  // La liste est close cote relais : sans elle, le segment d'URL serait
  // recopie tel quel dans l'appel a l'API.
  if (!PARCOURS.has(profil)) {
    throw createError({ statusCode: 404, statusMessage: 'Parcours d inscription inconnu' });
  }

  const donnees = await readBody<Record<string, unknown>>(event);

  try {
    const reponse = await $fetch<ReponseConnexion>(
      `${config.apiBase}/auth/inscription/${profil}`,
      { method: 'POST', body: donnees },
    );

    poserCookies(event, reponse);
    setResponseStatus(event, 201);

    return reponse.utilisateur;
  } catch (cause) {
    return relayerErreur(event, cause);
  }
});

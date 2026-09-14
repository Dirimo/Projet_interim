interface OptionsRequete {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

/**
 * Appel API, via le relais Nitro.
 *
 * `useRequestFetch` reporte les cookies de la requete entrante sur l'appel
 * interne : sans lui, un rendu serveur partirait sans session et toutes les
 * pages s'afficheraient vides au premier chargement.
 */
export function useApi() {
  const requeteAvecCookies = useRequestFetch();
  const { oublier } = useSession();

  async function requete<T>(chemin: string, options: OptionsRequete = {}): Promise<T> {
    try {
      return await requeteAvecCookies<T>(`/bff${chemin}`, {
        method: options.method ?? 'GET',
        query: options.query,
        body: options.body,
      });
    } catch (cause) {
      if ((cause as { statusCode?: number }).statusCode === 401) {
        // Session morte : on repasse par le formulaire plutot que d'afficher une
        // liste vide, qui ressemblerait a un referentiel sans donnee.
        oublier();
        await navigateTo('/connexion');
      }

      throw cause;
    }
  }

  return { requete };
}

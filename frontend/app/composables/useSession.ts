import type { UtilisateurSession } from '@passerelle/shared';

/**
 * Session partagee par toute l'application.
 *
 * Le front ne detient aucun jeton : ils vivent dans des cookies `httpOnly` que
 * seul Nitro sait lire, et c'est le relais /bff qui les presente a l'API. Ce
 * composable ne connait donc que l'identite de la personne connectee.
 */
export function useSession() {
  const utilisateur = useState<UtilisateurSession | null>('passerelle:utilisateur', () => null);
  const requeteAvecCookies = useRequestFetch();

  const connecte = computed(() => utilisateur.value !== null);

  async function connexion(email: string, motDePasse: string): Promise<void> {
    utilisateur.value = await $fetch<UtilisateurSession>('/bff/auth/connexion', {
      method: 'POST',
      body: { email, motDePasse },
    });
  }

  /**
   * Inscription des deux profils. Elle ouvre une session comme la connexion :
   * le compte existe des la validation du formulaire, c'est la fiche qui attend
   * l'agence, pas l'acces.
   */
  async function inscrire(
    parcours: 'entreprise' | 'interimaire',
    donnees: Record<string, unknown>,
  ): Promise<void> {
    utilisateur.value = await $fetch<UtilisateurSession>(`/bff/auth/inscription/${parcours}`, {
      method: 'POST',
      body: donnees,
    });
  }

  /** Relit la session depuis l'API ; laisse `utilisateur` a null si elle est morte. */
  async function rafraichir(): Promise<void> {
    try {
      utilisateur.value = await requeteAvecCookies<UtilisateurSession>('/bff/auth/moi');
    } catch {
      utilisateur.value = null;
    }
  }

  async function deconnexion(): Promise<void> {
    await $fetch('/bff/auth/deconnexion', { method: 'POST' }).catch(() => undefined);
    utilisateur.value = null;
  }

  /** Oubli local, sans appel reseau : la session est deja morte cote serveur. */
  function oublier(): void {
    utilisateur.value = null;
  }

  return { utilisateur, connecte, connexion, inscrire, rafraichir, deconnexion, oublier };
}

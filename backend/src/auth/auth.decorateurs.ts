import {
  createParamDecorator,
  ForbiddenException,
  SetMetadata,
  UnauthorizedException,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { RoleUtilisateur, UtilisateurSession } from '@releve/shared';
import type { RequeteAuthentifiee } from './auth.types';

export const CLE_PUBLIC = 'releve:public';
export const CLE_ROLES = 'releve:roles';

/** Route accessible sans jeton (connexion, sonde de sante). */
export const Public = (): CustomDecorator<string> => SetMetadata(CLE_PUBLIC, true);

/** Restreint la route aux roles listes. Sans decorateur, tout role authentifie passe. */
export const Roles = (...roles: RoleUtilisateur[]): CustomDecorator<string> =>
  SetMetadata(CLE_ROLES, roles);

function sessionDeLaRequete(contexte: ExecutionContext): UtilisateurSession {
  const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();

  if (!requete.utilisateur) {
    throw new UnauthorizedException('Session absente');
  }

  return requete.utilisateur;
}

export const UtilisateurCourant = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): UtilisateurSession =>
    sessionDeLaRequete(contexte),
);

/**
 * Agence de l'utilisateur connecte. Tout ce qui est back-office passe par la :
 * le cloisonnement multi-agence est ainsi impossible a oublier dans un service.
 */
export const AgenceCourante = createParamDecorator(
  (_donnees: unknown, contexte: ExecutionContext): string => {
    const { agenceId } = sessionDeLaRequete(contexte);

    if (!agenceId) {
      throw new ForbiddenException("Ce compte n'est rattache a aucune agence");
    }

    return agenceId;
  },
);

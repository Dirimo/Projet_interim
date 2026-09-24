import { z } from 'zod';

/**
 * Ces enums sont la source de verite cote contrat d'API. Ils doivent rester
 * alignes avec les enums Prisma de `backend/prisma/schema.prisma` : le package
 * `contracts` ne depend pas de Prisma pour rester importable par le front.
 */

export const statutCandidatSchema = z.enum([
  'BROUILLON',
  'EN_VERIFICATION',
  'ACTIF',
  'INACTIF',
  'ARCHIVE',
]);
export type StatutCandidat = z.infer<typeof statutCandidatSchema>;

export const STATUT_CANDIDAT_LIBELLES: Record<StatutCandidat, string> = {
  BROUILLON: 'Brouillon',
  EN_VERIFICATION: 'En verification',
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  ARCHIVE: 'Archive',
};

/**
 * Deux types de client : le SAAD et l'etablissement.
 *
 * L'agence ne place que dans des services d'aide et d'accompagnement a
 * domicile. L'enum est conserve plutot que supprime parce qu'il porte une
 * information juridique exploitee ailleurs : un SAAD releve de l'article
 * L. 312-1 du CASF, donc la duree minimale d'exercice prealable a l'interim
 * s'applique a ses mises a disposition.
 */
export const typeClientSchema = z.enum(['SAAD', 'ETABLISSEMENT']);
export type TypeClient = z.infer<typeof typeClientSchema>;

export const TYPE_CLIENT_LIBELLES: Record<TypeClient, string> = {
  SAAD: "Service d'aide et d'accompagnement a domicile (SAAD)",
  ETABLISSEMENT: 'Etablissement',
};

export const typeLieuSchema = z.enum(['DOMICILE_BENEFICIAIRE', 'ETABLISSEMENT']);
export type TypeLieu = z.infer<typeof typeLieuSchema>;

export const TYPE_LIEU_LIBELLES: Record<TypeLieu, string> = {
  DOMICILE_BENEFICIAIRE: 'Domicile du beneficiaire',
  ETABLISSEMENT: 'Etablissement',
};

export const statutMissionSchema = z.enum([
  'BROUILLON',
  'PUBLIEE',
  'EN_MATCHING',
  'PROPOSEE',
  'VALIDEE',
  'CONTRACTUALISEE',
  'EN_COURS',
  'TERMINEE',
  'ANNULEE',
  'NON_POURVUE',
]);
export type StatutMission = z.infer<typeof statutMissionSchema>;

export const statutPropositionSchema = z.enum([
  'ENVOYEE',
  'ACCEPTEE_CANDIDAT',
  'REFUSEE_CANDIDAT',
  'VALIDEE_CLIENT',
  'REFUSEE_CLIENT',
  'EXPIREE',
]);
export type StatutProposition = z.infer<typeof statutPropositionSchema>;

export const roleUtilisateurSchema = z.enum([
  'ADMIN_AGENCE',
  'CHARGE_RECRUTEMENT',
  'CLIENT',
  'CANDIDAT',
]);
export type RoleUtilisateur = z.infer<typeof roleUtilisateurSchema>;

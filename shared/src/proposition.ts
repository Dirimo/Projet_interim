import { z } from 'zod';
import { statutPropositionSchema, type StatutProposition } from './enums';
import { paginationQuerySchema } from './pagination';
import type { MissionResume } from './mission';

/**
 * La proposition porte les deux sens de circulation.
 *
 * L'agence peut proposer un candidat a une mission : la ligne nait ENVOYEE et
 * attend la reponse de l'interesse. Le candidat peut aussi postuler de lui-meme
 * depuis le tableau des missions : la ligne nait alors ACCEPTEE_CANDIDAT,
 * puisqu'il a deja dit oui en cliquant. Dans les deux cas, le client tranche en
 * dernier - VALIDEE_CLIENT ou REFUSEE_CLIENT - et c'est cette decision qui
 * pourvoit la mission.
 */
export const candidatureCreateSchema = z.object({
  /** Mot d'accompagnement facultatif, affiche a l'etablissement. */
  message: z.string().trim().max(1000).optional(),
});

export type CandidatureCreate = z.infer<typeof candidatureCreateSchema>;

export const propositionCreateSchema = z.object({
  candidatId: z.string().uuid('Candidat invalide'),
  message: z.string().trim().max(1000).optional(),
});

export type PropositionCreate = z.infer<typeof propositionCreateSchema>;

export const refusSchema = z.object({
  motif: z.string().trim().max(300).optional(),
});

export type Refus = z.infer<typeof refusSchema>;

export const propositionListQuerySchema = paginationQuerySchema.extend({
  statut: statutPropositionSchema.optional(),
  missionId: z.string().uuid().optional(),
});

export type PropositionListQuery = z.infer<typeof propositionListQuerySchema>;

/** Un point fort du profil, tel que l'etablissement le lit sur la fiche. */
export interface PointFortCandidat {
  /** Nom d'icone cote front : briefcase, star, map-pin. */
  icone: 'briefcase' | 'star' | 'map-pin';
  libelle: string;
  valeur: string;
}

export interface CandidatPropose {
  id: string;
  nom: string;
  prenom: string;
  initiales: string;
  /** Qualification verifiee la plus pertinente pour la mission. */
  qualification: string | null;
  etiquettes: string[];
  pointsForts: PointFortCandidat[];
}

export interface PropositionResume {
  id: string;
  statut: StatutProposition;
  envoyeeLe: string;
  repondueLe: string | null;
  motifRefus: string | null;
  message: string | null;

  /** Null tant que le moteur de matching n'est pas branche. */
  score: number | null;
  candidat: CandidatPropose;
  mission: MissionResume;
}

import { z } from 'zod';
import { filiereSchema, statutCandidatSchema, type Filiere, type StatutCandidat } from './enums';
import type { DisponibiliteResume, IndisponibiliteResume } from './disponibilite';
import { MOTIF_CODE_POSTAL, MOTIF_DATE_ISO, MOTIF_EMAIL, MOTIF_TELEPHONE } from './motifs';
import { paginationQuerySchema } from './pagination';

/**
 * Un candidat peut etre eligible aux deux filieres : c'est justement la raison
 * pour laquelle on ne duplique pas sa fiche. `filieres` ne peut donc pas etre vide.
 */
export const candidatCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est obligatoire').max(80),
  prenom: z.string().trim().min(1, 'Le prenom est obligatoire').max(80),
  email: z.string().trim().toLowerCase().regex(MOTIF_EMAIL, 'Adresse e-mail invalide'),
  telephone: z.string().trim().regex(MOTIF_TELEPHONE, 'Numero de telephone invalide'),
  filieres: z.array(filiereSchema).min(1, 'Au moins une filiere est requise'),
  adresse: z.string().trim().min(1).max(160),
  codePostal: z.string().trim().regex(MOTIF_CODE_POSTAL, 'Code postal invalide'),
  ville: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  rayonKm: z.number().int().min(1).max(150).default(20),
  permisB: z.boolean().default(false),
  vehicule: z.boolean().default(false),
});

export type CandidatCreate = z.infer<typeof candidatCreateSchema>;

export const candidatUpdateSchema = candidatCreateSchema.partial().extend({
  statut: statutCandidatSchema.optional(),

  // Les deux seules donnees d'aptitude stockees, et volontairement les plus
  // pauvres possible : une date de visite et un booleen. La plateforme a besoin
  // de savoir si le candidat est deployable, pas de savoir pourquoi. Aucun
  // motif, aucun document medical, aucune pathologie.
  visiteMedicaleLe: z
    .string()
    .trim()
    .regex(MOTIF_DATE_ISO, 'Date invalide (format AAAA-MM-JJ)')
    .nullable()
    .optional(),
  vaccinationVerifiee: z.boolean().optional(),
});

export type CandidatUpdate = z.infer<typeof candidatUpdateSchema>;

export const candidatListQuerySchema = paginationQuerySchema.extend({
  filiere: filiereSchema.optional(),
  statut: statutCandidatSchema.optional(),
  recherche: z.string().trim().min(1).max(80).optional(),
  permisB: z.coerce.boolean().optional(),
});

export type CandidatListQuery = z.infer<typeof candidatListQuerySchema>;

export interface CandidatResume {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: StatutCandidat;
  filieres: Filiere[];
  ville: string;
  codePostal: string;
  rayonKm: number;
  permisB: boolean;
  vehicule: boolean;
  qualifications: string[];
}

/** Rattachement d'une qualification du referentiel a un candidat. */
export const qualificationCandidatSchema = z.object({
  qualificationId: z.string().uuid('Identifiant de qualification invalide'),
  obtenueLe: z
    .string()
    .trim()
    .regex(MOTIF_DATE_ISO, 'Date invalide (format AAAA-MM-JJ)')
    .optional(),
  expireLe: z.string().trim().regex(MOTIF_DATE_ISO, 'Date invalide (format AAAA-MM-JJ)').optional(),
  justificatifUrl: z.string().trim().url('URL invalide').max(500).optional(),
});

export type QualificationCandidatCreate = z.infer<typeof qualificationCandidatSchema>;

/**
 * Verification d'une qualification par l'agence. `verifiee` a false permet de
 * revenir en arriere : un justificatif juge non conforme apres coup ne doit pas
 * obliger a supprimer puis recreer la ligne, on perdrait la trace.
 */
export const qualificationCandidatUpdateSchema = z.object({
  obtenueLe: z
    .string()
    .trim()
    .regex(MOTIF_DATE_ISO, 'Date invalide (format AAAA-MM-JJ)')
    .nullable()
    .optional(),
  expireLe: z
    .string()
    .trim()
    .regex(MOTIF_DATE_ISO, 'Date invalide (format AAAA-MM-JJ)')
    .nullable()
    .optional(),
  justificatifUrl: z.string().trim().url('URL invalide').max(500).nullable().optional(),
  verifiee: z.boolean().optional(),
});

export type QualificationCandidatUpdate = z.infer<typeof qualificationCandidatUpdateSchema>;

export interface QualificationCandidatResume {
  qualificationId: string;
  code: string;
  libelle: string;
  filieres: Filiere[];
  obtenueLe: string | null;
  expireLe: string | null;
  justificatifUrl: string | null;
  verifieeLe: string | null;
  verifieePar: string | null;
  /** Calcule cote serveur : une qualification expiree ne vaut pas verifiee. */
  expiree: boolean;
}

export interface CandidatDetail extends CandidatResume {
  adresse: string;
  latitude: number | null;
  longitude: number | null;
  visiteMedicaleLe: string | null;
  vaccinationVerifiee: boolean;
  qualificationsDetail: QualificationCandidatResume[];
  disponibilites: DisponibiliteResume[];
  indisponibilites: IndisponibiliteResume[];
}

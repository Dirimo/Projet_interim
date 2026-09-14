import { z } from 'zod';
import { filiereSchema, type Filiere } from './enums';

/**
 * Referentiel partage par toutes les agences : un DEAS est un DEAS partout.
 * Il n'est donc pas cloisonne par agence, contrairement aux clients et aux
 * candidats.
 */
export const qualificationCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, 'Le code ne contient que des majuscules, chiffres et tirets'),
  libelle: z.string().trim().min(1, 'Le libelle est obligatoire').max(160),
  filieres: z.array(filiereSchema).min(1, 'Au moins une filiere est requise'),
});

export type QualificationCreate = z.infer<typeof qualificationCreateSchema>;

export const qualificationListQuerySchema = z.object({
  filiere: filiereSchema.optional(),
});

export type QualificationListQuery = z.infer<typeof qualificationListQuerySchema>;

export interface QualificationResume {
  id: string;
  code: string;
  libelle: string;
  filieres: Filiere[];
}

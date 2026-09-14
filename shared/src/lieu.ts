import { z } from 'zod';
import { typeLieuSchema, type TypeLieu } from './enums';
import { MOTIF_CODE_POSTAL } from './motifs';

/**
 * Lieu d'intervention rattache a un client.
 *
 * Regle RGPD structurante : aucune donnee de sante, aucune identite de
 * beneficiaire. `beneficiaireRef` est une reference pseudonymisee (BEN-0147) qui
 * permet a l'agence de parler du bon domicile sans stocker qui y vit. Les
 * `consignes` servent a l'acces au logement, pas a decrire une pathologie.
 */
export const lieuCreateSchema = z.object({
  type: typeLieuSchema,
  libelle: z.string().trim().min(1, 'Le libelle est obligatoire').max(160),

  adresse: z.string().trim().min(1, 'L adresse est obligatoire').max(160),
  codePostal: z.string().trim().regex(MOTIF_CODE_POSTAL, 'Code postal invalide'),
  ville: z.string().trim().min(1, 'La ville est obligatoire').max(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  etage: z.string().trim().max(80).optional(),
  codeAcces: z.string().trim().max(40).optional(),
  consignes: z.string().trim().max(500).optional(),
  beneficiaireRef: z.string().trim().max(40).optional(),
});

export type LieuCreate = z.infer<typeof lieuCreateSchema>;

export const lieuUpdateSchema = lieuCreateSchema.partial();

export type LieuUpdate = z.infer<typeof lieuUpdateSchema>;

export interface LieuResume {
  id: string;
  clientId: string;
  type: TypeLieu;
  libelle: string;
  adresse: string;
  codePostal: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  etage: string | null;
  codeAcces: string | null;
  consignes: string | null;
  beneficiaireRef: string | null;
  /** Un lieu utilise par des missions ne peut plus etre supprime. */
  nombreMissions: number;
}

import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

/**
 * Offres d'intérim collectées sur une source publique et republiées sur le
 * site.
 *
 * Ces offres ne sont pas celles de Relève. Elles viennent de France Travail,
 * elles appartiennent à d'autres employeurs, et la candidature se fait chez la
 * source — la plateforme ne la reçoit pas. Trois conséquences que le produit
 * doit assumer visuellement, sous peine de laisser croire à un candidat qu'il
 * postule chez nous :
 *
 * - la source est nommée sur chaque annonce ;
 * - `urlOrigine` est le seul chemin pour postuler ;
 * - `actualiseeLe` dit de quand date l'information affichée.
 *
 * Ces trois points ne sont pas des choix d'ergonomie : la licence de
 * réutilisation de la base d'offres France Travail les impose, au même titre
 * que l'interdiction de dénaturer le contenu. C'est aussi pourquoi l'intitulé
 * republié est celui de l'employeur, jamais la version normalisée qui sert au
 * baromètre.
 */

/** Ce que porte une carte dans la liste : de quoi décider d'ouvrir, pas plus. */
export interface OffrePubliqueResume {
  id: string;
  source: string;
  intitule: string;
  entreprise: string | null;
  communeNom: string | null;
  departement: string | null;
  codePostal: string | null;
  /** Libellé d'origine ("Horaire de 14.0 Euros"), affiché tel quel. */
  salaireLibelle: string | null;
  /** Converti à l'heure. Sert au tri et aux filtres, pas à l'affichage. */
  tauxHoraire: number | null;
  typeContratLibelle: string | null;
  dureeTravailLibelle: string | null;
  experienceExigee: boolean;
  nombrePostes: number;
  publieeLe: string;
  actualiseeLe: string | null;
  urlOrigine: string | null;
}

export interface CompetenceOffre {
  code: string | null;
  libelle: string;
  exigence: string | null;
}

/** L'annonce entière. La licence demande de restituer le contenu, pas un extrait. */
export interface OffrePubliqueDetail extends OffrePubliqueResume {
  description: string | null;
  entrepriseDescription: string | null;
  romeCode: string | null;
  romeLibelle: string | null;
  experienceLibelle: string | null;
  qualificationLibelle: string | null;
  secteurActiviteLibelle: string | null;
  competences: CompetenceOffre[];
  horaires: string[];
  conditionsExercice: string[];
  natureContrat: string | null;
  alternance: boolean;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Tri proposé au visiteur.
 *
 * `RECENTES` par défaut : sur un site d'offres, une annonce de la veille vaut
 * mieux qu'une annonce mieux payée d'il y a trois semaines, souvent déjà
 * pourvue. Le tri par taux relègue en fin de liste les offres sans salaire
 * annoncé, qui sont nombreuses sur ce secteur — c'est voulu, une offre muette
 * sur la rémunération n'a rien à faire en tête d'un classement par salaire.
 */
export const triOffresSchema = z.enum(['RECENTES', 'TAUX_DECROISSANT']);
export type TriOffres = z.infer<typeof triOffresSchema>;

export const offresQuerySchema = paginationQuerySchema.extend({
  /** Recherche plein texte sur l'intitulé et l'employeur. */
  recherche: z.string().trim().min(2).max(120).optional(),
  departement: z
    .string()
    .trim()
    .regex(/^(\d{2,3}|2[AB])$/, 'Code département invalide')
    .optional(),
  rome: z
    .string()
    .trim()
    .regex(/^[A-Z]\d{4}$/, 'Code ROME invalide')
    .optional(),
  /** Filtre sur le taux converti : n'atteint donc que les offres chiffrées. */
  tauxMinimum: z.coerce.number().min(0).max(200).optional(),
  tri: triOffresSchema.default('RECENTES'),
});

export type OffresQuery = z.infer<typeof offresQuerySchema>;

/**
 * Mention de source à afficher sur la liste et sur chaque annonce.
 *
 * Elle vit dans le paquet partagé parce que trois endroits la disent : la page
 * de liste, la page de détail, et les mentions légales. Trois copies finiraient
 * par diverger, et c'est la page publique qui aurait tort.
 */
export const MENTION_SOURCE_FRANCE_TRAVAIL =
  'Offre diffusée par France Travail, republiée par Relève au titre de la licence de réutilisation de la base d’offres d’emploi.';

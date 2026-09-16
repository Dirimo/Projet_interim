import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

/**
 * Deux choses différentes vivent dans ce fichier, et il ne faut jamais les
 * confondre.
 *
 * `MissionVitrine` décrit **nos** missions : celles que les établissements
 * déposent sur Relève. Elles sont publiques, on y postule ici, et l'agence
 * reçoit la candidature.
 *
 * `SuggestionMarche` décrit une offre **France Travail** rapprochée du profil
 * d'un candidat connecté. Ce n'est pas notre offre : elle appartient à un autre
 * employeur, souvent une agence concurrente, et la candidature se fait chez la
 * source. Elle n'est jamais publiée au tout-venant — elle ne s'affiche qu'à un
 * candidat identifié, comme une piste complémentaire.
 *
 * Cette séparation n'est pas cosmétique. Présenter une offre France Travail
 * comme une offre Relève laisserait un candidat attendre une réponse qui ne
 * viendrait jamais, et contreviendrait à la licence de réutilisation, qui
 * interdit de dénaturer le contenu et impose d'en citer la source partout où il
 * est montré.
 */

// ------------------------------------------------------------------ nos missions

/**
 * Mission Relève, telle qu'un visiteur la voit avant de se connecter.
 *
 * Volontairement pauvre en identités. Le nom de l'établissement client n'y
 * figure pas : publier sur le web ouvert quels services d'aide à domicile
 * passent par une agence d'intérim est une information commercialement
 * sensible pour eux, et ils ne l'ont pas autorisée en déposant un besoin. Le
 * candidat connecté, lui, le voit dans son espace.
 */
export interface MissionVitrine {
  id: string;
  reference: string;
  /** Libellé de la qualification requise : « Diplôme d'État d'aide-soignant ». */
  metier: string;
  /** Code de la qualification, pour le filtre. */
  metierCode: string;
  typeLieu: 'DOMICILE_BENEFICIAIRE' | 'ETABLISSEMENT';
  /** Secteur d'intervention, sans adresse : « Domicile - secteur Doulon ». */
  secteur: string;
  ville: string;
  codePostal: string;
  departement: string;
  dateDebut: string;
  dateFin: string;
  heureDebut: string;
  heureFin: string;
  travailNuit: boolean;
  tauxHoraire: number | null;
  description: string | null;
}

/**
 * Contenu des menus déroulants de la vitrine.
 *
 * Construits à partir des missions réellement ouvertes, et non d'une liste
 * figée des cent une divisions françaises : proposer « Cantal » dans un menu
 * qui ne rendrait jamais aucun résultat ferait perdre le visiteur bien plus
 * sûrement qu'un menu court. Les listes s'étoffent d'elles-mêmes à mesure que
 * l'agence couvre de nouveaux territoires.
 */
export interface OptionsVitrine {
  departements: { code: string; libelle: string; missions: number }[];
  villes: { nom: string; departement: string; missions: number }[];
  metiers: { code: string; libelle: string; missions: number }[];
}

export const missionsVitrineQuerySchema = paginationQuerySchema.extend({
  departement: z
    .string()
    .trim()
    .regex(/^(\d{2,3}|2[AB])$/, 'Code département invalide')
    .optional(),
  ville: z.string().trim().min(1).max(120).optional(),
  metier: z.string().trim().min(1).max(40).optional(),
});

export type MissionsVitrineQuery = z.infer<typeof missionsVitrineQuerySchema>;

// --------------------------------------------------- suggestions France Travail

/**
 * Offre du marché rapprochée du profil d'un candidat.
 *
 * Le rapprochement se fait sur le métier et sur la distance, et sur rien
 * d'autre. C'est une limite des données, pas un choix de confort : une offre
 * France Travail ne porte ni date, ni horaire exploitable — seulement un texte
 * libre du type « 35H/semaine, travail en journée ». Le moteur de score de
 * Relève, qui pèse d'abord le chevauchement entre les créneaux du candidat et
 * ceux de la mission, n'aurait rien à mesurer.
 */
export interface SuggestionMarche {
  id: string;
  /** Toujours affichée : la licence impose de citer la source. */
  source: string;
  intitule: string;
  entreprise: string | null;
  communeNom: string | null;
  departement: string | null;
  /** Distance depuis le domicile du candidat, en kilomètres. */
  distanceKm: number | null;
  /**
   * Vraie quand la distance part du centre de la commune et non d'une adresse.
   *
   * France Travail ne géolocalise qu'une annonce sur sept ; les autres sont
   * situées à la commune, ce qui suffit à filtrer sur un rayon de vingt ou
   * trente kilomètres mais pas à annoncer un chiffre au kilomètre près.
   * L'affichage doit écrire « environ 12 km » dans ce cas — présenter une
   * approximation comme une mesure est le plus sûr moyen de la voir citée
   * comme telle.
   */
  distanceApprochee: boolean;
  salaireLibelle: string | null;
  typeContratLibelle: string | null;
  dureeTravailLibelle: string | null;
  experienceExigee: boolean;
  publieeLe: string;
  actualiseeLe: string | null;
  /** Seul chemin pour postuler : Relève ne reçoit pas ces candidatures. */
  urlOrigine: string | null;
}

export interface SuggestionsMarche {
  suggestions: SuggestionMarche[];
  /** Total des offres correspondant au profil, au-delà de celles renvoyées. */
  total: number;
  /**
   * Pourquoi la liste est vide, quand elle l'est. Un encart muet ferait croire
   * à une panne ; ces motifs disent au candidat ce qu'il peut y changer.
   */
  motif: 'AUCUN_METIER' | 'ADRESSE_ABSENTE' | 'AUCUNE_OFFRE' | null;
}

export const suggestionsQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(50).default(6),
});

export type SuggestionsQuery = z.infer<typeof suggestionsQuerySchema>;

/**
 * Mention de source des offres du marché.
 *
 * Elle vit dans le paquet partagé parce que plusieurs endroits la disent :
 * l'encart de suggestions et les mentions légales. Deux copies finiraient par
 * diverger, et c'est la page publique qui aurait tort.
 */
export const MENTION_SOURCE_FRANCE_TRAVAIL =
  'Offres diffusées par France Travail, présentées au titre de la licence de réutilisation de la base d’offres d’emploi. La candidature se fait auprès de l’employeur concerné.';

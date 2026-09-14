import { z } from 'zod';
import { candidatCreateSchema, type CandidatResume } from './candidat';
import { clientCreateSchema, type ClientResume } from './client';
import { MOTIF_EMAIL } from './motifs';
import { motDePasseSchema } from './utilisateur';

/**
 * Inscription en ligne des deux profils.
 *
 * L'agence garde la main sur ce qui engage : une inscription ouvre un compte,
 * elle ne rend personne operationnel. L'entreprise cree son fiche client
 * inactive, l'interimaire arrive en verification. C'est l'agence qui valide,
 * apres avoir vu les diplomes d'un cote et verifie l'entreprise de l'autre.
 */

/** Identifiants du compte, communs aux deux parcours. */
export const compteInscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().regex(MOTIF_EMAIL, 'Adresse e-mail invalide'),
  motDePasse: motDePasseSchema,
});

export type CompteInscription = z.infer<typeof compteInscriptionSchema>;

/**
 * La convention collective et l'IDCC sont volontairement absents du formulaire :
 * ils fixent le salaire de reference de l'interimaire (egalite de traitement
 * avec les salaries de l'entreprise utilisatrice). Une entreprise qui les
 * declarerait elle-meme fixerait donc sa propre masse salariale. C'est l'agence
 * qui les renseigne a la validation.
 *
 * L'e-mail de contact n'est pas demande non plus : c'est celui du compte.
 */
export const inscriptionEntrepriseSchema = z.object({
  entreprise: clientCreateSchema.omit({
    conventionCollective: true,
    idcc: true,
    contactEmail: true,
  }),
  compte: compteInscriptionSchema,
});

export type InscriptionEntreprise = z.infer<typeof inscriptionEntrepriseSchema>;

/**
 * L'e-mail vient du compte : une seule adresse a saisir, et surtout une seule
 * verite. Deux champs distincts finiraient par diverger, et on ne saurait plus
 * laquelle sert a joindre la personne.
 *
 * Les coordonnees geographiques sont calculees par geocodage, pas saisies.
 */
export const inscriptionInterimaireSchema = z.object({
  interimaire: candidatCreateSchema.omit({
    email: true,
    latitude: true,
    longitude: true,
  }),
  compte: compteInscriptionSchema,
});

export type InscriptionInterimaire = z.infer<typeof inscriptionInterimaireSchema>;

/**
 * Ce que le compte connecte voit de lui-meme. Le back-office n'a rien a y
 * lire : son espace, c'est le vivier et les referentiels.
 */
export type EspacePersonnel =
  | { type: 'AGENCE' }
  | { type: 'CLIENT'; valideParLAgence: boolean; client: ClientResume }
  | { type: 'CANDIDAT'; valideParLAgence: boolean; candidat: CandidatResume };

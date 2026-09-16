/**
 * Les faits juridiques du site, regroupes en un seul endroit.
 *
 * Trois pages les consomment : mentions legales, conditions d'utilisation et
 * politique de confidentialite. Les completer, c'est editer ce fichier et rien
 * d'autre.
 *
 * AVERTISSEMENT — les trois pages sont des *brouillons de structure*. Elles
 * posent les rubriques exigees et disent ce que le code fait reellement ; elles
 * n'ont pas ete relues par un professionnel du droit et ne valent pas conseil
 * juridique. Une agence de travail temporaire a des obligations propres
 * (garantie financiere, mentions du contrat de mission) qui demandent cette
 * relecture avant toute mise en ligne.
 *
 * Une valeur absente s'affiche « À compléter » sur la page. C'est voulu : un
 * trou visible vaut mieux qu'une valeur plausible et fausse, qui exposerait
 * l'editeur.
 */

import { DATE_CONDITIONS_LISIBLE } from '@releve/shared';

/** Adresse deja utilisee par le formulaire de contact. */
export const ADRESSE_CONTACT = 'contact@releve.example';

/**
 * Date de la derniere revision des textes, affichee en pied de chaque page.
 *
 * Reprise du paquet partage et non ecrite ici : c'est la meme revision que
 * celle enregistree avec le consentement, a l'inscription. Deux valeurs
 * separees finiraient par diverger, et la page afficherait alors une date que
 * personne n'a acceptee.
 */
export const DERNIERE_REVISION = DATE_CONDITIONS_LISIBLE;

export interface Mention {
  libelle: string;
  /** Laisser absent tant que l'agence n'a pas fourni la valeur. */
  valeur?: string;
  /** Ce qu'il faut mettre dans `valeur`, affiche sous le champ. */
  precision?: string;
}

/** Identite de l'editeur — article 6 III de la LCEN. */
export const EDITEUR: Mention[] = [
  { libelle: 'Raison sociale', precision: 'Dénomination exacte figurant au Kbis' },
  { libelle: 'Forme juridique et capital social' },
  { libelle: 'Siège social', precision: 'Adresse postale complète' },
  { libelle: 'Numéro SIRET' },
  { libelle: 'Numéro de TVA intracommunautaire' },
  { libelle: 'Directeur de la publication', precision: 'Nom et qualité' },
  { libelle: 'Adresse de contact', valeur: ADRESSE_CONTACT },
];

/** Ce qui tient a l'activite reglementee de travail temporaire. */
export const ACTIVITE: Mention[] = [
  {
    libelle: 'Garantie financière (travail temporaire)',
    precision:
      "Organisme garant et adresse. Obligatoire pour une entreprise de travail temporaire — sans elle, l'activité ne peut pas être exercée",
  },
  {
    libelle: 'Déclaration préalable auprès de l’inspection du travail',
    precision: 'Référence de la déclaration d’activité d’entreprise de travail temporaire',
  },
  {
    libelle: 'Déclaration de services à la personne',
    precision: 'Numéro de déclaration, le cas échéant',
  },
  { libelle: 'Assurance de responsabilité civile professionnelle' },
];

/** Ou tourne le site. */
export const HEBERGEMENT: Mention[] = [
  { libelle: 'Hébergeur', precision: 'Dénomination, adresse et téléphone' },
  { libelle: 'Localisation des données', precision: 'Pays d’hébergement des serveurs' },
];

/** Qui repond des traitements, et aupres de qui se plaindre. */
export const DONNEES: Mention[] = [
  {
    libelle: 'Responsable de traitement',
    precision: "Personne morale, identique à l'éditeur sauf exception",
  },
  {
    libelle: 'Délégué à la protection des données',
    precision: "Nom et adresse de contact, s'il en existe un",
  },
  {
    libelle: 'Durée de conservation des dossiers candidats',
    precision: 'Durée retenue après le dernier contact, et son point de départ',
  },
  {
    libelle: 'Sous-traitants et destinataires',
    precision: 'Hébergeur, service d’envoi de courriels, logiciel de paie…',
  },
  {
    libelle: 'Transferts hors Union européenne',
    precision: 'Aucun, ou la liste des transferts et leur encadrement',
  },
];

/** Recours ouvert a toute personne concernee, quelle que soit l'agence. */
export const AUTORITE_CONTROLE =
  'Commission nationale de l’informatique et des libertés (CNIL) — cnil.fr';

/**
 * Nettoyage des offres publiques.
 *
 * Tout ce fichier est volontairement sans dependance : ni base, ni reseau, ni
 * Nest. Ce sont les regles metier du nettoyage, et elles doivent pouvoir se
 * tester sur une chaine de caracteres, pas sur un jeu d'integration.
 */

/** Heures mensuelles de reference pour un temps plein (35 h hebdomadaires). */
const HEURES_PAR_MOIS = 151.67;

/** Mois payes par defaut quand le libelle annuel n'en precise pas. */
const MOIS_PAR_AN = 12;

/**
 * Garde-fous : au-dela, c'est une erreur de lecture, pas un salaire.
 * Le SMIC horaire brut sert de plancher plausible, avec une marge vers le bas
 * pour les libelles anciens.
 */
const TAUX_HORAIRE_MIN = 8;
const TAUX_HORAIRE_MAX = 120;

export interface OffreBrute {
  id: string;
  intitule?: string;
  appellationlibelle?: string;
  romeCode?: string;
  romeLibelle?: string;
  entreprise?: { nom?: string };
  lieuTravail?: {
    libelle?: string;
    commune?: string;
    codePostal?: string;
    latitude?: number;
    longitude?: number;
  };
  salaire?: { libelle?: string };
  experienceExige?: string;
  nombrePostes?: number;
  dateCreation?: string;
  typeContrat?: string;
}

export interface OffreNettoyee {
  id: string;
  romeCode: string;
  romeLibelle: string;
  intitule: string;
  intituleNormalise: string;
  entreprise: string | null;
  departement: string;
  commune: string;
  codePostal: string;
  latitude: number | null;
  longitude: number | null;
  tauxHoraire: number | null;
  salaireLibelle: string | null;
  experienceExigee: boolean;
  nombrePostes: number;
  publieeLe: Date;
  empreinte: string;
}

/**
 * Ramene un libelle de salaire a un taux horaire.
 *
 * L'API renvoie du texte libre, et huit formes differentes sur un echantillon
 * de cent cinquante offres : "Horaire de 15.0 Euros", "Mensuel de 1800.0 Euros
 * a 2000.0 Euros sur 12.0 mois", "Annuel de 24000.0 Euros", parfois suivi d'un
 * commentaire ("selon convention, diplome et anciennete").
 *
 * Sur une fourchette, on retient le milieu : le bas serait systematiquement
 * pessimiste pour une suggestion de taux, le haut systematiquement optimiste.
 *
 * Renvoie null des que le libelle n'est pas exploitable. Une offre sans salaire
 * lisible doit disparaitre du calcul, pas y entrer avec une valeur inventee.
 */
export function tauxHoraireDepuisLibelle(libelle: string | null | undefined): number | null {
  if (!libelle) {
    return null;
  }

  const texte = libelle.toLowerCase();

  // Les nombres sont ecrits "15.0" ou "1 800,50" selon les offres.
  const nombres = [...texte.matchAll(/(\d[\d\s]*(?:[.,]\d+)?)/g)]
    .map((trouve) => Number(trouve[1]!.replace(/\s/g, '').replace(',', '.')))
    .filter((valeur) => Number.isFinite(valeur) && valeur > 0);

  if (!nombres.length) {
    return null;
  }

  const base = texte.startsWith('horaire')
    ? 'horaire'
    : texte.startsWith('mensuel')
      ? 'mensuel'
      : texte.startsWith('annuel')
        ? 'annuel'
        : null;

  if (!base) {
    return null;
  }

  // "sur 12.0 mois" est un nombre de mois, pas un montant : il ne doit pas
  // entrer dans la moyenne de la fourchette.
  const mois = /sur\s+(\d+(?:[.,]\d+)?)\s*mois/.exec(texte);
  const moisPayes = mois ? Number(mois[1]!.replace(',', '.')) : null;

  let montants = nombres;

  if (moisPayes !== null) {
    const index = montants.lastIndexOf(moisPayes);
    if (index >= 0) {
      montants = [...montants.slice(0, index), ...montants.slice(index + 1)];
    }
  }

  // Un commentaire libre ("prime segur + 200 euros") ajoute des nombres qui ne
  // sont pas le salaire : on ne garde que ce qui precede le premier separateur.
  const separateur = texte.search(/\s[-–]\s|,\s*selon|\(/);
  if (separateur > 0) {
    const avant = texte.slice(0, separateur);
    const gardes = [...avant.matchAll(/(\d[\d\s]*(?:[.,]\d+)?)/g)]
      .map((trouve) => Number(trouve[1]!.replace(/\s/g, '').replace(',', '.')))
      .filter((valeur) => Number.isFinite(valeur) && valeur > 0 && valeur !== moisPayes);

    if (gardes.length) {
      montants = gardes;
    }
  }

  if (!montants.length) {
    return null;
  }

  // Milieu de fourchette : avec un seul montant, c'est ce montant.
  const moyenne = montants.reduce((somme, valeur) => somme + valeur, 0) / montants.length;

  // Le nombre de mois payes change le total annuel, jamais le taux horaire :
  // une annee de travail fait le meme nombre d'heures qu'on la paie en douze
  // ou en treize fois.
  const horaire =
    base === 'horaire'
      ? moyenne
      : base === 'mensuel'
        ? moyenne / HEURES_PAR_MOIS
        : moyenne / (MOIS_PAR_AN * HEURES_PAR_MOIS);

  if (horaire < TAUX_HORAIRE_MIN || horaire > TAUX_HORAIRE_MAX) {
    return null;
  }

  return Math.round(horaire * 100) / 100;
}

/**
 * Departement a partir des donnees de lieu.
 *
 * Le libelle est de la forme "85 - Chaize-Giraud", mais le code postal est plus
 * sur quand il est present. Les DOM tiennent sur trois chiffres, et la Corse
 * s'ecrit 2A / 2B dans le libelle alors que le code postal dit 20.
 */
export function departementDepuisLieu(lieu: OffreBrute['lieuTravail']): string | null {
  const parLibelle = /^\s*(\d{2,3}|2[AB])\s*-/.exec(lieu?.libelle ?? '');

  if (parLibelle) {
    return parLibelle[1]!.toUpperCase();
  }

  const codePostal = (lieu?.codePostal ?? '').trim();

  if (/^\d{5}$/.test(codePostal)) {
    return codePostal.startsWith('97') || codePostal.startsWith('98')
      ? codePostal.slice(0, 3)
      : codePostal.slice(0, 2);
  }

  return null;
}

/**
 * Ramene l'intitule a l'appellation du referentiel ROME.
 *
 * Les employeurs ecrivent "Aide soignant (F/H)", "AIDE SOIGNANT H/F - URGENT",
 * "Aide-soignant(e) de nuit". Regrouper sur ces chaines est impossible ; le
 * referentiel, lui, est stable. On ne garde le titre libre que si l'API n'a pas
 * su le rattacher.
 */
export function normaliserIntitule(offre: OffreBrute): string {
  const referentiel = offre.appellationlibelle?.trim() || offre.romeLibelle?.trim();

  if (referentiel) {
    // "Aide-soignant / Aide-soignante" : la forme masculin/feminin du
    // referentiel n'apporte rien a un regroupement.
    return referentiel.split('/')[0]!.trim();
  }

  return (offre.intitule ?? '')
    .replace(/\s*\((?:f\s*\/\s*h|h\s*\/\s*f)\)\s*/gi, ' ')
    .replace(/\s+(?:f\s*\/\s*h|h\s*\/\s*f)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Signature de dedoublonnage.
 *
 * Les agences republient la meme offre sous un nouvel identifiant : cinq cas
 * sur cent cinquante dans l'echantillon. Les compter separement gonflerait la
 * tension mesuree, qui est precisement ce qu'on veut mesurer juste.
 */
export function empreinteOffre(offre: {
  intituleNormalise: string;
  entreprise: string | null;
  commune: string;
  romeCode: string;
}): string {
  return [offre.romeCode, offre.intituleNormalise, offre.entreprise ?? '—', offre.commune]
    .map((partie) =>
      partie
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
    )
    .join('|');
}

/**
 * Nettoie une offre brute. Renvoie null quand il manque de quoi la situer :
 * une offre sans metier ni departement ne sert a aucun calcul, et la garder
 * reviendrait a polluer le barometre pour rien.
 */
export function nettoyerOffre(brute: OffreBrute): OffreNettoyee | null {
  const romeCode = brute.romeCode?.trim();
  const departement = departementDepuisLieu(brute.lieuTravail);
  const commune = brute.lieuTravail?.commune?.trim();
  const publiee = brute.dateCreation ? new Date(brute.dateCreation) : null;

  if (!romeCode || !departement || !commune || !publiee || Number.isNaN(publiee.getTime())) {
    return null;
  }

  const intituleNormalise = normaliserIntitule(brute);

  if (!intituleNormalise) {
    return null;
  }

  const entreprise = brute.entreprise?.nom?.trim() || null;

  return {
    id: brute.id,
    romeCode,
    romeLibelle: brute.romeLibelle?.trim() ?? intituleNormalise,
    intitule: (brute.intitule ?? '').trim() || intituleNormalise,
    intituleNormalise,
    entreprise,
    departement,
    commune,
    codePostal: (brute.lieuTravail?.codePostal ?? '').trim(),
    latitude: brute.lieuTravail?.latitude ?? null,
    longitude: brute.lieuTravail?.longitude ?? null,
    tauxHoraire: tauxHoraireDepuisLibelle(brute.salaire?.libelle),
    salaireLibelle: brute.salaire?.libelle?.trim() || null,
    // "D" signifie debutant accepte ; "E" et "S" exigent de l'experience.
    experienceExigee: ['E', 'S'].includes((brute.experienceExige ?? '').toUpperCase()),
    nombrePostes: Math.max(1, brute.nombrePostes ?? 1),
    publieeLe: publiee,
    empreinte: empreinteOffre({ intituleNormalise, entreprise, commune, romeCode }),
  };
}

export interface ResultatNettoyage {
  offres: OffreNettoyee[];
  recues: number;
  ecartees: number;
  doublons: number;
  sansSalaire: number;
}

/**
 * Nettoie un lot et retire les republications. La premiere occurrence gagne :
 * a empreinte egale, c'est la plus anciennement publiee qui compte, pour ne pas
 * faire glisser la date de tension a chaque republication.
 */
export function nettoyerLot(brutes: OffreBrute[]): ResultatNettoyage {
  const parEmpreinte = new Map<string, OffreNettoyee>();
  let ecartees = 0;
  let doublons = 0;

  for (const brute of brutes) {
    const offre = nettoyerOffre(brute);

    if (!offre) {
      ecartees += 1;
      continue;
    }

    const deja = parEmpreinte.get(offre.empreinte);

    if (deja) {
      doublons += 1;

      if (offre.publieeLe < deja.publieeLe) {
        parEmpreinte.set(offre.empreinte, offre);
      }

      continue;
    }

    parEmpreinte.set(offre.empreinte, offre);
  }

  const offres = [...parEmpreinte.values()];

  return {
    offres,
    recues: brutes.length,
    ecartees,
    doublons,
    sansSalaire: offres.filter((offre) => offre.tauxHoraire === null).length,
  };
}

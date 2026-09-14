import {
  POIDS_COMPOSANTES,
  type ComposanteScore,
  type MotifExclusion,
  type ScoreDetail,
} from '@releve/shared';

/**
 * Le calcul du score, isolé de la base.
 *
 * Aucune dépendance à Prisma ni à Nest : ces fonctions se testent seules, avec
 * des valeurs écrites à la main. C'est ce qui permet de vérifier un barème sans
 * monter une base, et de le faire évoluer sans casser le reste.
 */

const MINUTES_PAR_JOUR = 24 * 60;

export interface CreneauCandidat {
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  valideDu: Date | null;
  valideAu: Date | null;
}

export interface ProfilAEvaluer {
  statut: string;
  filieres: string[];
  rayonKm: number;
  latitude: number | null;
  longitude: number | null;
  /** Date d'obtention du diplôme exigé, null s'il n'est pas détenu ou pas vérifié. */
  diplomeObtenuLe: Date | null;
  diplomeValide: boolean;
  creneaux: CreneauCandidat[];
  /** Périodes d'absence déclarées, bornes incluses. */
  absences: { du: Date; au: Date }[];
  /** Missions déjà décrochées, pour ne pas promettre deux fois la même heure. */
  engagements: { dateDebut: Date; dateFin: Date; heureDebut: string; heureFin: string }[];
}

export interface BesoinAPourvoir {
  filiere: string;
  dateDebut: Date;
  dateFin: Date;
  heureDebut: string;
  heureFin: string;
  latitude: number | null;
  longitude: number | null;
}

export function enMinutes(heure: string): number {
  const [h, m] = heure.split(':');

  return Number(h) * 60 + Number(m);
}

/** Durée d'une vacation, minuit franchi compris. */
export function dureeMinutes(heureDebut: string, heureFin: string): number {
  const debut = enMinutes(heureDebut);
  const fin = enMinutes(heureFin);

  return fin > debut ? fin - debut : fin + MINUTES_PAR_JOUR - debut;
}

/**
 * Distance à vol d'oiseau, formule de haversine.
 *
 * PostGIS ferait mieux, mais il faudrait une requête par couple. À l'échelle
 * d'un vivier d'agence — quelques centaines de fiches — le calcul en mémoire
 * est instantané et reste testable sans base.
 */
export function distanceKm(
  latA: number | null,
  lonA: number | null,
  latB: number | null,
  lonB: number | null,
): number | null {
  if (latA === null || lonA === null || latB === null || lonB === null) {
    return null;
  }

  const RAYON_TERRE_KM = 6371;
  const rad = (degres: number): number => (degres * Math.PI) / 180;

  const dLat = rad(latB - latA);
  const dLon = rad(lonB - lonA);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(dLon / 2) ** 2;

  return Math.round(RAYON_TERRE_KM * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/** Chaque jour couvert par la mission, bornes incluses. */
function joursDeLaMission(besoin: BesoinAPourvoir): Date[] {
  const jours: Date[] = [];
  const curseur = new Date(besoin.dateDebut);

  while (curseur <= besoin.dateFin && jours.length < 366) {
    jours.push(new Date(curseur));
    curseur.setDate(curseur.getDate() + 1);
  }

  return jours;
}

/** 1 = lundi … 7 = dimanche, comme ISO-8601. */
function jourIso(date: Date): number {
  return date.getUTCDay() === 0 ? 7 : date.getUTCDay();
}

function creneauActif(creneau: CreneauCandidat, jour: Date): boolean {
  if (creneau.valideDu && jour < creneau.valideDu) return false;
  if (creneau.valideAu && jour > creneau.valideAu) return false;

  return true;
}

/**
 * Part de la vacation couverte par les disponibilités déclarées, entre 0 et 1.
 *
 * On raisonne en minutes plutôt qu'en « disponible ou non » : une intervenante
 * disponible de 7 h à 12 h sur une vacation de 7 h à 14 h couvre les cinq
 * septièmes du besoin, et cette information vaut mieux qu'un refus sec.
 */
export function couvertureDisponibilite(
  profil: ProfilAEvaluer,
  besoin: BesoinAPourvoir,
): number {
  const jours = joursDeLaMission(besoin);

  if (jours.length === 0) {
    return 0;
  }

  const debutVacation = enMinutes(besoin.heureDebut);
  const dureeVacation = dureeMinutes(besoin.heureDebut, besoin.heureFin);

  if (dureeVacation === 0) {
    return 0;
  }

  let couvertes = 0;

  for (const jour of jours) {
    // La vacation est projetée sur une ligne de temps de deux jours : celle qui
    // franchit minuit déborde sur le lendemain, et les créneaux du lendemain
    // doivent donc être examinés aussi.
    const fenetre: [number, number] = [debutVacation, debutVacation + dureeVacation];

    const jourSuivant = new Date(jour);
    jourSuivant.setDate(jourSuivant.getDate() + 1);

    const segments: [number, number][] = [];

    for (const creneau of profil.creneaux) {
      for (const [date, decalage] of [
        [jour, 0],
        [jourSuivant, MINUTES_PAR_JOUR],
      ] as [Date, number][]) {
        if (creneau.jourSemaine !== jourIso(date) || !creneauActif(creneau, date)) {
          continue;
        }

        const debut = decalage + enMinutes(creneau.heureDebut);
        const duree = dureeMinutes(creneau.heureDebut, creneau.heureFin);

        segments.push([debut, debut + duree]);
      }
    }

    couvertes += minutesCouvertes(fenetre, segments);
  }

  return couvertes / (dureeVacation * jours.length);
}

/** Minutes de `fenetre` couvertes par l'union de `segments`. */
function minutesCouvertes(fenetre: [number, number], segments: [number, number][]): number {
  const bornes = segments
    .map(([debut, fin]): [number, number] => [
      Math.max(debut, fenetre[0]),
      Math.min(fin, fenetre[1]),
    ])
    .filter(([debut, fin]) => fin > debut)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let finCourante = -Infinity;

  for (const [debut, fin] of bornes) {
    // Union plutôt que somme : deux créneaux qui se recouvrent ne comptent pas
    // deux fois la même heure.
    total += Math.max(0, fin - Math.max(debut, finCourante));
    finCourante = Math.max(finCourante, fin);
  }

  return total;
}

function periodesSeChevauchent(aDebut: Date, aFin: Date, bDebut: Date, bFin: Date): boolean {
  return aDebut <= bFin && bDebut <= aFin;
}

/**
 * Porte d'éligibilité : binaire, et antérieure au score.
 *
 * Rien ne sert de classer quelqu'un qui ne peut pas y aller. Chaque refus porte
 * son motif : l'agence sait quoi corriger, et le candidat, côté public, sait ce
 * qui lui manque.
 */
export function motifsExclusion(
  profil: ProfilAEvaluer,
  besoin: BesoinAPourvoir,
): MotifExclusion[] {
  const motifs: MotifExclusion[] = [];

  if (profil.statut !== 'ACTIF') {
    motifs.push({ cle: 'statut', libelle: "Profil non valide par l'agence" });
  }

  if (!profil.filieres.includes(besoin.filiere)) {
    motifs.push({
      cle: 'filiere',
      libelle: `Filiere ${besoin.filiere.toLowerCase()} absente du profil`,
    });
  }

  if (!profil.diplomeValide) {
    motifs.push({ cle: 'diplome', libelle: 'Diplome exige non detenu, non verifie ou expire' });
  }

  const absent = profil.absences.some((absence) =>
    periodesSeChevauchent(absence.du, absence.au, besoin.dateDebut, besoin.dateFin),
  );

  if (absent) {
    motifs.push({ cle: 'indisponible', libelle: 'Absence declaree sur la periode' });
  }

  const engage = profil.engagements.some((mission) =>
    periodesSeChevauchent(mission.dateDebut, mission.dateFin, besoin.dateDebut, besoin.dateFin),
  );

  if (engage) {
    motifs.push({ cle: 'deja-engage', libelle: 'Deja retenu sur une mission de la periode' });
  }

  const distance = distanceKm(
    profil.latitude,
    profil.longitude,
    besoin.latitude,
    besoin.longitude,
  );

  if (distance === null) {
    // Sans coordonnees, on ne peut ni mesurer ni affirmer : on ecarte en le
    // disant, plutot que d'attribuer une distance nulle qui ferait remonter la
    // fiche en tete du classement.
    motifs.push({ cle: 'sans-adresse', libelle: 'Coordonnees manquantes, distance non mesurable' });
  } else if (distance > profil.rayonKm) {
    motifs.push({
      cle: 'hors-rayon',
      libelle: `A ${distance} km, au-dela du rayon de ${profil.rayonKm} km`,
    });
  }

  return motifs;
}

function anneesDepuis(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/**
 * Score sur 100, décomposé en trois lignes lisibles.
 *
 * Le barème est délibérément simple et explicable de vive voix. Un modèle plus
 * fin serait moins défendable : ici, chaque point se justifie par une donnée
 * que l'agence peut montrer au candidat.
 */
export function calculerScore(profil: ProfilAEvaluer, besoin: BesoinAPourvoir): ScoreDetail {
  const composantes: ComposanteScore[] = [];

  // --- Compétences : le diplôme est acquis (la porte l'a vérifié), c'est son
  // ancienneté qui départage. Plafonnée à dix ans : au-delà, l'écart entre deux
  // professionnels ne se lit plus dans la date d'obtention.
  const maxCompetences = POIDS_COMPOSANTES.competences;
  const socle = Math.round(maxCompetences * 0.6);
  const annees = profil.diplomeObtenuLe ? anneesDepuis(profil.diplomeObtenuLe) : 0;
  const experience = Math.round((maxCompetences - socle) * Math.min(annees / 10, 1));

  composantes.push({
    cle: 'competences',
    libelle: 'Competences',
    points: socle + experience,
    sur: maxCompetences,
    explication: profil.diplomeObtenuLe
      ? `Diplome exige detenu, obtenu il y a ${Math.floor(annees)} an${Math.floor(annees) > 1 ? 's' : ''}`
      : 'Diplome exige detenu, date d obtention inconnue',
  });

  // --- Zone : décroissance linéaire jusqu'au rayon déclaré.
  const maxZone = POIDS_COMPOSANTES.zone;
  const distance = distanceKm(
    profil.latitude,
    profil.longitude,
    besoin.latitude,
    besoin.longitude,
  );

  const pointsZone =
    distance === null
      ? 0
      : Math.round(maxZone * Math.max(0, 1 - distance / Math.max(profil.rayonKm, 1)));

  composantes.push({
    cle: 'zone',
    libelle: 'Zone',
    points: pointsZone,
    sur: maxZone,
    explication:
      distance === null
        ? 'Distance non mesurable'
        : `A ${distance} km du lieu, pour un rayon declare de ${profil.rayonKm} km`,
  });

  // --- Disponibilité : part de la vacation réellement couverte.
  const maxDispo = POIDS_COMPOSANTES.disponibilite;
  const couverture = couvertureDisponibilite(profil, besoin);

  composantes.push({
    cle: 'disponibilite',
    libelle: 'Disponibilite',
    points: Math.round(maxDispo * couverture),
    sur: maxDispo,
    explication: profil.creneaux.length
      ? `${Math.round(couverture * 100)} % du creneau couvert par les disponibilites declarees`
      : 'Aucune disponibilite declaree',
  });

  return {
    total: composantes.reduce((somme, composante) => somme + composante.points, 0),
    composantes,
  };
}

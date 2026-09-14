/**
 * Donnees de demonstration des ecrans issus du Figma.
 *
 * Le domaine « mission » n'existe pas encore cote API : `backend/src` ne
 * couvre que auth, candidats, clients, qualifications et utilisateurs. Les
 * contrats sont en revanche deja amorces dans `shared/src/enums.ts`
 * (`statutMissionSchema`, `statutPropositionSchema`).
 *
 * Tout ce qui est affichable est donc regroupe ici, hors des vues, pour que le
 * jour ou les endpoints existent le remplacement se limite a ce fichier : les
 * pages consommeront `useApi().requete('/missions')` sans changer de forme.
 *
 * Les libelles reprennent la copie du Figma, y compris les mentions
 * « Exemple fictif » / « Profil fictif » voulues par le design.
 */

export interface Etablissement {
  readonly nom: string;
  readonly initiales: string;
  readonly localisation: string;
}

export interface Prerequis {
  readonly libelle: string;
  /** Un prerequis verifie est mis en avant en vert, les autres en neutre. */
  readonly verifie: boolean;
}

export interface Mission {
  readonly id: string;
  readonly etablissement: Etablissement;
  readonly urgente: boolean;
  readonly categorie: string | null;
  /** Libelle court pour la liste : « Aujourd'hui », « Sam. 19 sept. ». */
  readonly jour: string;
  readonly horaires: string;
  /** Libelle long pour la fiche : « Lundi 14 septembre 2026 ». */
  readonly dateComplete: string;
  readonly duree: string;
  /** Forme courte, affichee en pied de carte : « 18,50 €/h ». */
  readonly tauxHoraire: string;
  /** Forme longue, affichee sur la fiche : « 18,50 € brut / heure ». */
  readonly remuneration: string;
  readonly adresse: string;
  readonly description: string;
  readonly prerequis: readonly Prerequis[];
}

export const MISSIONS: readonly Mission[] = [
  {
    id: 'jardins-aurore',
    etablissement: {
      nom: "Les Jardins d'Aurore",
      initiales: 'LE',
      localisation: 'Lyon 7e - Exemple fictif',
    },
    urgente: true,
    categorie: 'EHPAD',
    jour: "Aujourd'hui",
    horaires: '18:00-22:00',
    dateComplete: 'Lundi 14 septembre 2026',
    duree: '4 heures',
    tauxHoraire: '18,50 EUR/h',
    remuneration: '18,50 EUR brut / heure',
    adresse: '12 rue des Lilas, Lyon 7e',
    description:
      "Accompagner l'equipe du soir dans les soins d'hygiene et de confort, l'aide aux repas et les transmissions. Doublure de 15 minutes prevue a l'arrivee.",
    prerequis: [
      { libelle: 'Diplome verifie', verifie: true },
      { libelle: 'Experience geriatrie', verifie: false },
    ],
  },
  {
    id: 'residence-tilleuls',
    etablissement: {
      nom: 'Residence des Tilleuls',
      initiales: 'RE',
      localisation: 'Villeurbanne - Exemple fictif',
    },
    urgente: false,
    categorie: null,
    jour: 'Demain',
    horaires: '07:00-14:00',
    dateComplete: 'Mardi 15 septembre 2026',
    duree: '7 heures',
    tauxHoraire: '17,80 EUR/h',
    remuneration: '17,80 EUR brut / heure',
    adresse: '4 avenue des Tilleuls, Villeurbanne',
    description:
      "Renfort du matin aupres de l'equipe soignante : levers, aide a la toilette, service du petit-dejeuner et transmissions ecrites.",
    prerequis: [{ libelle: 'Diplome verifie', verifie: true }],
  },
  {
    id: 'maison-saint-clair',
    etablissement: {
      nom: 'Maison Saint-Clair',
      initiales: 'MA',
      localisation: 'Oullins - Exemple fictif',
    },
    urgente: false,
    categorie: null,
    jour: 'Sam. 19 sept.',
    horaires: '08:00-20:00',
    dateComplete: 'Samedi 19 septembre 2026',
    duree: '12 heures',
    tauxHoraire: '19,20 EUR/h',
    remuneration: '19,20 EUR brut / heure',
    adresse: '27 chemin du Clair, Oullins',
    description:
      "Journee complete en unite de vie, en binome avec une aide-soignante de l'etablissement. Pause de 45 minutes prevue.",
    prerequis: [
      { libelle: 'Diplome verifie', verifie: true },
      { libelle: 'Experience geriatrie', verifie: false },
    ],
  },
];

export const FILTRES: readonly string[] = ['A proximite', "Aujourd'hui", 'Mieux remunerees'];

export function trouverMission(id: string): Mission | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}

/* -------------------------------------------------------------------------- */
/* Suivi de mission (cote soignant)                                            */
/* -------------------------------------------------------------------------- */

export interface Contact {
  readonly nom: string;
  readonly initiales: string;
  readonly fonction: string;
}

export interface MissionConfirmee {
  readonly etablissement: Etablissement;
  readonly adresse: string;
  readonly jour: string;
  readonly horaires: string;
  readonly debutDans: string;
  readonly contact: Contact;
  readonly checklist: readonly string[];
}

export const MISSION_CONFIRMEE: MissionConfirmee = {
  etablissement: {
    nom: 'Residence des Cedres',
    initiales: 'RC',
    localisation: 'Etablissement fictif - Lyon 3e',
  },
  adresse: '8 rue des Cedres, Lyon 3e',
  jour: "Aujourd'hui",
  horaires: '18:00-22:00',
  debutDans: '8 h 18 min',
  contact: {
    nom: 'Sophie Laurent',
    initiales: 'SL',
    fonction: 'Cadre de sante - Profil fictif',
  },
  checklist: ["Piece d'identite verifiee", 'Diplome valide', 'Consignes consultees'],
};

/* -------------------------------------------------------------------------- */
/* Espace etablissement                                                        */
/* -------------------------------------------------------------------------- */

export interface Statistique {
  readonly valeur: number;
  readonly libelle: string;
  readonly teinte: 'vert' | 'lavande' | 'corail';
}

export const STATISTIQUES: readonly Statistique[] = [
  { valeur: 3, libelle: 'Missions actives', teinte: 'vert' },
  { valeur: 8, libelle: 'Candidatures recues', teinte: 'lavande' },
  { valeur: 2, libelle: 'A confirmer', teinte: 'corail' },
];

export const ETABLISSEMENT_CONNECTE = {
  contact: 'Sophie',
  nom: 'Residence des Cedres',
  mention: 'Etablissement fictif',
} as const;

export const MISSION_DU_SOIR = {
  titre: 'Mission de ce soir',
  poste: 'Aide-soignant-e - 18:00-22:00',
  lieu: 'Unite protegee - Lyon 3e',
  candidats: 2,
} as const;

/* -------------------------------------------------------------------------- */
/* Profil candidat vu par un etablissement                                     */
/* -------------------------------------------------------------------------- */

export interface PointFort {
  readonly icone: 'briefcase' | 'star' | 'map-pin';
  readonly libelle: string;
  readonly valeur: string;
}

export interface Candidat {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly initiales: string;
  readonly qualification: string;
  readonly etiquettes: readonly string[];
  readonly score: number;
  readonly correspondance: string;
  readonly justification: string;
  readonly pointsForts: readonly PointFort[];
  readonly message: string;
}

export const CANDIDATS: readonly Candidat[] = [
  {
    id: 'camille-martin',
    nom: 'Camille Martin',
    prenom: 'Camille',
    initiales: 'CM',
    qualification: 'Aide-soignante diplomee - Profil fictif',
    etiquettes: ['Identite verifiee', 'Disponible'],
    score: 92,
    correspondance: 'Excellente correspondance',
    justification: 'Disponible ce soir, a 3,2 km et experimentee en unite protegee.',
    pointsForts: [
      { icone: 'briefcase', libelle: 'Experience', valeur: '6 ans en geriatrie' },
      { icone: 'star', libelle: 'Evaluations', valeur: '4,9 / 5 - 24 missions' },
      { icone: 'map-pin', libelle: 'Mobilite', valeur: 'Rayon de 15 km' },
    ],
    message:
      '« Bonjour, je connais bien le travail en unite protegee et je peux etre sur place des 17:45. »',
  },
];

export function trouverCandidat(id: string): Candidat | undefined {
  return CANDIDATS.find((candidat) => candidat.id === id);
}

/* -------------------------------------------------------------------------- */
/* Publication d'une mission                                                   */
/* -------------------------------------------------------------------------- */

export const POSTES: readonly string[] = [
  'Aide-soignant-e diplome-e',
  'Auxiliaire de vie',
  'Agent de service hospitalier',
];

export const UNITES: readonly string[] = ['Unite protegee', 'Unite de vie', 'Accueil de jour'];

export const NIVEAUX_URGENCE: readonly string[] = ['Dans les 2 h', "Aujourd'hui", 'Planifiee'];

export const CRENEAUX: readonly string[] = ['18:00-22:00', '07:00-14:00', '08:00-20:00'];

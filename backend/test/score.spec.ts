import { describe, expect, it } from 'vitest';
import {
  calculerScore,
  couvertureDisponibilite,
  distanceKm,
  dureeMinutes,
  motifsExclusion,
  type BesoinAPourvoir,
  type ProfilAEvaluer,
} from '../src/matching/score';

/**
 * Le bareme, teste seul.
 *
 * Aucune base, aucun reseau : ce fichier verifie la regle de calcul, pas son
 * cablage. C'est ce qui permet de discuter un poids ou une decroissance sans
 * monter un environnement, et de savoir immediatement ce qu'un changement casse.
 */

/** Une mission de reference : demain, 07:00-14:00, a Nantes. */
function besoin(surcharge: Partial<BesoinAPourvoir> = {}): BesoinAPourvoir {
  return {
    filiere: 'DOMICILE',
    // Un lundi, pour que le jour de la semaine soit previsible.
    dateDebut: new Date('2026-09-14T00:00:00Z'),
    dateFin: new Date('2026-09-14T00:00:00Z'),
    heureDebut: '07:00',
    heureFin: '14:00',
    latitude: 47.2184,
    longitude: -1.5536,
    ...surcharge,
  };
}

/** Un profil eligible : actif, diplome, sur place, disponible tout le creneau. */
function profil(surcharge: Partial<ProfilAEvaluer> = {}): ProfilAEvaluer {
  return {
    statut: 'ACTIF',
    filieres: ['DOMICILE'],
    rayonKm: 20,
    latitude: 47.2184,
    longitude: -1.5536,
    diplomeObtenuLe: new Date('2016-06-30'),
    diplomeValide: true,
    creneaux: [
      { jourSemaine: 1, heureDebut: '07:00', heureFin: '14:00', valideDu: null, valideAu: null },
    ],
    absences: [],
    engagements: [],
    ...surcharge,
  };
}

describe('duree et distance', () => {
  it('compte une vacation de jour', () => {
    expect(dureeMinutes('07:00', '14:00')).toBe(420);
  });

  it('compte une vacation qui franchit minuit', () => {
    expect(dureeMinutes('20:00', '07:00')).toBe(660);
  });

  it('mesure une distance connue', () => {
    // Nantes centre -> Reze, environ 5 km a vol d'oiseau.
    const km = distanceKm(47.2184, -1.5536, 47.1836, -1.5494);

    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(6);
  });

  it('ne devine pas une distance quand un point manque', () => {
    expect(distanceKm(47.2, -1.5, null, null)).toBeNull();
  });
});

describe('couverture des disponibilites', () => {
  it('couvre entierement un creneau identique', () => {
    expect(couvertureDisponibilite(profil(), besoin())).toBe(1);
  });

  it('couvre partiellement un creneau plus court', () => {
    const partiel = profil({
      creneaux: [
        { jourSemaine: 1, heureDebut: '07:00', heureFin: '12:00', valideDu: null, valideAu: null },
      ],
    });

    // Cinq heures sur sept.
    expect(couvertureDisponibilite(partiel, besoin())).toBeCloseTo(5 / 7, 3);
  });

  it('ne couvre rien le mauvais jour de la semaine', () => {
    const mardi = profil({
      creneaux: [
        { jourSemaine: 2, heureDebut: '07:00', heureFin: '14:00', valideDu: null, valideAu: null },
      ],
    });

    expect(couvertureDisponibilite(mardi, besoin())).toBe(0);
  });

  /**
   * Le cas qui casse les implementations naives : une vacation 20:00-07:00
   * appartient a deux jours civils, et la disponibilite du lendemain matin
   * compte.
   */
  it('recolle les deux moities d une vacation de nuit', () => {
    const nuit = profil({
      creneaux: [
        { jourSemaine: 1, heureDebut: '20:00', heureFin: '00:00', valideDu: null, valideAu: null },
        { jourSemaine: 2, heureDebut: '00:00', heureFin: '07:00', valideDu: null, valideAu: null },
      ],
    });

    const vacation = besoin({ heureDebut: '20:00', heureFin: '07:00' });

    expect(couvertureDisponibilite(nuit, vacation)).toBeCloseTo(1, 2);
  });

  it('ne compte pas deux fois deux creneaux qui se recouvrent', () => {
    const doublon = profil({
      creneaux: [
        { jourSemaine: 1, heureDebut: '07:00', heureFin: '12:00', valideDu: null, valideAu: null },
        { jourSemaine: 1, heureDebut: '09:00', heureFin: '14:00', valideDu: null, valideAu: null },
      ],
    });

    expect(couvertureDisponibilite(doublon, besoin())).toBe(1);
  });

  it('ignore un creneau hors de sa periode de validite', () => {
    const perime = profil({
      creneaux: [
        {
          jourSemaine: 1,
          heureDebut: '07:00',
          heureFin: '14:00',
          valideDu: null,
          valideAu: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    });

    expect(couvertureDisponibilite(perime, besoin())).toBe(0);
  });
});

describe('porte d eligibilite', () => {
  it('laisse passer un profil complet', () => {
    expect(motifsExclusion(profil(), besoin())).toEqual([]);
  });

  it('ecarte un profil non valide par l agence', () => {
    const motifs = motifsExclusion(profil({ statut: 'EN_VERIFICATION' }), besoin());

    expect(motifs.map((m) => m.cle)).toContain('statut');
  });

  it('ecarte une filiere absente du profil', () => {
    const motifs = motifsExclusion(profil({ filieres: ['ETABLISSEMENT'] }), besoin());

    expect(motifs.map((m) => m.cle)).toContain('filiere');
  });

  it('ecarte un diplome non detenu ou expire', () => {
    const motifs = motifsExclusion(profil({ diplomeValide: false }), besoin());

    expect(motifs.map((m) => m.cle)).toContain('diplome');
  });

  it('ecarte une absence declaree sur la periode', () => {
    const absent = profil({
      absences: [{ du: new Date('2026-09-10T00:00:00Z'), au: new Date('2026-09-20T00:00:00Z') }],
    });

    expect(motifsExclusion(absent, besoin()).map((m) => m.cle)).toContain('indisponible');
  });

  it('ecarte quelqu un deja retenu sur la meme periode', () => {
    const pris = profil({
      engagements: [
        {
          dateDebut: new Date('2026-09-14T00:00:00Z'),
          dateFin: new Date('2026-09-14T00:00:00Z'),
          heureDebut: '08:00',
          heureFin: '12:00',
        },
      ],
    });

    expect(motifsExclusion(pris, besoin()).map((m) => m.cle)).toContain('deja-engage');
  });

  it('ecarte au-dela du rayon declare, en le chiffrant', () => {
    // Rennes, a une centaine de kilometres de Nantes.
    const loin = profil({ latitude: 48.1173, longitude: -1.6778, rayonKm: 20 });
    const motif = motifsExclusion(loin, besoin()).find((m) => m.cle === 'hors-rayon');

    expect(motif).toBeDefined();
    expect(motif?.libelle).toMatch(/rayon de 20 km/);
  });

  /**
   * Sans coordonnees, la distance vaudrait zero dans une implementation naive,
   * et la fiche remonterait en tete du classement. On ecarte en le disant.
   */
  it('ecarte une fiche sans coordonnees plutot que de la croire sur place', () => {
    const sansAdresse = profil({ latitude: null, longitude: null });

    expect(motifsExclusion(sansAdresse, besoin()).map((m) => m.cle)).toContain('sans-adresse');
  });
});

describe('score', () => {
  it('donne le maximum a un profil parfait', () => {
    const score = calculerScore(profil(), besoin());

    expect(score.total).toBe(100);
    expect(score.composantes).toHaveLength(3);
  });

  it('decompose toujours le total en trois lignes explicables', () => {
    const score = calculerScore(profil(), besoin());

    expect(score.composantes.map((c) => c.cle)).toEqual(['competences', 'zone', 'disponibilite']);
    expect(score.composantes.reduce((somme, c) => somme + c.points, 0)).toBe(score.total);

    for (const composante of score.composantes) {
      expect(composante.explication.length).toBeGreaterThan(10);
      expect(composante.points).toBeLessThanOrEqual(composante.sur);
    }
  });

  it('fait decroitre la note de zone avec la distance', () => {
    const proche = calculerScore(profil(), besoin());
    const lointain = calculerScore(profil({ latitude: 47.1836, longitude: -1.5494 }), besoin());

    const noteProche = proche.composantes.find((c) => c.cle === 'zone')?.points ?? 0;
    const noteLointaine = lointain.composantes.find((c) => c.cle === 'zone')?.points ?? 0;

    expect(noteLointaine).toBeLessThan(noteProche);
  });

  it('penalise une disponibilite partielle a proportion', () => {
    const partiel = profil({
      creneaux: [
        { jourSemaine: 1, heureDebut: '07:00', heureFin: '12:00', valideDu: null, valideAu: null },
      ],
    });

    const note = calculerScore(partiel, besoin()).composantes.find(
      (c) => c.cle === 'disponibilite',
    );

    expect(note?.points).toBe(Math.round(25 * (5 / 7)));
    expect(note?.explication).toMatch(/71 %/);
  });

  it('valorise l anciennete du diplome sans la laisser tout emporter', () => {
    const jeune = calculerScore(profil({ diplomeObtenuLe: new Date() }), besoin());
    const ancien = calculerScore(profil({ diplomeObtenuLe: new Date('2010-01-01') }), besoin());

    const noteJeune = jeune.composantes.find((c) => c.cle === 'competences')?.points ?? 0;
    const noteAncienne = ancien.composantes.find((c) => c.cle === 'competences')?.points ?? 0;

    // Le socle reste majoritaire : un diplome recent garde 60 % de la composante.
    expect(noteJeune).toBe(24);
    expect(noteAncienne).toBe(40);
  });
});

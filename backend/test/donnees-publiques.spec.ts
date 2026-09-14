import type { INestApplication } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { avec, connecter, type Session } from './aide';
import { creerApp, prisma, reinitialiser } from './fixtures';
import { OffresService } from '../src/donnees-publiques/offres.service';

/** Offre brute minimale, au format exact de l'API France Travail. */
function offre(surcharge: Record<string, unknown> = {}) {
  return {
    id: `X${Math.random().toString(36).slice(2, 9)}`,
    intitule: 'Aide soignant (F/H)',
    appellationlibelle: 'Aide-soignant / Aide-soignante',
    romeCode: 'J1501',
    romeLibelle: 'Aide-soignant / Aide-soignante',
    entreprise: { nom: `AGENCE ${Math.random().toString(36).slice(2, 6)}` },
    lieuTravail: { libelle: '44 - NANTES', commune: 'Nantes', codePostal: '44000' },
    salaire: { libelle: 'Horaire de 14.0 Euros' },
    typeContrat: 'MIS',
    dateCreation: new Date().toISOString(),
    ...surcharge,
  };
}

/**
 * La chaine de donnees publiques, de l'instantane au barometre.
 *
 * Le reseau n'est jamais sollicite : les tests passent par l'import de fichier,
 * qui rejoue exactement le meme nettoyage que l'appel a l'API. Une suite qui
 * dependrait de France Travail echouerait le jour de la soutenance.
 */
describe('donnees publiques', () => {
  let app: INestApplication;
  let offres: OffresService;
  let agence: Session;

  beforeAll(async () => {
    app = await creerApp();
    await reinitialiser();
    offres = app.get(OffresService);
    agence = await connecter(app, 'charge.a@test.example');
    await prisma.offreCollectee.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('import', () => {
    it('nettoie, dedoublonne et enregistre', async () => {
      const employeur = { nom: 'APPEL MEDICAL' };
      const lot = JSON.stringify({
        resultats: [
          offre({ id: 'A1', entreprise: employeur, salaire: { libelle: 'Horaire de 13.0 Euros' } }),
          // Republication : meme metier, meme employeur, meme commune.
          offre({ id: 'A2', entreprise: employeur, salaire: { libelle: 'Horaire de 13.0 Euros' } }),
          offre({ id: 'A3', salaire: { libelle: 'Horaire de 15.0 Euros' } }),
          // Sans lieu exploitable : ecartee.
          offre({ id: 'A4', lieuTravail: { libelle: 'France entiere', commune: 'Nantes' } }),
        ],
      });

      const rapport = await offres.importerDepuisFichier(lot);

      expect(rapport.recues).toBe(4);
      expect(rapport.ecartees).toBe(1);
      expect(rapport.doublons).toBe(1);
      expect(rapport.enregistrees).toBe(2);
      expect(await prisma.offreCollectee.count()).toBe(2);
    });

    it('est idempotent : un second import ne duplique rien', async () => {
      const lot = JSON.stringify({ resultats: [offre({ id: 'B1' })] });

      await offres.importerDepuisFichier(lot);
      const apresPremier = await prisma.offreCollectee.count();

      await offres.importerDepuisFichier(lot);

      expect(await prisma.offreCollectee.count()).toBe(apresPremier);
    });

    it('ne touche pas la base en simulation', async () => {
      const avant = await prisma.offreCollectee.count();

      const rapport = await offres.importerDepuisFichier(
        JSON.stringify({ resultats: [offre({ id: 'C1' })] }),
        true,
      );

      expect(rapport.simulation).toBe(true);
      expect(rapport.enregistrees).toBe(0);
      expect(await prisma.offreCollectee.count()).toBe(avant);
    });

    /**
     * Garde-fou sur le format reel : si France Travail change la forme de ses
     * reponses, ce test tombe avant que le barometre ne se vide en silence.
     */
    it('traite l instantane reel livre avec le depot', async () => {
      const chemin = join(process.cwd(), 'donnees', 'offres-echantillon.json');
      const rapport = await offres.importerDepuisFichier(await readFile(chemin, 'utf8'), true);

      expect(rapport.recues).toBeGreaterThan(50);
      expect(rapport.offres.length).toBeGreaterThan(40);
      // Le nettoyage doit rester utile : au moins un tiers des offres retenues
      // porte un taux exploitable.
      expect(rapport.offres.length - rapport.sansSalaire).toBeGreaterThan(
        rapport.offres.length / 3,
      );
    });
  });

  describe('barometre', () => {
    beforeAll(async () => {
      await prisma.offreCollectee.deleteMany();

      // Cinq offres a Nantes, de taux connus : la mediane vaut 14.
      const taux = [12, 13, 14, 15, 16];
      const lot = taux.map((valeur, index) =>
        offre({
          id: `M${index}`,
          entreprise: { nom: `EMPLOYEUR ${index}` },
          salaire: { libelle: `Horaire de ${valeur}.0 Euros` },
          experienceExige: index < 2 ? 'E' : 'D',
        }),
      );

      // Une offre sans salaire : elle compte dans le volume, pas dans la mediane.
      lot.push(
        offre({ id: 'M9', entreprise: { nom: 'EMPLOYEUR 9' }, salaire: undefined }) as never,
      );

      await offres.importerDepuisFichier(JSON.stringify({ resultats: lot }));
    });

    it('calcule la mediane sur les seules offres chiffrees', async () => {
      const barometre = await offres.barometre(30, '44');
      const metier = barometre.metiers.find((ligne) => ligne.romeCode === 'J1501');

      expect(metier?.offres).toBe(6);
      expect(metier?.tauxHoraireMedian).toBe(14);
      expect(metier?.offresSansSalaire).toBe(1);
      expect(metier?.tauxHoraireMin).toBe(12);
      expect(metier?.tauxHoraireMax).toBe(16);
    });

    it('rapporte la part d offres exigeant de l experience', async () => {
      const barometre = await offres.barometre(30, '44');
      const metier = barometre.metiers.find((ligne) => ligne.romeCode === 'J1501');

      // Deux sur six.
      expect(metier?.partExperienceExigee).toBe(33);
    });

    it('ne voit rien hors de la periode observee', async () => {
      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [
            offre({
              id: 'VIEUX',
              entreprise: { nom: 'ANCIEN EMPLOYEUR' },
              dateCreation: new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString(),
            }),
          ],
        }),
      );

      const recent = await offres.barometre(7, '44');
      const metier = recent.metiers.find((ligne) => ligne.romeCode === 'J1501');

      expect(metier?.offres).toBe(6);
    });

    it('suggere un taux pour le departement demande', async () => {
      const suggestion = await offres.tauxSuggere('J1501', '44', 30);

      expect(suggestion.tauxHoraireMedian).toBe(14);
      expect(suggestion.perimetre).toBe('departemental');
    });

    it('retombe sur le national quand le departement ne dit rien', async () => {
      const suggestion = await offres.tauxSuggere('J1501', '09', 30);

      expect(suggestion.perimetre).toBe('national');
      expect(suggestion.tauxHoraireMedian).toBe(14);
    });

    it('n invente pas de taux pour un metier inconnu', async () => {
      const suggestion = await offres.tauxSuggere('A1101', '44', 30);

      expect(suggestion.tauxHoraireMedian).toBeNull();
      expect(suggestion.perimetre).toBe('aucun');
    });
  });

  describe('exposition par l API', () => {
    it('exige une session', async () => {
      await request(app.getHttpServer()).get('/api/tension').expect(401);
    });

    it('repond au personnel de l agence', async () => {
      const reponse = await avec(app, agence).get('/api/tension?jours=30&departement=44').expect(200);

      expect(reponse.body.periodeJours).toBe(30);
      expect(reponse.body.metiers[0].romeCode).toBe('J1501');
    });

    it('refuse un departement mal forme', async () => {
      const reponse = await avec(app, agence).get('/api/tension?departement=zz').expect(400);

      expect(reponse.body.erreurs[0].champ).toBe('departement');
    });

    it('sert la suggestion de taux', async () => {
      const reponse = await avec(app, agence)
        .get('/api/tension/suggestion?rome=J1501&departement=44&jours=30')
        .expect(200);

      expect(reponse.body.tauxHoraireMedian).toBe(14);
      expect(reponse.body.perimetre).toBe('departemental');
    });

    it('refuse un code ROME mal forme', async () => {
      await avec(app, agence).get('/api/tension/suggestion?rome=abc').expect(400);
    });
  });
});

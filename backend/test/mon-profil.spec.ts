import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { avec, connecter, type Session } from './aide';
import { creerApp, prisma, reinitialiser, type Jeu } from './fixtures';

/**
 * L'espace personnel de l'interimaire.
 *
 * L'enjeu n'est pas ce qu'il peut faire, mais ce qu'il ne peut pas : se rendre
 * actif, se declarer un diplome verifie, ou toucher la fiche d'un autre. Chaque
 * garde-fou a son test.
 */
describe('mon profil', () => {
  let app: INestApplication;
  let jeu: Jeu;
  let candidat: Session;
  let agence: Session;

  beforeAll(async () => {
    app = await creerApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jeu = await reinitialiser();
    candidat = await connecter(app, 'candidat.a@test.example');
    agence = await connecter(app, 'charge.a@test.example');
  });

  describe('lecture', () => {
    it('sert sa propre fiche au candidat', async () => {
      const reponse = await avec(app, candidat).get('/api/mon-profil').expect(200);

      expect(reponse.body.id).toBe(jeu.candidatA);
      expect(reponse.body.nom).toBe('Aubry');
    });

    it('exige une session', async () => {
      await request(app.getHttpServer()).get('/api/mon-profil').expect(401);
    });

    it('refuse le personnel de l agence, qui a ses propres routes', async () => {
      await avec(app, agence).get('/api/mon-profil').expect(403);
    });
  });

  describe('completude', () => {
    it('enumere ce qui manque pour devenir proposable', async () => {
      const reponse = await avec(app, candidat).get('/api/mon-profil/completude').expect(200);

      const cles = reponse.body.manques.map((m: { cle: string }) => m.cle);

      // La fixture n'a ni diplome, ni coordonnees, ni creneau.
      expect(cles).toContain('diplome');
      expect(cles).toContain('adresse');
      expect(cles).toContain('disponibilites');
      expect(reponse.body.pourcentage).toBeLessThan(100);
    });

    it('progresse quand le profil se complete', async () => {
      const avant = await avec(app, candidat).get('/api/mon-profil/completude').expect(200);

      await avec(app, candidat)
        .patch('/api/mon-profil')
        .send({ latitude: 47.2184, longitude: -1.5536 })
        .expect(200);

      const apres = await avec(app, candidat).get('/api/mon-profil/completude').expect(200);

      expect(apres.body.pourcentage).toBeGreaterThan(avant.body.pourcentage);
    });
  });

  describe('modification', () => {
    it('met a jour le secteur et la mobilite', async () => {
      const reponse = await avec(app, candidat)
        .patch('/api/mon-profil')
        .send({ rayonKm: 45, vehicule: true, ville: 'Reze' })
        .expect(200);

      expect(reponse.body.rayonKm).toBe(45);
      expect(reponse.body.vehicule).toBe(true);
      expect(reponse.body.ville).toBe('Reze');
    });

    /** Se rendre actif soi-meme viderait la verification de son sens. */
    it('ignore une tentative de se rendre actif', async () => {
      await prisma.candidat.update({
        where: { id: jeu.candidatA },
        data: { statut: 'EN_VERIFICATION' },
      });

      const reponse = await avec(app, candidat)
        .patch('/api/mon-profil')
        .send({ statut: 'ACTIF', rayonKm: 30 })
        .expect(200);

      expect(reponse.body.statut).toBe('EN_VERIFICATION');
      expect(reponse.body.rayonKm).toBe(30);
    });

    it('n accepte pas une aptitude medicale auto-declaree', async () => {
      await avec(app, candidat)
        .patch('/api/mon-profil')
        .send({ vaccinationVerifiee: true })
        .expect(200);

      const fiche = await prisma.candidat.findUniqueOrThrow({ where: { id: jeu.candidatA } });
      expect(fiche.vaccinationVerifiee).toBe(false);
    });

    it('refuse un rayon hors bornes', async () => {
      const reponse = await avec(app, candidat)
        .patch('/api/mon-profil')
        .send({ rayonKm: 500 })
        .expect(400);

      expect(reponse.body.erreurs[0].champ).toBe('rayonKm');
    });

    it('refuse un numero de telephone mal forme', async () => {
      await avec(app, candidat).patch('/api/mon-profil').send({ telephone: 'allo' }).expect(400);
    });
  });

  describe('disponibilites', () => {
    it('enregistre les creneaux declares', async () => {
      const reponse = await avec(app, candidat)
        .put('/api/mon-profil/disponibilites')
        .send({
          disponibilites: [
            { jourSemaine: 1, heureDebut: '07:00', heureFin: '12:00' },
            { jourSemaine: 3, heureDebut: '14:00', heureFin: '19:00' },
          ],
        })
        .expect(200);

      expect(reponse.body.disponibilites).toHaveLength(2);
    });

    /** La regle du back-office s'applique telle quelle : pas de recouvrement. */
    it('refuse deux creneaux qui se chevauchent', async () => {
      await avec(app, candidat)
        .put('/api/mon-profil/disponibilites')
        .send({
          disponibilites: [
            { jourSemaine: 1, heureDebut: '07:00', heureFin: '12:00' },
            { jourSemaine: 1, heureDebut: '11:00', heureFin: '15:00' },
          ],
        })
        .expect(400);
    });
  });

  describe('diplomes', () => {
    it('declare un diplome, non verifie', async () => {
      const reponse = await avec(app, candidat)
        .post('/api/mon-profil/diplomes')
        .send({ qualificationId: jeu.qualification, obtenueLe: '2020-06-30' })
        .expect(201);

      const declare = reponse.body.qualificationsDetail[0];

      expect(declare.code).toBe('DEAS');
      expect(declare.verifieeLe).toBeNull();
    });

    it('permet de retirer un diplome tant qu il n est pas verifie', async () => {
      await avec(app, candidat)
        .post('/api/mon-profil/diplomes')
        .send({ qualificationId: jeu.qualification })
        .expect(201);

      const reponse = await avec(app, candidat)
        .delete(`/api/mon-profil/diplomes/${jeu.qualification}`)
        .expect(200);

      expect(reponse.body.qualificationsDetail).toHaveLength(0);
    });

    /**
     * Une qualification verifiee engage des missions passees : la faire
     * disparaitre effacerait la trace du controle de l'agence.
     */
    it('refuse de retirer un diplome deja verifie', async () => {
      await prisma.qualificationCandidat.create({
        data: {
          candidatId: jeu.candidatA,
          qualificationId: jeu.qualification,
          verifieeLe: new Date(),
          verifieePar: 'agence',
        },
      });

      const reponse = await avec(app, candidat)
        .delete(`/api/mon-profil/diplomes/${jeu.qualification}`)
        .expect(403);

      expect(reponse.body.message).toMatch(/agence/i);
    });

    it('ne touche jamais la fiche d un autre candidat', async () => {
      await avec(app, candidat)
        .post('/api/mon-profil/diplomes')
        .send({ qualificationId: jeu.qualification })
        .expect(201);

      const autre = await prisma.qualificationCandidat.count({
        where: { candidatId: jeu.candidatB },
      });

      expect(autre).toBe(0);
    });
  });
});

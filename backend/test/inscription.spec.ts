import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { avec, confirmerAdresse, connecter, type Session } from './aide';
import { creerApp, prisma, reinitialiser, type Jeu } from './fixtures';

const MOT_DE_PASSE_INSCRIPTION = 'MotDePasseInscrit2026';

function entreprise(surcharge: Record<string, unknown> = {}) {
  return {
    entreprise: {
      raisonSociale: 'SAAD Les Glycines',
      // SIRET valide au sens de la cle de Luhn.
      siret: '55208131766522',
      contactNom: 'Direction des soins',
      contactTel: '0240000009',
      ...surcharge,
    },
    compte: { email: 'direction@glycines.example', motDePasse: MOT_DE_PASSE_INSCRIPTION },
  };
}

function interimaire(surcharge: Record<string, unknown> = {}) {
  return {
    interimaire: {
      nom: 'Moreau',
      prenom: 'Julie',
      telephone: '0612349999',
      filieres: ['DOMICILE', 'ETABLISSEMENT'],
      adresse: '4 rue des Lilas',
      codePostal: '44200',
      ville: 'Nantes',
      rayonKm: 25,
      permisB: true,
      vehicule: true,
      ...surcharge,
    },
    compte: { email: 'julie.moreau@test.example', motDePasse: MOT_DE_PASSE_INSCRIPTION },
  };
}

/**
 * Les deux parcours d'inscription publics.
 *
 * Ce qui est verifie ici n'est pas "le formulaire marche" mais les invariants
 * du lot : une inscription n'ouvre aucun acces tant que l'adresse n'est pas
 * confirmee, elle n'accorde aucun droit sur le metier de l'agence, et elle ne
 * rend personne operationnel sans validation.
 */
describe('inscription des deux profils', () => {
  let app: INestApplication;
  let jeu: Jeu;

  beforeAll(async () => {
    app = await creerApp();
    jeu = await reinitialiser();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('entreprise', () => {
    let session: Session;

    it('cree une fiche client inactive, sans ouvrir de session', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/inscription/entreprise')
        .send(entreprise())
        .expect(201);

      expect(reponse.body).toEqual({
        email: 'direction@glycines.example',
        verificationRequise: true,
      });

      // L'invariant du lot : aucune session ne sort d'une inscription. Le
      // formulaire seul ne prouve pas qu'on possede l'adresse declaree.
      expect(reponse.body.jeton).toBeUndefined();
      expect(reponse.body.jetonRafraichissement).toBeUndefined();

      const client = await prisma.client.findUniqueOrThrow({
        where: { siret: '55208131766522' },
      });

      // Pas encore valide, donc pas encore operationnel.
      expect(client.actif).toBe(false);
      expect(client.agenceId).toBe(jeu.agenceA);

      // L'agence renseigne la convention a la validation : elle fixe le salaire
      // de reference, une entreprise ne se la donne pas a elle-meme.
      expect(client.conventionCollective).toBeNull();
      expect(client.idcc).toBeNull();
    });

    it('refuse la connexion tant que l adresse n est pas confirmee', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/connexion')
        .send({
          email: 'direction@glycines.example',
          motDePasse: MOT_DE_PASSE_INSCRIPTION,
        })
        .expect(403);

      expect(reponse.body.code).toBe('EMAIL_NON_VERIFIE');
    });

    it('ouvre la session au clic sur le lien recu', async () => {
      session = await confirmerAdresse(app, 'direction@glycines.example');

      const moi = await avec(app, session).get('/api/auth/moi').expect(200);

      expect(moi.body.role).toBe('CLIENT');
      expect(moi.body.clientId).not.toBeNull();
      expect(moi.body.agenceId).toBeNull();
    });

    it('reprend l e-mail du compte comme contact', async () => {
      const client = await prisma.client.findUniqueOrThrow({
        where: { siret: '55208131766522' },
      });

      expect(client.contactEmail).toBe('direction@glycines.example');
    });

    it('laisse le compte se reconnecter une fois l adresse confirmee', async () => {
      await connecter(app, 'direction@glycines.example', MOT_DE_PASSE_INSCRIPTION);
    });

    it('montre sa fiche et son etat de validation dans son espace', async () => {
      const reponse = await avec(app, session).get('/api/auth/mon-espace').expect(200);

      expect(reponse.body.type).toBe('CLIENT');
      expect(reponse.body.valideParLAgence).toBe(false);
      expect(reponse.body.client.raisonSociale).toBe('SAAD Les Glycines');
    });

    it('refuse un second compte sur la meme adresse', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/inscription/entreprise')
        .send(entreprise({ siret: '40483304800022' }))
        .expect(409);
    });

    it('refuse une entreprise deja inscrite avec le meme SIRET', async () => {
      const donnees = entreprise();
      donnees.compte.email = 'autre@glycines.example';

      await request(app.getHttpServer())
        .post('/api/auth/inscription/entreprise')
        .send(donnees)
        .expect(409);
    });

    it('refuse un SIRET dont la cle de controle est fausse', async () => {
      const donnees = entreprise({ siret: '12345678901234' });
      donnees.compte.email = 'siret-faux@test.example';

      const reponse = await request(app.getHttpServer())
        .post('/api/auth/inscription/entreprise')
        .send(donnees)
        .expect(400);

      expect(reponse.body.erreurs[0].champ).toBe('entreprise.siret');
    });

    it('refuse de laisser l entreprise declarer sa convention collective', async () => {
      const donnees = entreprise({ siret: '40483304800022', idcc: '0029' });
      donnees.compte.email = 'convention@test.example';

      // Le champ est simplement ignore par le schema : ce qui compte est qu'il
      // n'atteigne jamais la base.
      await request(app.getHttpServer())
        .post('/api/auth/inscription/entreprise')
        .send(donnees)
        .expect(201);

      const client = await prisma.client.findUniqueOrThrow({
        where: { siret: '40483304800022' },
      });

      expect(client.idcc).toBeNull();
    });
  });

  describe('interimaire', () => {
    let session: Session;

    it('cree une fiche en verification, sans ouvrir de session', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/inscription/interimaire')
        .send(interimaire())
        .expect(201);

      expect(reponse.body).toEqual({
        email: 'julie.moreau@test.example',
        verificationRequise: true,
      });

      const candidat = await prisma.candidat.findUniqueOrThrow({
        where: { email: 'julie.moreau@test.example' },
      });

      // Se declarer aide-soignant ne suffit pas a partir en mission : l'agence
      // voit les diplomes avant que la fiche devienne proposable. C'est un
      // verrou distinct de la confirmation d'adresse, et les deux tiennent.
      expect(candidat.statut).toBe('EN_VERIFICATION');
      expect(candidat.filieres).toEqual(['DOMICILE', 'ETABLISSEMENT']);
    });

    it('ouvre la session au clic sur le lien recu', async () => {
      session = await confirmerAdresse(app, 'julie.moreau@test.example');

      const moi = await avec(app, session).get('/api/auth/moi').expect(200);

      expect(moi.body.role).toBe('CANDIDAT');
      expect(moi.body.candidatId).not.toBeNull();
      expect(moi.body.agenceId).toBeNull();
    });

    it('montre sa fiche et son etat de validation dans son espace', async () => {
      const reponse = await avec(app, session).get('/api/auth/mon-espace').expect(200);

      expect(reponse.body.type).toBe('CANDIDAT');
      expect(reponse.body.valideParLAgence).toBe(false);
      expect(reponse.body.candidat.prenom).toBe('Julie');
    });

    it('exige au moins une filiere', async () => {
      const donnees = interimaire({ filieres: [] });
      donnees.compte.email = 'sans-filiere@test.example';

      const reponse = await request(app.getHttpServer())
        .post('/api/auth/inscription/interimaire')
        .send(donnees)
        .expect(400);

      expect(reponse.body.erreurs[0].champ).toBe('interimaire.filieres');
    });

    it('refuse un mot de passe trop court', async () => {
      const donnees = interimaire();
      donnees.compte.email = 'court@test.example';
      donnees.compte.motDePasse = 'trop-court';

      const reponse = await request(app.getHttpServer())
        .post('/api/auth/inscription/interimaire')
        .send(donnees)
        .expect(400);

      expect(reponse.body.erreurs[0].champ).toBe('compte.motDePasse');
    });

    /**
     * Le vrai risque du lot : ouvrir l'inscription au public, c'est ouvrir une
     * porte sur le vivier si les gardes ne tiennent pas.
     */
    describe('cloisonnement des permissions', () => {
      it('n ouvre aucun acces au vivier', async () => {
        await avec(app, session).get('/api/candidats').expect(403);
      });

      it('n ouvre aucun acces au referentiel client', async () => {
        await avec(app, session).get('/api/clients').expect(403);
      });

      it('n ouvre aucun acces a la gestion des comptes', async () => {
        await avec(app, session).get('/api/utilisateurs').expect(403);
      });

      it('ne permet pas de lire la fiche d un autre candidat', async () => {
        await avec(app, session).get(`/api/candidats/${jeu.candidatA}`).expect(403);
      });

      it('laisse changer son propre mot de passe', async () => {
        await avec(app, session)
          .post('/api/auth/mot-de-passe')
          .send({ ancien: MOT_DE_PASSE_INSCRIPTION, nouveau: 'NouveauMotDePasse2026' })
          .expect(204);
      });
    });
  });

  describe('parcours distincts', () => {
    it('donne un espace vide au personnel de l agence', async () => {
      const admin = await connecter(app, 'admin.a@test.example');
      const reponse = await avec(app, admin).get('/api/auth/mon-espace').expect(200);

      expect(reponse.body.type).toBe('AGENCE');
    });

    it('exige une session pour consulter son espace', async () => {
      await request(app.getHttpServer()).get('/api/auth/mon-espace').expect(401);
    });
  });
});

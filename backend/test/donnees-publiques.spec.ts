import type { INestApplication } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { avec, connecter, type Session } from './aide';
import { creerApp, prisma, reinitialiser } from './fixtures';
import { FranceTravailClient } from '../src/donnees-publiques/france-travail.client';
import { OffresService } from '../src/donnees-publiques/offres.service';
import type { OffreBrute } from '../src/donnees-publiques/normalisation';

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

  /**
   * Rejoue un balayage complet sans reseau.
   *
   * Seul le client est remplace : tout le reste du chemin — preparation,
   * ecriture, seuil de securite, expiration — est celui de la production. Un
   * import de fichier ne pourrait pas servir ici, puisqu'il se declare
   * volontairement partiel et n'expire donc jamais rien.
   */
  async function balayageComplet(brutes: unknown[]) {
    const client = app.get(FranceTravailClient);
    const espion = vi
      .spyOn(client, 'rechercher')
      .mockResolvedValue(brutes as unknown as OffreBrute[]);

    try {
      return await offres.importerDepuisApi({ romes: ['J1501'] }, false, true);
    } finally {
      espion.mockRestore();
    }
  }

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
    /**
     * Le changement de fond depuis la republication : plus rien n'est jete.
     *
     * Une republication est une offre reelle, publiee par une agence reelle, et
     * la licence de reutilisation demande de restituer le catalogue mis a
     * disposition. Elle est donc comptee et enregistree. Une offre « France
     * entiere » n'a pas de departement mais reste parfaitement lisible : elle
     * sort des agregats, pas du site.
     */
    it('conserve republications et offres non situables', async () => {
      const employeur = { nom: 'APPEL MEDICAL' };
      const lot = JSON.stringify({
        resultats: [
          offre({ id: 'A1', entreprise: employeur, salaire: { libelle: 'Horaire de 13.0 Euros' } }),
          // Republication : meme metier, meme employeur, meme commune.
          offre({ id: 'A2', entreprise: employeur, salaire: { libelle: 'Horaire de 13.0 Euros' } }),
          offre({ id: 'A3', salaire: { libelle: 'Horaire de 15.0 Euros' } }),
          // Lieu non situable : conservee, sans departement.
          offre({ id: 'A4', lieuTravail: { libelle: 'France entiere', commune: 'Nantes' } }),
        ],
      });

      const rapport = await offres.importerDepuisFichier(lot);

      expect(rapport.recues).toBe(4);
      expect(rapport.ecartees).toBe(0);
      expect(rapport.doublons).toBe(1);
      expect(rapport.sansDepartement).toBe(1);
      expect(rapport.enregistrees).toBe(4);
      expect(await prisma.offreCollectee.count()).toBe(4);
    });

    /**
     * Le titre de l'employeur ne doit jamais etre remplace par l'appellation du
     * referentiel : c'est ce que la licence appelle denaturer le contenu. Les
     * deux coexistent sur la meme ligne, chacun pour son usage.
     */
    it('republie le titre de l employeur et garde la forme normalisee a cote', async () => {
      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [offre({ id: 'T1', intitule: 'AIDE-SOIGNANT(E) - Interim (H/F)' })],
        }),
      );

      const enregistree = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'T1' } });

      expect(enregistree.intitule).toBe('AIDE-SOIGNANT(E) - Interim (H/F)');
      expect(enregistree.intituleNormalise).toBe('Aide-soignant');
    });

    /**
     * Piege du format France Travail : `lieuTravail.commune` porte le code
     * INSEE, pas le nom. Le nom n'existe que dans le libelle, derriere le
     * numero de departement.
     */
    it('lit le nom de commune dans le libelle, pas le code INSEE', async () => {
      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [
            offre({
              id: 'L1',
              lieuTravail: { libelle: '74 - Thenes', commune: '74280', codePostal: '74230' },
            }),
          ],
        }),
      );

      const enregistree = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'L1' } });

      expect(enregistree.communeNom).toBe('Thenes');
      expect(enregistree.communeCode).toBe('74280');
      expect(enregistree.departement).toBe('74');
    });

    /**
     * Les champs d'annonce sont le coeur de la republication : sans eux la page
     * de detail n'a rien a montrer, et la licence demande de restituer le
     * contenu mis a disposition.
     */
    it('collecte le corps de l annonce et le lien vers la source', async () => {
      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [
            offre({
              id: 'D1',
              description: 'Rejoignez une equipe engagee aupres des residents.',
              typeContratLibelle: 'Interim - 3 Mois',
              dureeTravailLibelle: 'Temps partiel - 11H/semaine',
              experienceLibelle: '1 An(s)',
              dateActualisation: '2026-09-16T12:16:17.794Z',
              origineOffre: {
                urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/D1',
              },
              competences: [{ code: '514781', libelle: 'Soins de confort', exigence: 'E' }],
              contexteTravail: { horaires: ['Travail en journee'] },
            }),
          ],
        }),
      );

      const enregistree = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'D1' } });

      expect(enregistree.description).toContain('Rejoignez une equipe');
      expect(enregistree.urlOrigine).toBe(
        'https://candidat.francetravail.fr/offres/recherche/detail/D1',
      );
      expect(enregistree.typeContratLibelle).toBe('Interim - 3 Mois');
      expect(enregistree.experienceLibelle).toBe('1 An(s)');
      expect(enregistree.actualiseeLe).toEqual(new Date('2026-09-16T12:16:17.794Z'));
      expect(enregistree.competences).toEqual([
        { code: '514781', libelle: 'Soins de confort', exigence: 'E' },
      ]);
      expect(enregistree.horaires).toEqual(['Travail en journee']);
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

  /**
   * Jeu de reference du barometre : cinq offres a Nantes de taux connus, dont
   * la mediane vaut 14, plus une sans salaire annonce.
   *
   * Extrait en fonction parce que deux blocs en ont besoin et qu'ils ne se
   * suivent plus : le bloc d'expiration vide la table entre les deux, et un
   * test qui dependrait silencieusement du voisin precedent finirait par tomber
   * sur un simple reordonnancement.
   */
  async function semerBarometre() {
    await prisma.offreCollectee.deleteMany();

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
    lot.push(offre({ id: 'M9', entreprise: { nom: 'EMPLOYEUR 9' }, salaire: undefined }) as never);

    await offres.importerDepuisFichier(JSON.stringify({ resultats: lot }));
  }

  describe('barometre', () => {
    beforeAll(semerBarometre);

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

    /**
     * Le dedoublonnage se fait desormais au calcul, et pas a l'import.
     *
     * C'est ce qui corrige un defaut de la version precedente : le tri se
     * faisait lot par lot, donc deux republications arrivees dans deux imports
     * differents portaient deux identifiants distincts, entraient toutes les
     * deux en base, et gonflaient la tension. Les deux imports separes
     * ci-dessous reproduisent exactement ce cas.
     */
    it('ne compte qu une fois une republication, meme importee plus tard', async () => {
      const memeMission = {
        entreprise: { nom: 'DOUBLON MEDICAL' },
        salaire: { libelle: 'Horaire de 14.0 Euros' },
      };

      const avant = (await offres.barometre(30, '44')).metiers.find(
        (ligne) => ligne.romeCode === 'J1501',
      )?.offres;

      await offres.importerDepuisFichier(
        JSON.stringify({ resultats: [offre({ id: 'R1', ...memeMission })] }),
      );
      await offres.importerDepuisFichier(
        JSON.stringify({ resultats: [offre({ id: 'R2', ...memeMission })] }),
      );

      const apres = (await offres.barometre(30, '44')).metiers.find(
        (ligne) => ligne.romeCode === 'J1501',
      )?.offres;

      // Les deux lignes sont bien en base — la licence demande de les restituer
      // toutes les deux — mais le barometre n'en voit qu'une.
      expect(await prisma.offreCollectee.count({ where: { id: { in: ['R1', 'R2'] } } })).toBe(2);
      expect(apres).toBe((avant ?? 0) + 1);
    });
  });

  /**
   * Cycle de vie : la licence de reutilisation impose qu'une offre retiree chez
   * France Travail disparaisse aussi du site.
   */
  describe('expiration des offres disparues', () => {
    beforeAll(async () => {
      await prisma.offreCollectee.deleteMany();
    });

    it('retire du site les offres absentes d un balayage complet', async () => {
      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [
            offre({ id: 'E1', entreprise: { nom: 'TOUJOURS LA' } }),
            offre({ id: 'E2', entreprise: { nom: 'BIENTOT POURVUE' } }),
          ],
        }),
      );

      // Second passage sans E2 : la mission a ete pourvue chez la source.
      await balayageComplet([offre({ id: 'E1', entreprise: { nom: 'TOUJOURS LA' } })]);

      const restante = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'E1' } });
      const retiree = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'E2' } });

      expect(restante.statut).toBe('ACTIVE');
      expect(retiree.statut).toBe('EXPIREE');
      expect(retiree.expireeLe).not.toBeNull();
      // La ligne reste en base : le barometre travaille sur une fenetre
      // glissante et doit continuer a voir les offres passees.
      expect(await prisma.offreCollectee.count()).toBe(2);
    });

    /**
     * Le garde-fou le plus important du lot. Un import tronque — plafond trop
     * bas, coupure reseau, API qui repond court — ne prouve pas que le reste du
     * catalogue a disparu. Sans ce refus, une seule commande viderait le site.
     */
    it('refuse d expirer sur un balayage manifestement tronque', async () => {
      await prisma.offreCollectee.deleteMany();

      const lot = Array.from({ length: 20 }, (_, index) =>
        offre({ id: `P${index}`, entreprise: { nom: `AGENCE ${index}` } }),
      );

      await offres.importerDepuisFichier(JSON.stringify({ resultats: lot }));

      // Une seule offre revue sur vingt : tres en dessous du seuil.
      const rapport = await balayageComplet([lot[0]!]);

      expect(rapport.expirees).toBe(0);
      expect(await prisma.offreCollectee.count({ where: { statut: 'ACTIVE' } })).toBe(20);
    });

    it('remet en ligne une offre republiee apres avoir ete expiree', async () => {
      await prisma.offreCollectee.deleteMany();

      const annonce = offre({ id: 'REV1', entreprise: { nom: 'REVENANTE' } });

      await offres.importerDepuisFichier(JSON.stringify({ resultats: [annonce] }));
      await balayageComplet([]);

      expect(
        (await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'REV1' } })).statut,
      ).toBe('EXPIREE');

      await offres.importerDepuisFichier(JSON.stringify({ resultats: [annonce] }));

      const revenue = await prisma.offreCollectee.findUniqueOrThrow({ where: { id: 'REV1' } });

      expect(revenue.statut).toBe('ACTIVE');
      expect(revenue.expireeLe).toBeNull();
    });
  });

  describe('exposition par l API', () => {
    beforeAll(semerBarometre);

    it('exige une session', async () => {
      await request(app.getHttpServer()).get('/api/tension').expect(401);
    });

    it('repond au personnel de l agence', async () => {
      const reponse = await avec(app, agence)
        .get('/api/tension?jours=30&departement=44')
        .expect(200);

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

  /**
   * Les offres republiees, vues du visiteur.
   *
   * Ce bloc verifie surtout des obligations de licence : la source et le lien
   * d'origine accompagnent chaque annonce, le contenu n'est pas reecrit, et une
   * offre retiree chez France Travail n'est plus servie.
   */
  describe('offres publiques republiees', () => {
    beforeAll(async () => {
      await prisma.offreCollectee.deleteMany();

      await offres.importerDepuisFichier(
        JSON.stringify({
          resultats: [
            offre({
              id: 'PUB1',
              intitule: 'AIDE-SOIGNANT(E) - Interim (H/F)',
              description: 'Poste en EHPAD, equipe de dix personnes.',
              entreprise: { nom: 'MEDICALIS INTERIM' },
              salaire: { libelle: 'Horaire de 15.0 Euros' },
              lieuTravail: { libelle: '44 - Nantes', commune: '44109', codePostal: '44000' },
              origineOffre: {
                urlOrigine: 'https://candidat.francetravail.fr/offres/recherche/detail/PUB1',
              },
            }),
            offre({
              id: 'PUB2',
              intitule: 'Auxiliaire de vie (H/F)',
              entreprise: { nom: 'DOMIDOM' },
              salaire: { libelle: 'Horaire de 12.5 Euros' },
              lieuTravail: { libelle: '85 - La Roche-sur-Yon', commune: '85191' },
            }),
            // Sans salaire annonce : doit finir en queue d'un tri par taux.
            offre({ id: 'PUB3', entreprise: { nom: 'SANS TAUX' }, salaire: undefined }),
          ],
        }),
      );
    });

    it('se lit sans session : c est de la donnee publique', async () => {
      const reponse = await request(app.getHttpServer()).get('/api/offres').expect(200);

      expect(reponse.body.total).toBe(3);
      expect(reponse.body.donnees).toHaveLength(3);
    });

    it('republie le titre de l employeur et le lien vers la source', async () => {
      const reponse = await request(app.getHttpServer()).get('/api/offres/PUB1').expect(200);

      expect(reponse.body.intitule).toBe('AIDE-SOIGNANT(E) - Interim (H/F)');
      expect(reponse.body.description).toContain('EHPAD');
      expect(reponse.body.urlOrigine).toBe(
        'https://candidat.francetravail.fr/offres/recherche/detail/PUB1',
      );
      expect(reponse.body.source).toBe('FRANCE_TRAVAIL');
      // Nom lisible, pas le code INSEE.
      expect(reponse.body.communeNom).toBe('Nantes');
    });

    /**
     * `intituleNormalise` sert a regrouper dans le barometre. Le publier
     * reviendrait a proposer l'annonce sous un titre que l'employeur n'a pas
     * ecrit, ce que la licence appelle denaturer le contenu.
     */
    it('n expose jamais la forme normalisee ni de coordonnees', async () => {
      const reponse = await request(app.getHttpServer()).get('/api/offres/PUB1').expect(200);

      expect(reponse.body).not.toHaveProperty('intituleNormalise');
      expect(reponse.body).not.toHaveProperty('contact');
      expect(JSON.stringify(reponse.body)).not.toContain('Tel :');
    });

    it('filtre par departement', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/offres?departement=85')
        .expect(200);

      expect(reponse.body.total).toBe(1);
      expect(reponse.body.donnees[0].id).toBe('PUB2');
    });

    it('cherche sur l intitule et sur l employeur', async () => {
      const parEmployeur = await request(app.getHttpServer())
        .get('/api/offres?recherche=domidom')
        .expect(200);

      expect(parEmployeur.body.donnees.map((ligne: { id: string }) => ligne.id)).toEqual(['PUB2']);

      const parIntitule = await request(app.getHttpServer())
        .get('/api/offres?recherche=auxiliaire')
        .expect(200);

      expect(parIntitule.body.donnees.map((ligne: { id: string }) => ligne.id)).toEqual(['PUB2']);
    });

    /**
     * Postgres classe les NULL en tete d'un tri descendant : sans le
     * `nulls: 'last'` du service, la liste s'ouvrirait sur les offres qui
     * n'annoncent aucun salaire.
     */
    it('relegue les offres sans salaire en fin de tri par taux', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/offres?tri=TAUX_DECROISSANT')
        .expect(200);

      expect(reponse.body.donnees.map((ligne: { id: string }) => ligne.id)).toEqual([
        'PUB1',
        'PUB2',
        'PUB3',
      ]);
    });

    it('pagine', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/offres?page=2&limite=2')
        .expect(200);

      expect(reponse.body.total).toBe(3);
      expect(reponse.body.donnees).toHaveLength(1);
      expect(reponse.body.page).toBe(2);
    });

    it('refuse un departement mal forme', async () => {
      await request(app.getHttpServer()).get('/api/offres?departement=zz').expect(400);
    });

    it('ne sert plus une offre retiree chez la source', async () => {
      await prisma.offreCollectee.update({
        where: { id: 'PUB2' },
        data: { statut: 'EXPIREE', expireeLe: new Date() },
      });

      await request(app.getHttpServer()).get('/api/offres/PUB2').expect(404);

      const liste = await request(app.getHttpServer()).get('/api/offres').expect(200);

      expect(liste.body.total).toBe(2);
    });
  });
});

import { hash } from '@node-rs/argon2';
import { PrismaClient, type Filiere, type RoleUtilisateur } from '@prisma/client';

const prisma = new PrismaClient();

// Comptes de demonstration : le mot de passe est volontairement le meme pour
// tous, et volontairement inutilisable ailleurs qu'en local.
const MOT_DE_PASSE_DEMO = 'Releve2026!';

// Le code ROME rattache chaque diplome au marche observe sur France Travail :
// J1501 pour les soins, K1302 pour l'assistance aux adultes, K1304 pour les
// services domestiques. Ce sont les trois codes que la collecte importe.
const QUALIFICATIONS: { code: string; libelle: string; filieres: Filiere[]; romeCode: string }[] = [
  {
    code: 'DEAES',
    libelle: "Diplome d'Etat d'accompagnant educatif et social",
    filieres: ['DOMICILE', 'ETABLISSEMENT'],
    romeCode: 'K1302',
  },
  {
    code: 'DEAS',
    libelle: "Diplome d'Etat d'aide-soignant",
    filieres: ['ETABLISSEMENT'],
    romeCode: 'J1501',
  },
  {
    code: 'ADVF',
    libelle: 'Titre pro assistant de vie aux familles',
    filieres: ['DOMICILE'],
    romeCode: 'K1304',
  },
  {
    code: 'AVS',
    libelle: 'Auxiliaire de vie sociale',
    filieres: ['DOMICILE'],
    romeCode: 'K1304',
  },
  {
    code: 'ASH',
    libelle: 'Agent des services hospitaliers',
    filieres: ['ETABLISSEMENT'],
    romeCode: 'K1302',
  },
  {
    code: 'AMP',
    libelle: 'Aide medico-psychologique',
    filieres: ['ETABLISSEMENT'],
    romeCode: 'K1302',
  },
];

async function main(): Promise<void> {
  const agence = await prisma.agence.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { nom: 'Relève - agence pilote' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      nom: 'Relève - agence pilote',
      ville: 'Nantes',
    },
  });

  for (const qualification of QUALIFICATIONS) {
    await prisma.qualification.upsert({
      where: { code: qualification.code },
      update: {
        libelle: qualification.libelle,
        filieres: qualification.filieres,
        romeCode: qualification.romeCode,
      },
      create: qualification,
    });
  }

  // Un premier SAAD, oriente accompagnement du handicap : deux beneficiaires
  // suivis, des interventions longues et regulieres.
  const saadTilleuls = await prisma.client.upsert({
    where: { siret: '48291736500017' },
    // Un `update` vide ne converge jamais : une fiche de demonstration renommee
    // garderait son ancien nom a chaque reseed.
    update: { raisonSociale: 'Les Tilleuls (SAAD)', type: 'SAAD' },
    create: {
      agenceId: agence.id,
      raisonSociale: 'Les Tilleuls (SAAD)',
      siret: '48291736500017',
      type: 'SAAD',
      conventionCollective: 'Branche aide a domicile (BAD) - a confirmer avec la paie',
      contactNom: 'Responsable de secteur',
      contactEmail: 'secteur@les-tilleuls.example',
      contactTel: '0240000001',
      lieux: {
        create: [
          {
            type: 'DOMICILE_BENEFICIAIRE',
            libelle: 'Domicile - secteur Hauts-Paves',
            adresse: '12 rue des Tilleuls',
            codePostal: '44000',
            ville: 'Nantes',
            latitude: 47.2184,
            longitude: -1.5536,
            etage: '2e etage, aile est',
            consignes: 'Cle dans la boite a cle, code communique la veille.',
          },
        ],
      },
    },
  });

  // Un second SAAD : le client signe, l'intervention a lieu chez le beneficiaire.
  const saad = await prisma.client.upsert({
    where: { siret: '51938274600021' },
    update: { raisonSociale: 'Domicile Plus (SAAD)', type: 'SAAD' },
    create: {
      agenceId: agence.id,
      raisonSociale: 'Domicile Plus (SAAD)',
      siret: '51938274600021',
      type: 'SAAD',
      conventionCollective: 'Branche aide a domicile (BAD) - a confirmer avec la paie',
      contactNom: 'Responsable de secteur',
      contactEmail: 'secteur@domicile-plus.example',
      contactTel: '0240000002',
      lieux: {
        create: [
          {
            type: 'DOMICILE_BENEFICIAIRE',
            libelle: 'Domicile - secteur Doulon',
            adresse: '5 rue du Moulin',
            codePostal: '44300',
            ville: 'Nantes',
            latitude: 47.2401,
            longitude: -1.5122,
            etage: '3e sans ascenseur',
            codeAcces: 'A1234',
            beneficiaireRef: 'BEN-0147',
          },
          {
            type: 'DOMICILE_BENEFICIAIRE',
            libelle: 'Domicile - secteur Reze',
            adresse: '28 avenue des Sorinieres',
            codePostal: '44400',
            ville: 'Reze',
            latitude: 47.1836,
            longitude: -1.5494,
            beneficiaireRef: 'BEN-0233',
          },
        ],
      },
    },
  });

  const candidats: {
    email: string;
    nom: string;
    prenom: string;
    telephone: string;
    filieres: Filiere[];
    ville: string;
    codePostal: string;
    adresse: string;
    latitude: number;
    longitude: number;
    rayonKm: number;
    permisB: boolean;
    vehicule: boolean;
    qualifications: string[];
  }[] = [
    {
      email: 'nadia.benali@example.org',
      nom: 'Benali',
      prenom: 'Nadia',
      telephone: '0612345601',
      filieres: ['DOMICILE'],
      adresse: '9 rue de la Paix',
      codePostal: '44300',
      ville: 'Nantes',
      latitude: 47.2438,
      longitude: -1.5261,
      rayonKm: 25,
      permisB: true,
      vehicule: true,
      qualifications: ['ADVF', 'AVS'],
    },
    {
      email: 'marc.leroy@example.org',
      nom: 'Leroy',
      prenom: 'Marc',
      telephone: '0612345602',
      filieres: ['ETABLISSEMENT'],
      adresse: '3 boulevard Gabriel Lauriol',
      codePostal: '44000',
      ville: 'Nantes',
      latitude: 47.2299,
      longitude: -1.5471,
      rayonKm: 15,
      permisB: false,
      vehicule: false,
      qualifications: ['DEAS'],
    },
    {
      // Le cas qui justifie de ne pas dupliquer la fiche.
      email: 'sophie.marchand@example.org',
      nom: 'Marchand',
      prenom: 'Sophie',
      telephone: '0612345603',
      filieres: ['DOMICILE', 'ETABLISSEMENT'],
      adresse: '17 rue de Reze',
      codePostal: '44400',
      ville: 'Reze',
      latitude: 47.1902,
      longitude: -1.5583,
      rayonKm: 30,
      permisB: true,
      vehicule: true,
      qualifications: ['DEAES'],
    },
    {
      email: 'karim.ferreira@example.org',
      nom: 'Ferreira',
      prenom: 'Karim',
      telephone: '0612345604',
      filieres: ['ETABLISSEMENT'],
      adresse: '44 route de Vannes',
      codePostal: '44800',
      ville: 'Saint-Herblain',
      latitude: 47.2296,
      longitude: -1.6108,
      rayonKm: 20,
      permisB: true,
      vehicule: false,
      qualifications: ['ASH'],
    },
  ];

  for (const donnees of candidats) {
    const { qualifications, ...candidat } = donnees;

    const enregistre = await prisma.candidat.upsert({
      where: { email: candidat.email },
      update: {},
      create: {
        ...candidat,
        agenceId: agence.id,
        statut: 'ACTIF',
        disponibilites: {
          create: [
            { jourSemaine: 1, heureDebut: '07:00', heureFin: '13:00' },
            { jourSemaine: 2, heureDebut: '07:00', heureFin: '13:00' },
            { jourSemaine: 4, heureDebut: '14:00', heureFin: '20:00' },
          ],
        },
      },
    });

    for (const code of qualifications) {
      const referentiel = await prisma.qualification.findUniqueOrThrow({ where: { code } });
      await prisma.qualificationCandidat.upsert({
        where: {
          candidatId_qualificationId: {
            candidatId: enregistre.id,
            qualificationId: referentiel.id,
          },
        },
        update: {},
        create: {
          candidatId: enregistre.id,
          qualificationId: referentiel.id,
          obtenueLe: new Date('2021-06-30'),
          verifieeLe: new Date(),
          verifieePar: 'seed',
        },
      });
    }
  }

  // --- comptes de demonstration, un par role
  const sophie = await prisma.candidat.findUniqueOrThrow({
    where: { email: 'sophie.marchand@example.org' },
  });

  const empreinte = await hash(MOT_DE_PASSE_DEMO);

  const comptes: {
    email: string;
    role: RoleUtilisateur;
    agenceId?: string;
    clientId?: string;
    candidatId?: string;
  }[] = [
    { email: 'admin@releve.example', role: 'ADMIN_AGENCE', agenceId: agence.id },
    { email: 'charge@releve.example', role: 'CHARGE_RECRUTEMENT', agenceId: agence.id },
    // Prepares pour les lots 2 et 3 : les espaces client et candidat n'ont pas
    // encore d'ecran, mais le jeton porte deja le bon rattachement.
    { email: 'secteur@les-tilleuls.example', role: 'CLIENT', clientId: saadTilleuls.id },
    { email: 'sophie.marchand@example.org', role: 'CANDIDAT', candidatId: sophie.id },
  ];

  for (const compte of comptes) {
    // On reecrit le mot de passe a chaque seed : en dev, relancer `db:seed` est
    // la facon la plus simple de recuperer un acces.
    // `emailVerifieLe` est pose d'office : ces comptes viennent du seed, pas du
    // site public. La confirmation d'adresse atteste que celui qui s'inscrit
    // possede l'adresse qu'il declare — un compte de demonstration n'a personne
    // a qui le prouver, et sans cette ligne la demo serait inconnectable.
    await prisma.utilisateur.upsert({
      where: { email: compte.email },
      update: {
        motDePasse: empreinte,
        role: compte.role,
        actif: true,
        emailVerifieLe: new Date(),
      },
      create: { ...compte, motDePasse: empreinte, emailVerifieLe: new Date() },
    });
  }

  // Deux besoins ouverts, chez deux SAAD differents.
  const deaes = await prisma.qualification.findUniqueOrThrow({ where: { code: 'DEAES' } });
  const advf = await prisma.qualification.findUniqueOrThrow({ where: { code: 'ADVF' } });
  const lieuTilleuls = await prisma.lieuIntervention.findFirstOrThrow({
    where: { clientId: saadTilleuls.id },
  });
  const lieuDomicile = await prisma.lieuIntervention.findFirstOrThrow({
    where: { clientId: saad.id },
  });

  await prisma.mission.upsert({
    where: { reference: 'M-2026-0001' },
    update: {},
    create: {
      reference: 'M-2026-0001',
      agenceId: agence.id,
      clientId: saadTilleuls.id,
      lieuId: lieuTilleuls.id,
      filiere: 'DOMICILE',
      qualificationRequiseId: deaes.id,
      statut: 'PUBLIEE',
      dateDebut: new Date('2026-09-15'),
      dateFin: new Date('2026-09-19'),
      heureDebut: '06:45',
      heureFin: '14:15',
      motifRecours: "Remplacement d'un salarie absent",
      description: 'Accompagnement d une personne en situation de handicap, transfert au leve.',
      tauxHoraire: '13.5000',
      coefficient: '1.950',
    },
  });

  await prisma.mission.upsert({
    where: { reference: 'M-2026-0002' },
    update: {},
    create: {
      reference: 'M-2026-0002',
      agenceId: agence.id,
      clientId: saad.id,
      lieuId: lieuDomicile.id,
      filiere: 'DOMICILE',
      qualificationRequiseId: advf.id,
      statut: 'PUBLIEE',
      dateDebut: new Date('2026-09-14'),
      dateFin: new Date('2026-09-20'),
      heureDebut: '08:00',
      heureFin: '11:00',
      motifRecours: 'Accroissement temporaire d activite',
      description: 'Aide au lever, toilette, preparation du repas. 3e sans ascenseur.',
      tauxHoraire: '12.2000',
      coefficient: '1.880',
    },
  });

  const compteurs = {
    qualifications: await prisma.qualification.count(),
    clients: await prisma.client.count(),
    lieux: await prisma.lieuIntervention.count(),
    candidats: await prisma.candidat.count(),
    utilisateurs: await prisma.utilisateur.count(),
    missions: await prisma.mission.count(),
  };

  console.log('Jeu de donnees en place :', compteurs);
  console.log(`Comptes de demonstration : mot de passe "${MOT_DE_PASSE_DEMO}"`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

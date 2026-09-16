import { Injectable } from '@nestjs/common';
import { OrigineCoordonnees, Prisma, StatutOffreCollectee } from '@prisma/client';
import type {
  MissionsVitrineQuery,
  MissionVitrine,
  OptionsVitrine,
  PageResultat,
  SuggestionMarche,
  SuggestionsMarche,
} from '@releve/shared';
import { distanceKm } from '../matching/score';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Etats dans lesquels une mission cherche encore quelqu'un.
 *
 * Volontairement plus etroit que la liste du service des missions, qui inclut
 * PROPOSEE : une mission deja proposee a quelqu'un attend une reponse, et
 * l'afficher sur la vitrine publique amenerait des candidatures sur un poste
 * qui n'est plus vraiment ouvert.
 */
const ETATS_VITRINE = ['PUBLIEE', 'EN_MATCHING'] as const;

/**
 * Plafond de securite sur le lot rapporte par la boite englobante.
 *
 * Ce n'est plus lui qui decide de la pertinence — c'est la boite, qui ecarte en
 * base tout ce qui est hors du rayon. Il ne reste la que pour empecher un cas
 * pathologique de charger des milliers de lignes : un candidat au rayon tres
 * large dans une metropole dense.
 */
const CANDIDATES_A_CLASSER = 400;

/** Noms des departements, pour les menus deroulants de la vitrine. */
const NOMS_DEPARTEMENTS: Record<string, string> = {
  '44': 'Loire-Atlantique',
  '49': 'Maine-et-Loire',
  '53': 'Mayenne',
  '72': 'Sarthe',
  '85': 'Vendee',
};

/**
 * Ce que le site montre a qui n'est pas connecte, et ce qu'il suggere a un
 * candidat qui l'est.
 *
 * Les deux vivent dans le meme service parce qu'ils repondent a la meme
 * question — « qu'est-ce qui se cherche autour de moi ? » — mais ils ne
 * puisent pas au meme endroit, et c'est essentiel : la vitrine lit les missions
 * de Releve, les suggestions lisent les offres collectees sur France Travail.
 */
@Injectable()
export class VitrineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Missions Releve ouvertes, visibles sans session.
   *
   * Le nom du client n'est pas projete : voir `MissionVitrine`. Ce n'est pas un
   * oubli, c'est la seule difference entre cette vue et celle du candidat
   * connecte.
   */
  async missions(query: MissionsVitrineQuery): Promise<PageResultat<MissionVitrine>> {
    const where: Prisma.MissionWhereInput = {
      statut: { in: [...ETATS_VITRINE] },
      ...(query.metier ? { qualificationRequise: { code: query.metier } } : {}),
      ...(query.ville ? { lieu: { ville: { equals: query.ville, mode: 'insensitive' } } } : {}),
      ...(query.departement ? { lieu: { codePostal: { startsWith: query.departement } } } : {}),
    };

    const [total, lignes] = await Promise.all([
      this.prisma.mission.count({ where }),
      this.prisma.mission.findMany({
        where,
        include: {
          lieu: { select: { type: true, libelle: true, ville: true, codePostal: true } },
          qualificationRequise: { select: { code: true, libelle: true } },
        },
        // La plus proche dans le temps d'abord : un candidat cherche a remplir
        // son planning, pas a lire un historique.
        orderBy: [{ dateDebut: 'asc' }, { heureDebut: 'asc' }],
        skip: (query.page - 1) * query.limite,
        take: query.limite,
      }),
    ]);

    return {
      donnees: lignes.map((mission) => ({
        id: mission.id,
        reference: mission.reference,
        metier: mission.qualificationRequise.libelle,
        metierCode: mission.qualificationRequise.code,
        typeLieu: mission.lieu.type as MissionVitrine['typeLieu'],
        secteur: mission.lieu.libelle,
        ville: mission.lieu.ville,
        codePostal: mission.lieu.codePostal,
        departement: departementDepuisCodePostal(mission.lieu.codePostal),
        dateDebut: mission.dateDebut.toISOString(),
        dateFin: mission.dateFin.toISOString(),
        heureDebut: mission.heureDebut,
        heureFin: mission.heureFin,
        travailNuit: mission.travailNuit,
        tauxHoraire: mission.tauxHoraire === null ? null : Number(mission.tauxHoraire),
        description: mission.description,
      })),
      total,
      page: query.page,
      limite: query.limite,
    };
  }

  /**
   * Contenu des menus deroulants.
   *
   * Construit sur les missions reellement ouvertes : un menu qui proposerait
   * les cent une divisions francaises alors que l'agence en couvre cinq ferait
   * cliquer le visiteur vers des listes vides.
   */
  async options(): Promise<OptionsVitrine> {
    const lignes = await this.prisma.mission.findMany({
      where: { statut: { in: [...ETATS_VITRINE] } },
      select: {
        lieu: { select: { ville: true, codePostal: true } },
        qualificationRequise: { select: { code: true, libelle: true } },
      },
    });

    const departements = new Map<string, number>();
    const villes = new Map<string, { nom: string; departement: string; missions: number }>();
    const metiers = new Map<string, { code: string; libelle: string; missions: number }>();

    for (const ligne of lignes) {
      const departement = departementDepuisCodePostal(ligne.lieu.codePostal);

      departements.set(departement, (departements.get(departement) ?? 0) + 1);

      const cleVille = `${departement}|${ligne.lieu.ville.toLowerCase()}`;
      const ville = villes.get(cleVille);

      if (ville) {
        ville.missions += 1;
      } else {
        villes.set(cleVille, { nom: ligne.lieu.ville, departement, missions: 1 });
      }

      const metier = metiers.get(ligne.qualificationRequise.code);

      if (metier) {
        metier.missions += 1;
      } else {
        metiers.set(ligne.qualificationRequise.code, {
          code: ligne.qualificationRequise.code,
          libelle: ligne.qualificationRequise.libelle,
          missions: 1,
        });
      }
    }

    return {
      departements: [...departements.entries()]
        .map(([code, missions]) => ({
          code,
          libelle: NOMS_DEPARTEMENTS[code] ? `${code} — ${NOMS_DEPARTEMENTS[code]}` : code,
          missions,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      villes: [...villes.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      metiers: [...metiers.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')),
    };
  }

  /**
   * Offres du marche rapprochees du profil d'un candidat.
   *
   * Deux criteres, et deux seulement : le metier et la distance.
   *
   * Le metier passe par le code ROME de la qualification du candidat — DEAS
   * mene a J1501, AVS a K1304 — ce qui fait de la table des qualifications le
   * pont deja prevu entre Releve et France Travail.
   *
   * La distance se mesure depuis le domicile du candidat, avec son propre rayon
   * de deplacement. Un rayon large ne doit pas noyer le candidat sous des
   * offres a la limite : le classement remonte les plus proches d'abord.
   *
   * Ce qui n'est volontairement pas fait : le score de Releve. Il pese d'abord
   * le chevauchement entre les creneaux declares et les horaires de la mission,
   * et une offre France Travail n'annonce pas ses horaires autrement qu'en
   * texte libre. Un score calcule sur des champs absents serait un chiffre
   * invente, affiche avec l'autorite d'une mesure.
   */
  async suggestions(candidatId: string, limite: number): Promise<SuggestionsMarche> {
    const candidat = await this.prisma.candidat.findUnique({
      where: { id: candidatId },
      select: {
        latitude: true,
        longitude: true,
        rayonKm: true,
        codePostal: true,
        qualifications: {
          select: { qualification: { select: { romeCode: true } } },
        },
      },
    });

    const romes = [
      ...new Set(
        (candidat?.qualifications ?? [])
          .map((lien) => lien.qualification.romeCode)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    if (!romes.length) {
      return { suggestions: [], total: 0, motif: 'AUCUN_METIER' };
    }

    if (candidat?.latitude == null || candidat.longitude == null) {
      return { suggestions: [], total: 0, motif: 'ADRESSE_ABSENTE' };
    }

    const departement = departementDepuisCodePostal(candidat.codePostal ?? '');
    const boite = boiteEnglobante(candidat.latitude, candidat.longitude, candidat.rayonKm);

    /**
     * Presiction en base, puis mesure exacte en memoire.
     *
     * La boite englobante ecarte en SQL tout ce qui ne peut pas etre dans le
     * rayon — un carre est grossier, mais il divise deja le lot par cent — et
     * la distance a vol d'oiseau tranche ensuite les coins du carre. Sans ce
     * premier filtre il faudrait charger les offres les plus recentes et
     * esperer que les plus proches en fassent partie ; une annonce voisine
     * publiee trois semaines plus tot serait passee au travers.
     *
     * Le repli departemental reste pour le residu : environ une offre sur cent
     * n'a ni coordonnees de la source, ni commune que la BAN sache situer.
     */
    const lot = await this.prisma.offreCollectee.findMany({
      where: {
        statut: StatutOffreCollectee.ACTIVE,
        romeCode: { in: romes },
        OR: [
          {
            latitude: { gte: boite.latMin, lte: boite.latMax },
            longitude: { gte: boite.lonMin, lte: boite.lonMax },
          },
          ...(departement ? [{ latitude: null, departement }] : []),
        ],
      },
      orderBy: { publieeLe: 'desc' },
      take: CANDIDATES_A_CLASSER,
    });

    const retenues = lot
      .map((offre) => ({
        offre,
        distance: distanceKm(
          candidat.latitude,
          candidat.longitude,
          offre.latitude,
          offre.longitude,
        ),
      }))
      .filter(({ offre, distance }) =>
        distance === null ? offre.departement === departement : distance <= candidat.rayonKm,
      )
      // Les offres mesurees passent devant, de la plus proche a la plus
      // lointaine ; celles qu'on ne sait que situer au departement suivent.
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;

        return a.distance - b.distance;
      });

    if (!retenues.length) {
      return { suggestions: [], total: 0, motif: 'AUCUNE_OFFRE' };
    }

    return {
      suggestions: retenues.slice(0, limite).map(({ offre, distance }) => ({
        id: offre.id,
        source: offre.source,
        intitule: offre.intitule,
        entreprise: offre.entreprise,
        communeNom: offre.communeNom,
        departement: offre.departement,
        // Null assume : l'offre est dans le bon departement, mais ni la source
        // ni la BAN n'ont su la situer. Mieux vaut ne rien annoncer qu'estimer.
        distanceKm: distance === null ? null : Math.round(distance * 10) / 10,
        distanceApprochee: offre.origineCoordonnees === OrigineCoordonnees.COMMUNE,
        salaireLibelle: offre.salaireLibelle,
        typeContratLibelle: offre.typeContratLibelle,
        dureeTravailLibelle: offre.dureeTravailLibelle,
        experienceExigee: offre.experienceExigee,
        publieeLe: offre.publieeLe.toISOString(),
        actualiseeLe: offre.actualiseeLe?.toISOString() ?? null,
        urlOrigine: offre.urlOrigine,
      })) satisfies SuggestionMarche[],
      // Le total porte sur ce qui est reellement a portee, pas sur le catalogue
      // national : annoncer « 1871 offres » a quelqu'un qui n'en a que sept
      // autour de lui serait trompeur.
      total: retenues.length,
      motif: null,
    };
  }
}

/** Degre de latitude, en kilometres. Constant sur toute la Terre. */
const KM_PAR_DEGRE_LATITUDE = 111.32;

/**
 * Carre de coordonnees contenant a coup sur le disque du rayon demande.
 *
 * Sert de pre-filtre en base, pas de reponse : un carre deborde le cercle dans
 * les coins, et c'est la distance a vol d'oiseau qui tranche ensuite. Il vaut
 * mieux trop large que trop etroit — un carre trop petit ecarterait des offres
 * qui sont pourtant dans le rayon, et personne ne s'en apercevrait.
 *
 * Un degre de longitude retrecit vers les poles, d'ou le cosinus. Sans lui, la
 * boite serait trop etroite en latitude nord, et d'autant plus que la France
 * est loin de l'equateur.
 */
function boiteEnglobante(
  latitude: number,
  longitude: number,
  rayonKm: number,
): { latMin: number; latMax: number; lonMin: number; lonMax: number } {
  const deltaLat = rayonKm / KM_PAR_DEGRE_LATITUDE;
  // Le plancher evite une division par zero au pole, ou la boite couvrirait
  // alors tous les meridiens.
  const kmParDegreLongitude = Math.max(
    KM_PAR_DEGRE_LATITUDE * Math.cos((latitude * Math.PI) / 180),
    0.001,
  );
  const deltaLon = rayonKm / kmParDegreLongitude;

  return {
    latMin: latitude - deltaLat,
    latMax: latitude + deltaLat,
    lonMin: longitude - deltaLon,
    lonMax: longitude + deltaLon,
  };
}

/**
 * Les DOM tiennent sur trois chiffres. La Corse s'ecrit 2A / 2B ailleurs, mais
 * son code postal dit 20 : on garde la forme postale, seule presente ici.
 */
function departementDepuisCodePostal(codePostal: string): string {
  const propre = codePostal.trim();

  return propre.startsWith('97') || propre.startsWith('98')
    ? propre.slice(0, 3)
    : propre.slice(0, 2);
}

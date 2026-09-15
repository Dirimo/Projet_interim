import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Barometre, SuggestionTaux } from '@releve/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';
import { FranceTravailClient, type CriteresRecherche } from './france-travail.client';
import { nettoyerLot, type OffreBrute, type ResultatNettoyage } from './normalisation';

/**
 * Codes ROME du secteur, et raison de leur presence.
 *
 * Ce sont eux qui definissent ce que « notre marche » veut dire : elargir la
 * liste elargit mecaniquement la tension mesuree, donc elle se decide, elle ne
 * se devine pas.
 */
export const ROMES_SECTEUR = [
  'J1501', // Soins d'hygiene, de confort du patient - aide-soignant
  'K1302', // Assistance aupres d'adultes
  'K1304', // Services domestiques
] as const;

/** Duree de vie du barometre en cache : il ne change qu'apres un import. */
const CACHE_SECONDES = 24 * 3600;

interface LigneAgregat {
  romeCode: string;
  romeLibelle: string;
  departement: string;
  offres: bigint;
  postes: bigint;
  median: Prisma.Decimal | null;
  minimum: Prisma.Decimal | null;
  maximum: Prisma.Decimal | null;
  avecExperience: bigint;
  sansSalaire: bigint;
}

export interface RapportImport extends ResultatNettoyage {
  enregistrees: number;
  source: string;
  simulation: boolean;
}

@Injectable()
export class OffresService {
  private readonly logger = new Logger(OffresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: FranceTravailClient,
    private readonly cache: CacheService,
  ) {}

  /**
   * Importe depuis l'API. Le nettoyage est fait avant toute ecriture : ce qui
   * entre en base est deja normalise et dedoublonne, la table ne contient donc
   * jamais de brut a retraiter plus tard.
   */
  async importerDepuisApi(criteres: CriteresRecherche, simulation = false): Promise<RapportImport> {
    const brutes = await this.client.rechercher(criteres);

    return this.traiter(brutes, 'API France Travail', simulation);
  }

  /**
   * Importe depuis un instantane local.
   *
   * Indispensable le jour d'une demonstration : l'API peut etre indisponible,
   * le quota atteint, ou le reseau filtre. Le fichier rejoue exactement le meme
   * nettoyage que l'appel en direct.
   */
  async importerDepuisFichier(contenu: string, simulation = false): Promise<RapportImport> {
    const lu = JSON.parse(contenu) as { resultats?: OffreBrute[] } | OffreBrute[];
    const brutes = Array.isArray(lu) ? lu : (lu.resultats ?? []);

    return this.traiter(brutes, 'instantane local', simulation);
  }

  private async traiter(
    brutes: OffreBrute[],
    source: string,
    simulation: boolean,
  ): Promise<RapportImport> {
    const nettoye = nettoyerLot(brutes);

    if (simulation) {
      return { ...nettoye, enregistrees: 0, source, simulation: true };
    }

    // Upsert plutot qu'insert : une offre republiee le lendemain doit mettre a
    // jour sa ligne, pas faire echouer tout le lot sur une cle dupliquee.
    let enregistrees = 0;

    for (const offre of nettoye.offres) {
      const donnees = {
        romeCode: offre.romeCode,
        romeLibelle: offre.romeLibelle,
        intitule: offre.intitule,
        intituleNormalise: offre.intituleNormalise,
        entreprise: offre.entreprise,
        departement: offre.departement,
        commune: offre.commune,
        codePostal: offre.codePostal,
        latitude: offre.latitude,
        longitude: offre.longitude,
        tauxHoraire: offre.tauxHoraire,
        salaireLibelle: offre.salaireLibelle,
        experienceExigee: offre.experienceExigee,
        nombrePostes: offre.nombrePostes,
        publieeLe: offre.publieeLe,
        empreinte: offre.empreinte,
      };

      await this.prisma.offreCollectee.upsert({
        where: { id: offre.id },
        update: donnees,
        create: { id: offre.id, ...donnees },
      });

      enregistrees += 1;
    }

    await this.cache.oublier('tension:*');

    this.logger.log(
      `Import ${source} : ${nettoye.recues} recues, ${nettoye.ecartees} ecartees, ` +
        `${nettoye.doublons} doublons, ${enregistrees} enregistrees`,
    );

    return { ...nettoye, enregistrees, source, simulation: false };
  }

  /**
   * Barometre de tension.
   *
   * La mediane plutot que la moyenne : quelques offres a 25 euros de l'heure
   * pour des gardes de nuit tireraient une moyenne vers le haut et feraient
   * suggerer un taux hors marche a une entreprise.
   */
  async barometre(jours = 30, departement?: string): Promise<Barometre> {
    const cle = `tension:${jours}:${departement ?? 'toutes'}`;
    const enCache = await this.cache.lire<Barometre>(cle);

    if (enCache) {
      return { ...enCache, depuisLeCache: true };
    }

    const depuis = new Date(Date.now() - jours * 24 * 3600 * 1000);

    const lignes = await this.prisma.$queryRaw<LigneAgregat[]>`
      SELECT
        "romeCode",
        MIN("romeLibelle")                                              AS "romeLibelle",
        "departement",
        COUNT(*)                                                        AS "offres",
        SUM("nombrePostes")                                             AS "postes",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "tauxHoraire")      AS "median",
        MIN("tauxHoraire")                                              AS "minimum",
        MAX("tauxHoraire")                                              AS "maximum",
        COUNT(*) FILTER (WHERE "experienceExigee")                      AS "avecExperience",
        COUNT(*) FILTER (WHERE "tauxHoraire" IS NULL)                   AS "sansSalaire"
      FROM "offre_collectee"
      WHERE "publieeLe" >= ${depuis}
        AND (${departement ?? null}::text IS NULL OR "departement" = ${departement ?? null})
      GROUP BY "romeCode", "departement"
      ORDER BY COUNT(*) DESC
    `;

    const barometre: Barometre = {
      periodeJours: jours,
      calculeLe: new Date().toISOString(),
      depuisLeCache: false,
      metiers: lignes.map((ligne) => ({
        romeCode: ligne.romeCode,
        romeLibelle: ligne.romeLibelle,
        departement: ligne.departement,
        offres: Number(ligne.offres),
        postes: Number(ligne.postes),
        tauxHoraireMedian: ligne.median ? Number(ligne.median) : null,
        tauxHoraireMin: ligne.minimum ? Number(ligne.minimum) : null,
        tauxHoraireMax: ligne.maximum ? Number(ligne.maximum) : null,
        partExperienceExigee:
          Number(ligne.offres) > 0
            ? Math.round((Number(ligne.avecExperience) / Number(ligne.offres)) * 100)
            : 0,
        offresSansSalaire: Number(ligne.sansSalaire),
      })),
    };

    await this.cache.ecrire(cle, barometre, CACHE_SECONDES);

    return barometre;
  }

  /**
   * Taux horaire suggere pour un metier et un departement.
   *
   * C'est le premier des deux usages visibles de la donnee publique : au moment
   * ou l'entreprise cree sa mission, elle voit ce que paie le marche autour
   * d'elle plutot que de deviner. Le repli sur la moyenne nationale evite de ne
   * rien afficher dans un departement peu couvert.
   */
  async tauxSuggere(romeCode: string, departement?: string, jours = 90): Promise<SuggestionTaux> {
    const barometre = await this.barometre(jours, departement);
    const local = barometre.metiers.find((metier) => metier.romeCode === romeCode);

    if (local?.tauxHoraireMedian) {
      return {
        tauxHoraireMedian: local.tauxHoraireMedian,
        offres: local.offres,
        perimetre: 'departemental',
      };
    }

    const national = await this.barometre(jours);
    const metiers = national.metiers.filter((metier) => metier.romeCode === romeCode);

    if (!metiers.length) {
      return { tauxHoraireMedian: null, offres: 0, perimetre: 'aucun' };
    }

    const taux = metiers
      .map((metier) => metier.tauxHoraireMedian)
      .filter((valeur): valeur is number => valeur !== null)
      .sort((a, b) => a - b);

    const offres = metiers.reduce((somme, metier) => somme + metier.offres, 0);

    if (!taux.length) {
      return { tauxHoraireMedian: null, offres, perimetre: 'aucun' };
    }

    return {
      tauxHoraireMedian: taux[Math.floor(taux.length / 2)]!,
      offres,
      perimetre: 'national',
    };
  }
}

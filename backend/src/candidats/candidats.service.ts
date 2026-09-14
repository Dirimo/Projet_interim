import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CandidatCreate,
  CandidatDetail,
  CandidatListQuery,
  CandidatResume,
  CandidatUpdate,
  DisponibilitesRemplace,
  DisponibiliteResume,
  Indisponibilite,
  IndisponibiliteResume,
  PageResultat,
  QualificationCandidatCreate,
  QualificationCandidatResume,
  QualificationCandidatUpdate,
  UtilisateurSession,
} from '@passerelle/shared';
import { PrismaService } from '../prisma/prisma.service';

const avecQualifications = {
  include: { qualifications: { include: { qualification: true } } },
} satisfies Prisma.CandidatDefaultArgs;

const avecTout = {
  include: {
    qualifications: {
      include: { qualification: true },
      orderBy: { qualification: { code: 'asc' } },
    },
    disponibilites: { orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }] },
    indisponibilites: { orderBy: { du: 'asc' } },
  },
} satisfies Prisma.CandidatDefaultArgs;

type CandidatComplet = Prisma.CandidatGetPayload<typeof avecQualifications>;
type CandidatDetaille = Prisma.CandidatGetPayload<typeof avecTout>;
type LienQualification = CandidatDetaille['qualifications'][number];

/** Les colonnes @db.Date sont des dates civiles : on les rend sans fuseau. */
function enDateIso(valeur: Date | null): string | null {
  return valeur ? valeur.toISOString().slice(0, 10) : null;
}

function versDate(valeur: string | null | undefined): Date | null | undefined {
  if (valeur === undefined) {
    return undefined;
  }

  return valeur === null ? null : new Date(`${valeur}T00:00:00.000Z`);
}

function versResume(candidat: CandidatComplet): CandidatResume {
  return {
    id: candidat.id,
    nom: candidat.nom,
    prenom: candidat.prenom,
    email: candidat.email,
    telephone: candidat.telephone,
    statut: candidat.statut,
    filieres: candidat.filieres,
    ville: candidat.ville,
    codePostal: candidat.codePostal,
    rayonKm: candidat.rayonKm,
    permisB: candidat.permisB,
    vehicule: candidat.vehicule,
    qualifications: candidat.qualifications.map((lien) => lien.qualification.code),
  };
}

function versQualificationResume(
  lien: LienQualification,
  aujourdHui: string,
): QualificationCandidatResume {
  const expireLe = enDateIso(lien.expireLe);

  return {
    qualificationId: lien.qualificationId,
    code: lien.qualification.code,
    libelle: lien.qualification.libelle,
    filieres: lien.qualification.filieres,
    obtenueLe: enDateIso(lien.obtenueLe),
    expireLe,
    justificatifUrl: lien.justificatifUrl,
    verifieeLe: lien.verifieeLe ? lien.verifieeLe.toISOString() : null,
    verifieePar: lien.verifieePar,
    expiree: expireLe !== null && expireLe < aujourdHui,
  };
}

@Injectable()
export class CandidatsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(query: CandidatListQuery, agenceId: string): Promise<PageResultat<CandidatResume>> {
    const where: Prisma.CandidatWhereInput = {
      // Cloisonnement multi-agence : jamais optionnel, jamais surchargeable
      // depuis la query - il vient du jeton.
      agenceId,
      ...(query.statut ? { statut: query.statut } : {}),
      // Un candidat peut porter les deux filieres : on filtre avec `has`.
      ...(query.filiere ? { filieres: { has: query.filiere } } : {}),
      ...(query.permisB === undefined ? {} : { permisB: query.permisB }),
      ...(query.recherche
        ? {
            OR: [
              { nom: { contains: query.recherche, mode: 'insensitive' } },
              { prenom: { contains: query.recherche, mode: 'insensitive' } },
              { ville: { contains: query.recherche, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, candidats] = await this.prisma.$transaction([
      this.prisma.candidat.count({ where }),
      this.prisma.candidat.findMany({
        where,
        ...avecQualifications,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        skip: (query.page - 1) * query.limite,
        take: query.limite,
      }),
    ]);

    return {
      donnees: candidats.map(versResume),
      total,
      page: query.page,
      limite: query.limite,
    };
  }

  async detail(id: string, agenceId: string): Promise<CandidatDetail> {
    const candidat = await this.exigerCandidat(id, agenceId, avecTout);
    const aujourdHui = new Date().toISOString().slice(0, 10);

    return {
      ...versResume(candidat),
      adresse: candidat.adresse,
      latitude: candidat.latitude,
      longitude: candidat.longitude,
      visiteMedicaleLe: enDateIso(candidat.visiteMedicaleLe),
      vaccinationVerifiee: candidat.vaccinationVerifiee,
      qualificationsDetail: candidat.qualifications.map((lien) =>
        versQualificationResume(lien, aujourdHui),
      ),
      disponibilites: candidat.disponibilites.map((creneau): DisponibiliteResume => ({
        id: creneau.id,
        jourSemaine: creneau.jourSemaine,
        heureDebut: creneau.heureDebut,
        heureFin: creneau.heureFin,
        recurrente: creneau.recurrente,
        valideDu: enDateIso(creneau.valideDu) ?? undefined,
        valideAu: enDateIso(creneau.valideAu) ?? undefined,
      })),
      indisponibilites: candidat.indisponibilites.map((periode): IndisponibiliteResume => ({
        id: periode.id,
        du: enDateIso(periode.du)!,
        au: enDateIso(periode.au)!,
        motif: periode.motif,
      })),
    };
  }

  async creer(donnees: CandidatCreate, agenceId: string): Promise<CandidatResume> {
    const candidat = await this.prisma.candidat.create({
      data: {
        agenceId,
        nom: donnees.nom,
        prenom: donnees.prenom,
        email: donnees.email,
        telephone: donnees.telephone,
        filieres: donnees.filieres,
        adresse: donnees.adresse,
        codePostal: donnees.codePostal,
        ville: donnees.ville,
        latitude: donnees.latitude ?? null,
        longitude: donnees.longitude ?? null,
        rayonKm: donnees.rayonKm,
        permisB: donnees.permisB,
        vehicule: donnees.vehicule,
      },
      ...avecQualifications,
    });

    return versResume(candidat);
  }

  async modifier(id: string, donnees: CandidatUpdate, agenceId: string): Promise<CandidatDetail> {
    const candidat = await this.exigerCandidat(id, agenceId, avecTout);

    // Passer ACTIF, c'est rendre le candidat proposable sur une mission. Sans
    // justificatif verifie, l'agence engagerait sa responsabilite a l'aveugle.
    if (donnees.statut === 'ACTIF' && candidat.statut !== 'ACTIF') {
      if (!this.aUneQualificationValide(candidat.qualifications)) {
        throw new BadRequestException(
          'Un candidat ne peut passer ACTIF sans au moins une qualification verifiee et non expiree',
        );
      }
    }

    const { visiteMedicaleLe, ...reste } = donnees;

    await this.prisma.candidat.update({
      where: { id },
      data: {
        ...reste,
        ...(visiteMedicaleLe === undefined ? {} : { visiteMedicaleLe: versDate(visiteMedicaleLe) }),
      },
    });

    return this.detail(id, agenceId);
  }

  async ajouterQualification(
    id: string,
    donnees: QualificationCandidatCreate,
    agenceId: string,
  ): Promise<CandidatDetail> {
    await this.exigerCandidat(id, agenceId, avecQualifications);

    const qualification = await this.prisma.qualification.findUnique({
      where: { id: donnees.qualificationId },
      select: { id: true },
    });

    if (!qualification) {
      throw new NotFoundException(`Qualification ${donnees.qualificationId} introuvable`);
    }

    const deja = await this.prisma.qualificationCandidat.findUnique({
      where: {
        candidatId_qualificationId: { candidatId: id, qualificationId: donnees.qualificationId },
      },
      select: { id: true },
    });

    if (deja) {
      throw new BadRequestException('Cette qualification est deja rattachee au candidat');
    }

    await this.prisma.qualificationCandidat.create({
      data: {
        candidatId: id,
        qualificationId: donnees.qualificationId,
        obtenueLe: versDate(donnees.obtenueLe) ?? null,
        expireLe: versDate(donnees.expireLe) ?? null,
        justificatifUrl: donnees.justificatifUrl ?? null,
      },
    });

    return this.detail(id, agenceId);
  }

  async modifierQualification(
    id: string,
    qualificationId: string,
    donnees: QualificationCandidatUpdate,
    utilisateur: UtilisateurSession,
    agenceId: string,
  ): Promise<CandidatDetail> {
    await this.exigerCandidat(id, agenceId, avecQualifications);

    const lien = await this.prisma.qualificationCandidat.findUnique({
      where: { candidatId_qualificationId: { candidatId: id, qualificationId } },
      select: { id: true },
    });

    if (!lien) {
      throw new NotFoundException('Cette qualification n est pas rattachee au candidat');
    }

    const { verifiee, obtenueLe, expireLe, justificatifUrl } = donnees;

    await this.prisma.qualificationCandidat.update({
      where: { id: lien.id },
      data: {
        ...(obtenueLe === undefined ? {} : { obtenueLe: versDate(obtenueLe) }),
        ...(expireLe === undefined ? {} : { expireLe: versDate(expireLe) }),
        ...(justificatifUrl === undefined ? {} : { justificatifUrl }),
        // On trace qui a verifie et quand : en cas de controle, c'est cette
        // ligne qui justifie qu'un interimaire a ete propose sur une mission.
        ...(verifiee === undefined
          ? {}
          : verifiee
            ? { verifieeLe: new Date(), verifieePar: utilisateur.email }
            : { verifieeLe: null, verifieePar: null }),
      },
    });

    return this.detail(id, agenceId);
  }

  async retirerQualification(
    id: string,
    qualificationId: string,
    agenceId: string,
  ): Promise<CandidatDetail> {
    const candidat = await this.exigerCandidat(id, agenceId, avecTout);

    const lien = candidat.qualifications.find((q) => q.qualificationId === qualificationId);

    if (!lien) {
      throw new NotFoundException('Cette qualification n est pas rattachee au candidat');
    }

    // Un candidat ACTIF sans qualification verifiee deviendrait proposable sans
    // justificatif : on refuse plutot que de le desactiver dans son dos.
    if (candidat.statut === 'ACTIF') {
      const restantes = candidat.qualifications.filter(
        (q) => q.qualificationId !== qualificationId,
      );

      if (!this.aUneQualificationValide(restantes)) {
        throw new BadRequestException(
          'Derniere qualification verifiee d un candidat actif : le passer INACTIF avant de la retirer',
        );
      }
    }

    await this.prisma.qualificationCandidat.delete({ where: { id: lien.id } });

    return this.detail(id, agenceId);
  }

  /**
   * Remplace l'integralite du planning hebdomadaire.
   *
   * Remplacement et pas edition ligne a ligne : le chevauchement se verifie sur
   * l'ensemble des creneaux, pas sur celui qu'on ajoute. Une edition
   * incrementale obligerait a relire l'existant a chaque appel, avec une course
   * possible entre deux onglets ouverts sur la meme fiche.
   */
  async remplacerDisponibilites(
    id: string,
    donnees: DisponibilitesRemplace,
    agenceId: string,
  ): Promise<CandidatDetail> {
    await this.exigerCandidat(id, agenceId, avecQualifications);

    await this.prisma.$transaction([
      this.prisma.disponibilite.deleteMany({ where: { candidatId: id } }),
      this.prisma.disponibilite.createMany({
        data: donnees.disponibilites.map((creneau) => ({
          candidatId: id,
          jourSemaine: creneau.jourSemaine,
          heureDebut: creneau.heureDebut,
          heureFin: creneau.heureFin,
          recurrente: creneau.recurrente,
          valideDu: versDate(creneau.valideDu) ?? null,
          valideAu: versDate(creneau.valideAu) ?? null,
        })),
      }),
    ]);

    return this.detail(id, agenceId);
  }

  async ajouterIndisponibilite(
    id: string,
    donnees: Indisponibilite,
    agenceId: string,
  ): Promise<CandidatDetail> {
    await this.exigerCandidat(id, agenceId, avecQualifications);

    await this.prisma.indisponibilite.create({
      data: {
        candidatId: id,
        du: versDate(donnees.du)!,
        au: versDate(donnees.au)!,
        motif: donnees.motif ?? null,
      },
    });

    return this.detail(id, agenceId);
  }

  async retirerIndisponibilite(
    id: string,
    indisponibiliteId: string,
    agenceId: string,
  ): Promise<CandidatDetail> {
    await this.exigerCandidat(id, agenceId, avecQualifications);

    const periode = await this.prisma.indisponibilite.findFirst({
      where: { id: indisponibiliteId, candidatId: id },
      select: { id: true },
    });

    if (!periode) {
      throw new NotFoundException(`Indisponibilite ${indisponibiliteId} introuvable`);
    }

    await this.prisma.indisponibilite.delete({ where: { id: periode.id } });

    return this.detail(id, agenceId);
  }

  private aUneQualificationValide(qualifications: LienQualification[]): boolean {
    const maintenant = new Date();

    return qualifications.some(
      (lien) => lien.verifieeLe !== null && (lien.expireLe === null || lien.expireLe >= maintenant),
    );
  }

  /**
   * Charge un candidat en verifiant qu'il appartient a l'agence appelante.
   * findFirst et pas findUnique : un candidat d'une autre agence doit repondre
   * 404, pas 403 - on ne confirme pas qu'il existe.
   */
  private async exigerCandidat<TArgs extends Prisma.CandidatDefaultArgs>(
    id: string,
    agenceId: string,
    args: TArgs,
  ): Promise<Prisma.CandidatGetPayload<TArgs>> {
    const candidat = await this.prisma.candidat.findFirst({ where: { id, agenceId }, ...args });

    if (!candidat) {
      throw new NotFoundException(`Candidat ${id} introuvable`);
    }

    return candidat as Prisma.CandidatGetPayload<TArgs>;
  }
}

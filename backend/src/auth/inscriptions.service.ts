import { ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type {
  EspacePersonnel,
  InscriptionInterimaire,
  ReponseInscription,
  UtilisateurSession,
} from '@releve/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodageService } from '../geocodage/geocodage.service';
import { VerificationEmailService } from './verification-email.service';
import { hacherMotDePasse } from './mots-de-passe';

@Injectable()
export class InscriptionsService {
  private readonly logger = new Logger(InscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationEmailService,
    private readonly config: ConfigService,
    private readonly geocodage: GeocodageService,
  ) {}

  private async agenceDInscription(): Promise<string> {
    const configuree = this.config.get<string>('AGENCE_PAR_DEFAUT_ID');

    if (configuree) {
      const agence = await this.prisma.agence.findUnique({
        where: { id: configuree },
        select: { id: true },
      });

      if (agence) {
        return agence.id;
      }

      this.logger.error(`AGENCE_PAR_DEFAUT_ID pointe sur une agence inconnue : ${configuree}`);
    }

    const premiere = await this.prisma.agence.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!premiere) {
      throw new ServiceUnavailableException('Aucune agence ne peut recevoir les inscriptions');
    }

    return premiere.id;
  }

  private async exigerEmailLibre(email: string): Promise<void> {
    const existant = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existant) {
      throw new ConflictException('Un compte existe deja pour cette adresse e-mail');
    }
  }

  /**
   * Inscription d'un interimaire (Candidat).
   */
  async interimaire(donnees: InscriptionInterimaire): Promise<ReponseInscription> {
    await this.exigerEmailLibre(donnees.compte.email);

    const agenceId = await this.agenceDInscription();
    const empreinte = await hacherMotDePasse(donnees.compte.motDePasse);
    let compte: { id: string; email: string };
    let ficheId: string;

    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const candidat = await tx.candidat.create({
          data: {
            agenceId,
            nom: donnees.interimaire.nom,
            prenom: donnees.interimaire.prenom,
            email: donnees.compte.email,
            telephone: donnees.interimaire.telephone,
            adresse: donnees.interimaire.adresse,
            codePostal: donnees.interimaire.codePostal,
            ville: donnees.interimaire.ville,
            rayonKm: donnees.interimaire.rayonKm,
            permisB: donnees.interimaire.permisB,
            vehicule: donnees.interimaire.vehicule,
            statut: 'EN_VERIFICATION',
          },
          select: { id: true },
        });

        ficheId = candidat.id;

        return tx.utilisateur.create({
          data: {
            email: donnees.compte.email,
            motDePasse: empreinte,
            role: 'CANDIDAT',
            candidatId: candidat.id,
          },
        });
      });

      this.logger.log(`Inscription interimaire : ${donnees.compte.email}`);
      compte = utilisateur;
    } catch (cause) {
      throw this.traduireConflit(cause, 'email', 'Une fiche existe deja pour cette adresse e-mail');
    }

    await this.geocodage.situer('candidat', ficheId!, donnees.interimaire);

    await this.verification.emettre({
      id: compte.id,
      email: compte.email,
      prenom: donnees.interimaire.prenom,
    });

    return { email: compte.email, verificationRequise: true };
  }

  /**
   * Inscription d'un établissement (Client / Entreprise).
   */
  async client(donnees: any): Promise<ReponseInscription> {
    await this.exigerEmailLibre(donnees.compte.email);

    const agenceId = await this.agenceDInscription();
    const empreinte = await hacherMotDePasse(donnees.compte.motDePasse);
    let compte: { id: string; email: string };

    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const nouveauClient = await tx.client.create({
          data: {
            agenceId,
            raisonSociale: donnees.client?.raisonSociale || donnees.client?.nom || 'Établissement',
            siret: donnees.client?.siret || '',
            type: donnees.client?.type || 'EHPAD',
            contactNom: donnees.client?.contactNom || donnees.client?.prenom || 'Contact',
            contactEmail: donnees.compte.email,
            contactTel: donnees.client?.telephone || '',
            actif: false,
          },
          select: { id: true },
        });

        return tx.utilisateur.create({
          data: {
            email: donnees.compte.email,
            motDePasse: empreinte,
            role: 'CLIENT',
            clientId: nouveauClient.id,
          },
        });
      });

      this.logger.log(`Inscription client/entreprise : ${donnees.compte.email}`);
      compte = utilisateur;
    } catch (cause) {
      throw this.traduireConflit(cause, 'email', 'Une fiche existe deja pour cette adresse e-mail');
    }

    await this.verification.emettre({
      id: compte.id,
      email: compte.email,
      prenom: donnees.client?.contactNom || 'Responsable',
    });

    return { email: compte.email, verificationRequise: true };
  }

  async espace(session: UtilisateurSession): Promise<EspacePersonnel> {
    if (session.clientId) {
      const client = await this.prisma.client.findUniqueOrThrow({
        where: { id: session.clientId },
        include: { _count: { select: { lieux: true } } },
      });

      return {
        type: 'CLIENT',
        valideParLAgence: client.actif,
        client: {
          id: client.id,
          raisonSociale: client.raisonSociale,
          siret: client.siret,
          type: client.type,
          conventionCollective: client.conventionCollective,
          idcc: client.idcc,
          contactNom: client.contactNom,
          contactEmail: client.contactEmail,
          contactTel: client.contactTel,
          actif: client.actif,
          statutReglementaire: client.statutReglementaire,
          numeroSap: client.numeroSap,
          numeroAgrement: client.numeroAgrement,
          numeroFiness: client.numeroFiness,
          arreteReference: client.arreteReference,
          arreteDate: client.arreteDate?.toISOString().slice(0, 10) ?? null,
          nombreLieux: client._count.lieux,
        },
      };
    }

    if (session.candidatId) {
      const candidat = await this.prisma.candidat.findUniqueOrThrow({
        where: { id: session.candidatId },
        include: { qualifications: { include: { qualification: true } } },
      });

      return {
        type: 'CANDIDAT',
        valideParLAgence: candidat.statut === 'ACTIF',
        candidat: {
          id: candidat.id,
          nom: candidat.nom,
          prenom: candidat.prenom,
          email: candidat.email,
          telephone: candidat.telephone,
          statut: candidat.statut,
          ville: candidat.ville,
          codePostal: candidat.codePostal,
          rayonKm: candidat.rayonKm,
          permisB: candidat.permisB,
          vehicule: candidat.vehicule,
          qualifications: candidat.qualifications.map((lien) => lien.qualification.code),
        },
      };
    }

    return { type: 'AGENCE' };
  }

  private traduireConflit(cause: unknown, champ: string, message: string): unknown {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      const cibles = cause.meta?.target;

      if (Array.isArray(cibles) && cibles.some((cible) => String(cible).includes(champ))) {
        return new ConflictException(message);
      }

      return new ConflictException('Cette inscription existe deja');
    }

    return cause;
  }
}
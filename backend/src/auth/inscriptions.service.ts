import { ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type {
  EspacePersonnel,
  InscriptionEntreprise,
  InscriptionInterimaire,
  ReponseConnexion,
  UtilisateurSession,
} from '@releve/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hacherMotDePasse } from './mots-de-passe';

@Injectable()
export class InscriptionsService {
  private readonly logger = new Logger(InscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Agence a laquelle rattacher une inscription venue du site public.
   *
   * Le visiteur ne choisit pas son agence : il ne sait pas comment le groupe
   * est decoupe, et le lui demander ferait porter une erreur de saisie sur le
   * cloisonnement. Un deploiement mono-agence prend la seule qui existe ;
   * `AGENCE_PAR_DEFAUT_ID` tranche si le groupe en exploite plusieurs.
   *
   * TODO(lot 2) : router selon le departement du demandeur plutot que par
   * configuration, quand les secteurs des agences seront en base.
   */
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
      // 503 et non 500 : la base est saine, c'est le parametrage qui manque.
      throw new ServiceUnavailableException('Aucune agence ne peut recevoir les inscriptions');
    }

    return premiere.id;
  }

  /** L'adresse sert d'identifiant de connexion : elle ne peut pas etre partagee. */
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
   * Inscription d'une entreprise utilisatrice.
   *
   * La fiche client nait inactive : l'agence verifie l'entreprise et renseigne
   * sa convention collective avant qu'elle puisse deposer un besoin. Le compte,
   * lui, est actif tout de suite — la personne doit pouvoir se connecter pour
   * suivre l'avancement de sa demande.
   */
  async entreprise(donnees: InscriptionEntreprise): Promise<ReponseConnexion> {
    await this.exigerEmailLibre(donnees.compte.email);

    const agenceId = await this.agenceDInscription();
    const empreinte = await hacherMotDePasse(donnees.compte.motDePasse);

    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const client = await tx.client.create({
          data: {
            agenceId,
            raisonSociale: donnees.entreprise.raisonSociale,
            siret: donnees.entreprise.siret,
            type: donnees.entreprise.type,
            contactNom: donnees.entreprise.contactNom ?? null,
            contactEmail: donnees.compte.email,
            contactTel: donnees.entreprise.contactTel ?? null,
            actif: false,
          },
          select: { id: true },
        });

        return tx.utilisateur.create({
          data: {
            email: donnees.compte.email,
            motDePasse: empreinte,
            role: 'CLIENT',
            clientId: client.id,
          },
        });
      });

      this.logger.log(`Inscription entreprise : ${donnees.entreprise.raisonSociale}`);

      return this.auth.ouvrirSession(utilisateur);
    } catch (cause) {
      throw this.traduireConflit(cause, 'siret', 'Une entreprise est deja inscrite avec ce SIRET');
    }
  }

  /**
   * Inscription d'un interimaire.
   *
   * Le statut `EN_VERIFICATION` est le coeur du parcours : personne n'est
   * proposable avant que l'agence ait vu les diplomes. Se declarer aide-soignant
   * ne suffit pas a etre envoye en EHPAD.
   */
  async interimaire(donnees: InscriptionInterimaire): Promise<ReponseConnexion> {
    await this.exigerEmailLibre(donnees.compte.email);

    const agenceId = await this.agenceDInscription();
    const empreinte = await hacherMotDePasse(donnees.compte.motDePasse);

    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const candidat = await tx.candidat.create({
          data: {
            agenceId,
            nom: donnees.interimaire.nom,
            prenom: donnees.interimaire.prenom,
            email: donnees.compte.email,
            telephone: donnees.interimaire.telephone,
            filieres: donnees.interimaire.filieres,
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

      return this.auth.ouvrirSession(utilisateur);
    } catch (cause) {
      throw this.traduireConflit(cause, 'email', 'Une fiche existe deja pour cette adresse e-mail');
    }
  }

  /**
   * Vue que le compte a de lui-meme.
   *
   * Le back-office n'y lit rien : son espace, ce sont le vivier et les
   * referentiels. Les deux profils externes, eux, n'ont que cela.
   */
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
          filieres: candidat.filieres,
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

  /**
   * Une contrainte d'unicite qui saute pendant la transaction devient un 409
   * lisible plutot qu'une 500. Le cas se produit quand deux inscriptions
   * partent en meme temps avec le meme SIRET : la verification prealable passe
   * pour les deux, c'est la base qui tranche.
   */
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

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { ReponseConnexion } from '@releve/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { courrielVerification } from '../mail/gabarits';
import { AuthService } from './auth.service';

/** Ce qu'il faut pour rediger le courriel et retrouver le compte. */
interface Destinataire {
  id: string;
  email: string;
  prenom: string | null;
}

@Injectable()
export class VerificationEmailService {
  private readonly logger = new Logger(VerificationEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}

  /** Meme regle que les jetons de rafraichissement : la base ne voit qu'une empreinte. */
  private empreinte(valeur: string): string {
    return createHash('sha256').update(valeur).digest('hex');
  }

  private get dureeHeures(): number {
    return Number(this.config.get<string>('VERIFICATION_EXPIRE_HEURES') ?? 48);
  }

  /**
   * Emet un lien et l'envoie.
   *
   * Les liens precedents du meme compte sont consommes au passage : demander un
   * renvoi doit invalider ce qui a ete envoye avant, sinon un lien intercepte
   * reste utilisable indefiniment tant que la personne n'a pas clique sur le
   * dernier.
   *
   * Retourne le lien, dont seuls les tests se servent — le reste du code n'a
   * aucune raison de le connaitre.
   */
  async emettre(destinataire: Destinataire): Promise<string> {
    const valeur = randomBytes(32).toString('base64url');
    const expireLe = new Date(Date.now() + this.dureeHeures * 3600 * 1000);
    const maintenant = new Date();

    await this.prisma.$transaction([
      this.prisma.jetonVerificationEmail.updateMany({
        where: { utilisateurId: destinataire.id, consommeLe: null },
        data: { consommeLe: maintenant },
      }),
      this.prisma.jetonVerificationEmail.create({
        data: {
          utilisateurId: destinataire.id,
          email: destinataire.email,
          empreinte: this.empreinte(valeur),
          expireLe,
        },
      }),
    ]);

    const base = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const lien = `${base.replace(/\/+$/, '')}/verification?jeton=${encodeURIComponent(valeur)}`;

    await this.mail.envoyer(
      courrielVerification(destinataire.email, destinataire.prenom, lien, this.dureeHeures),
    );

    return lien;
  }

  /**
   * Confirme l'adresse et ouvre la session.
   *
   * Un seul message d'erreur pour tous les refus — jeton inconnu, deja
   * consomme, expire. Les distinguer apprendrait a qui tatonne si une valeur a
   * deja existe, et ne change rien pour la personne de bonne foi : dans les
   * trois cas, la marche a suivre est de demander un nouveau lien.
   */
  async confirmer(valeur: string): Promise<ReponseConnexion> {
    const jeton = await this.prisma.jetonVerificationEmail.findUnique({
      where: { empreinte: this.empreinte(valeur) },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            role: true,
            actif: true,
            agenceId: true,
            clientId: true,
            candidatId: true,
            emailVerifieLe: true,
          },
        },
      },
    });

    const refus = new BadRequestException(
      'Ce lien de verification est invalide ou expire. Demandez-en un nouveau.',
    );

    if (!jeton || jeton.consommeLe || jeton.expireLe < new Date()) {
      throw refus;
    }

    // L'adresse a change entre l'emission et le clic : le lien confirmerait
    // alors une adresse que personne n'a prouvee.
    if (jeton.email !== jeton.utilisateur.email) {
      throw refus;
    }

    if (!jeton.utilisateur.actif) {
      throw refus;
    }

    const utilisateur = jeton.utilisateur;

    await this.prisma.$transaction([
      this.prisma.jetonVerificationEmail.update({
        where: { id: jeton.id },
        data: { consommeLe: new Date() },
      }),
      // `emailVerifieLe` n'est pose qu'ici, et une seule fois : un second lien
      // valide ne doit pas reecrire la date de la premiere confirmation.
      this.prisma.utilisateur.updateMany({
        where: { id: utilisateur.id, emailVerifieLe: null },
        data: { emailVerifieLe: new Date(), derniereCnx: new Date() },
      }),
    ]);

    this.logger.log(`Adresse confirmee : ${utilisateur.email}`);

    return this.auth.ouvrirSession(utilisateur);
  }

  /**
   * Renvoi du lien.
   *
   * Ne dit jamais si l'adresse existe, ni si elle est deja confirmee : ce
   * formulaire est public, et repondre differemment en ferait un testeur
   * d'adresses. L'appelant recoit toujours la meme chose.
   */
  async renvoyer(email: string): Promise<void> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerifieLe: true,
        actif: true,
        candidat: { select: { prenom: true } },
        client: { select: { contactNom: true } },
      },
    });

    if (!utilisateur || utilisateur.emailVerifieLe || !utilisateur.actif) {
      this.logger.log(`Renvoi sans effet demande pour ${email}`);

      return;
    }

    await this.emettre({
      id: utilisateur.id,
      email: utilisateur.email,
      prenom: utilisateur.candidat?.prenom ?? utilisateur.client?.contactNom ?? null,
    });
  }
}

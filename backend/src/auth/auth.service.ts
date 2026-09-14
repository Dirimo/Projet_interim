import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { setTimeout as attendre } from 'node:timers/promises';
import type {
  Connexion,
  MotDePasseChange,
  ReponseConnexion,
  UtilisateurSession,
} from '@releve/shared';
import { PrismaService } from '../prisma/prisma.service';
import { hacherMotDePasse, verifierMotDePasse } from './mots-de-passe';
import { SessionsService } from './sessions.service';
import type { ChargeUtileJeton } from './auth.types';

/** Ce qu'il faut d'un compte pour lui ouvrir une session. */
type CompteAuthentifie = Pick<
  UtilisateurSession,
  'id' | 'email' | 'role' | 'agenceId' | 'clientId' | 'candidatId'
>;

/** Au-dela de ce nombre d'echecs consecutifs, la reponse est ralentie. */
const ECHECS_AVANT_RALENTISSEMENT = 5;

/** Plafond du ralentissement : au-dela, on immobiliserait nos propres requetes. */
const RALENTISSEMENT_MAX_MS = 5_000;

/** Apres ce delai sans echec, le compteur repart de zero. */
const OUBLI_ECHECS_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Empreinte jetable verifiee quand l'e-mail est inconnu : sans elle, une
   * reponse instantanee revelerait qu'un compte n'existe pas. Calculee une
   * seule fois, au premier echec.
   */
  private leurre?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  /**
   * Ralentissement exponentiel apres echecs repetes.
   *
   * Deliberement pas un verrouillage : bloquer un compte offrirait a un
   * attaquant le moyen de fermer l'agence a 6h30 en saisissant trois mauvais
   * mots de passe, et annoncer "compte verrouille" trahirait l'existence du
   * compte. Un delai invisible ne bloque personne, ne revele rien, et rend le
   * bourrinage distribue impraticable.
   */
  private delaiApresEchecs(echecs: number): number {
    if (echecs < ECHECS_AVANT_RALENTISSEMENT) {
      return 0;
    }

    const progression = 2 ** (echecs - ECHECS_AVANT_RALENTISSEMENT) * 250;

    return Math.min(progression, RALENTISSEMENT_MAX_MS);
  }

  private echecsCourants(echecs: number, dernierEchecLe: Date | null): number {
    if (!dernierEchecLe || Date.now() - dernierEchecLe.getTime() > OUBLI_ECHECS_MS) {
      return 0;
    }

    return echecs;
  }

  async connexion(donnees: Connexion): Promise<ReponseConnexion> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: donnees.email },
    });

    if (!utilisateur) {
      this.leurre ??= hacherMotDePasse('leurre-anti-enumeration');
      await verifierMotDePasse(await this.leurre, donnees.motDePasse);
      throw new UnauthorizedException('Identifiants invalides');
    }

    const echecs = this.echecsCourants(utilisateur.echecsConnexion, utilisateur.dernierEchecLe);
    const delai = this.delaiApresEchecs(echecs);

    if (delai > 0) {
      await attendre(delai);
    }

    const motDePasseValide = await verifierMotDePasse(utilisateur.motDePasse, donnees.motDePasse);

    // Meme message dans les deux cas : un compte desactive ne doit pas se
    // distinguer d'un mot de passe faux vu du formulaire de connexion.
    if (!motDePasseValide || !utilisateur.actif) {
      this.logger.warn(
        `Connexion refusee pour ${utilisateur.email} (${motDePasseValide ? 'compte inactif' : 'mot de passe invalide'})`,
      );

      await this.prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { echecsConnexion: echecs + 1, dernierEchecLe: new Date() },
      });

      throw new UnauthorizedException('Identifiants invalides');
    }

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { derniereCnx: new Date(), echecsConnexion: 0, dernierEchecLe: null },
    });

    return this.ouvrirSession(utilisateur);
  }

  /**
   * Emet les deux jetons pour un compte dont l'identite est deja etablie :
   * apres verification du mot de passe, ou juste apres une inscription. Le
   * chemin est le meme dans les deux cas, il n'y a donc qu'un endroit ou une
   * session peut naitre.
   */
  async ouvrirSession(utilisateur: CompteAuthentifie): Promise<ReponseConnexion> {
    const session: UtilisateurSession = {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      agenceId: utilisateur.agenceId,
      clientId: utilisateur.clientId,
      candidatId: utilisateur.candidatId,
    };

    const rafraichissement = await this.sessions.ouvrir(session.id);

    return { ...this.emettreAcces(session), ...this.formaterRafraichissement(rafraichissement) };
  }

  /**
   * Echange un jeton de rafraichissement contre un nouvel acces. La session est
   * relue en base a cette occasion : un compte desactive ou dont le role a change
   * ne prolonge pas un jeton devenu faux.
   */
  async rafraichir(valeur: string): Promise<ReponseConnexion> {
    const { utilisateurId, jeton } = await this.sessions.rafraichir(valeur);

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });

    if (!utilisateur || !utilisateur.actif) {
      await this.sessions.revoquerTout(utilisateurId);
      throw new UnauthorizedException('Compte desactive');
    }

    const session: UtilisateurSession = {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      agenceId: utilisateur.agenceId,
      clientId: utilisateur.clientId,
      candidatId: utilisateur.candidatId,
    };

    return { ...this.emettreAcces(session), ...this.formaterRafraichissement(jeton) };
  }

  async deconnexion(valeur: string): Promise<void> {
    await this.sessions.fermer(valeur);
  }

  /**
   * Changement par l'interesse lui-meme. On revalide l'ancien mot de passe :
   * un poste laisse ouvert ne doit pas suffire a verrouiller le compte de
   * quelqu'un d'autre.
   *
   * Toutes les sessions sont coupees dans la foulee, y compris celle qui fait
   * la demande : changer son mot de passe apres un vol de session doit fermer
   * la session du voleur, sinon la mesure ne sert a rien.
   */
  async changerMotDePasse(
    utilisateur: UtilisateurSession,
    donnees: MotDePasseChange,
  ): Promise<void> {
    const enregistre = await this.prisma.utilisateur.findUniqueOrThrow({
      where: { id: utilisateur.id },
      select: { motDePasse: true },
    });

    if (!(await verifierMotDePasse(enregistre.motDePasse, donnees.ancien))) {
      this.logger.warn(`Changement de mot de passe refuse pour ${utilisateur.email}`);
      throw new UnauthorizedException('Mot de passe actuel invalide');
    }

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { motDePasse: await hacherMotDePasse(donnees.nouveau) },
    });

    await this.sessions.revoquerTout(utilisateur.id);
  }

  private emettreAcces(session: UtilisateurSession): {
    jeton: string;
    expireDans: number;
    utilisateur: UtilisateurSession;
  } {
    const charge: ChargeUtileJeton = {
      sub: session.id,
      email: session.email,
      role: session.role,
      agenceId: session.agenceId,
      clientId: session.clientId,
      candidatId: session.candidatId,
    };

    const jeton = this.jwt.sign(charge);
    const { exp } = this.jwt.decode<{ exp: number }>(jeton);

    return {
      jeton,
      expireDans: Math.max(0, exp - Math.floor(Date.now() / 1000)),
      utilisateur: session,
    };
  }

  private formaterRafraichissement(jeton: { valeur: string; expireDans: number }): {
    jetonRafraichissement: string;
    rafraichissementExpireDans: number;
  } {
    return {
      jetonRafraichissement: jeton.valeur,
      rafraichissementExpireDans: jeton.expireDans,
    };
  }
}

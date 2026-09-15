import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  connexionSchema,
  inscriptionEntrepriseSchema,
  inscriptionInterimaireSchema,
  motDePasseChangeSchema,
  rafraichissementSchema,
  verificationConfirmeSchema,
  verificationRenvoiSchema,
  type Connexion,
  type EspacePersonnel,
  type InscriptionEntreprise,
  type InscriptionInterimaire,
  type MotDePasseChange,
  type Rafraichissement,
  type ReponseConnexion,
  type ReponseInscription,
  type UtilisateurSession,
  type VerificationConfirme,
  type VerificationRenvoi,
} from '@releve/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { InscriptionsService } from './inscriptions.service';
import { VerificationEmailService } from './verification-email.service';
import { Public, UtilisateurCourant } from './auth.decorateurs';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly inscriptions: InscriptionsService,
    private readonly verification: VerificationEmailService,
  ) {}

  // Plafond serre : une personne qui se connecte le fait une ou deux fois, pas
  // dix. C'est la premiere ligne contre le bourrinage depuis une seule source ;
  // le ralentissement par compte prend le relais sur une attaque distribuee.
  @Public()
  @Throttle({ connexion: { limit: 10, ttl: 60_000 } })
  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ouvrir une session et recuperer un jeton' })
  connexion(
    @Body(new ZodValidationPipe(connexionSchema)) donnees: Connexion,
  ): Promise<ReponseConnexion> {
    return this.auth.connexion(donnees);
  }

  /*
   * Les deux parcours d'inscription.
   *
   * Plafond bien plus serre que la connexion : on s'inscrit une fois. Un debit
   * eleve sur ces routes n'est pas un utilisateur maladroit, c'est quelqu'un qui
   * remplit la base de fiches bidon.
   *
   * Aucune session n'est ouverte ici, et rien n'est renvoye qu'une confirmation
   * d'envoi. L'acces passe par le lien recu a l'adresse saisie : c'est ce qui
   * empeche d'ouvrir un compte au nom de quelqu'un d'autre, sur une plateforme
   * ou l'adresse sert a la fois d'identifiant et de canal de contact.
   */
  @Public()
  @Throttle({ connexion: { limit: 5, ttl: 60_000 } })
  @Post('inscription/entreprise')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire une entreprise utilisatrice et ouvrir sa session' })
  inscrireEntreprise(
    @Body(new ZodValidationPipe(inscriptionEntrepriseSchema)) donnees: InscriptionEntreprise,
  ): Promise<ReponseInscription> {
    return this.inscriptions.entreprise(donnees);
  }

  @Public()
  @Throttle({ connexion: { limit: 5, ttl: 60_000 } })
  @Post('inscription/interimaire')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire un interimaire et ouvrir sa session' })
  inscrireInterimaire(
    @Body(new ZodValidationPipe(inscriptionInterimaireSchema)) donnees: InscriptionInterimaire,
  ): Promise<ReponseInscription> {
    return this.inscriptions.interimaire(donnees);
  }

  /**
   * Confirmation de l'adresse : le seul endroit ou une inscription devient une
   * session. Plafond large, parce qu'un lien ouvert depuis une messagerie peut
   * etre prefetche par le client mail avant que la personne ne clique.
   */
  @Public()
  @Throttle({ connexion: { limit: 20, ttl: 60_000 } })
  @Post('verification/confirmer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmer une adresse e-mail et ouvrir la session' })
  confirmerVerification(
    @Body(new ZodValidationPipe(verificationConfirmeSchema)) donnees: VerificationConfirme,
  ): Promise<ReponseConnexion> {
    return this.verification.confirmer(donnees.jeton);
  }

  /**
   * Renvoi du lien. 204 systematiquement, y compris pour une adresse inconnue
   * ou deja confirmee : une reponse qui varierait ferait de ce formulaire
   * public un testeur d'adresses.
   */
  @Public()
  @Throttle({ connexion: { limit: 3, ttl: 60_000 } })
  @Post('verification/renvoyer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Renvoyer le lien de confirmation' })
  renvoyerVerification(
    @Body(new ZodValidationPipe(verificationRenvoiSchema)) donnees: VerificationRenvoi,
  ): Promise<void> {
    return this.verification.renvoyer(donnees.email);
  }

  @Public()
  @Throttle({ connexion: { limit: 60, ttl: 60_000 } })
  @Post('rafraichir')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Echanger un jeton de rafraichissement contre un nouvel acces' })
  rafraichir(
    @Body(new ZodValidationPipe(rafraichissementSchema)) donnees: Rafraichissement,
  ): Promise<ReponseConnexion> {
    return this.auth.rafraichir(donnees.jetonRafraichissement);
  }

  /**
   * Public au sens de la garde JWT : a la deconnexion, le jeton d'acces est
   * souvent deja expire. C'est la possession du jeton de rafraichissement qui
   * fait foi, et le revoquer n'est de toute facon pas une operation sensible.
   */
  @Public()
  @Post('deconnexion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Fermer la session presentee' })
  deconnexion(
    @Body(new ZodValidationPipe(rafraichissementSchema)) donnees: Rafraichissement,
  ): Promise<void> {
    return this.auth.deconnexion(donnees.jetonRafraichissement);
  }

  // Accessible a tout compte authentifie, quel que soit son role : c'est le
  // seul endroit ou un client ou un candidat agit sur son propre compte.
  @Post('mot-de-passe')
  @Throttle({ connexion: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer son propre mot de passe' })
  changerMotDePasse(
    @UtilisateurCourant() utilisateur: UtilisateurSession,
    @Body(new ZodValidationPipe(motDePasseChangeSchema)) donnees: MotDePasseChange,
  ): Promise<void> {
    return this.auth.changerMotDePasse(utilisateur, donnees);
  }

  @Get('moi')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Session courante, telle que portee par le jeton' })
  moi(@UtilisateurCourant() utilisateur: UtilisateurSession): UtilisateurSession {
    return utilisateur;
  }

  /**
   * Ce que le compte voit de lui-meme : sa fiche et son etat de validation.
   * C'est la porte d'entree des deux espaces externes, la ou le back-office
   * ouvre sur le vivier.
   */
  @Get('mon-espace')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fiche rattachee au compte connecte et son etat' })
  monEspace(@UtilisateurCourant() utilisateur: UtilisateurSession): Promise<EspacePersonnel> {
    return this.inscriptions.espace(utilisateur);
  }
}

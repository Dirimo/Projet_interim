import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  connexionSchema,
  inscriptionInterimaireSchema,
  motDePasseChangeSchema,
  motDePasseOublieSchema,
  motDePasseReinitialisationSchema,
  rafraichissementSchema,
  verificationConfirmeSchema,
  verificationRenvoiSchema,
  type Connexion,
  type EspacePersonnel,
  type InscriptionInterimaire,
  type MotDePasseChange,
  type MotDePasseOublie,
  type MotDePasseReinitialisation,
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
import { ReinitialisationService } from './reinitialisation.service';
import { Public, UtilisateurCourant } from './auth.decorateurs';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly inscriptions: InscriptionsService,
    private readonly verification: VerificationEmailService,
    private readonly reinitialisation: ReinitialisationService,
  ) {}

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

  @Public()
  @Throttle({ connexion: { limit: 5, ttl: 60_000 } })
  @Post('inscription/client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire un etablissement client' })
  inscrireClient(
    @Body() donnees: any,
  ): Promise<ReponseInscription> {
    return this.inscriptions.client(donnees);
  }

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
  @Throttle({ connexion: { limit: 3, ttl: 60_000 } })
  @Post('mot-de-passe/oublie')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Demander un lien de reinitialisation du mot de passe' })
  async motDePasseOublie(
    @Body(new ZodValidationPipe(motDePasseOublieSchema)) donnees: MotDePasseOublie,
  ): Promise<void> {
    await this.reinitialisation.demander(donnees.email);
  }

  @Public()
  @Throttle({ connexion: { limit: 10, ttl: 60_000 } })
  @Post('mot-de-passe/reinitialiser')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Poser un nouveau mot de passe depuis le lien recu' })
  reinitialiserMotDePasse(
    @Body(new ZodValidationPipe(motDePasseReinitialisationSchema))
    donnees: MotDePasseReinitialisation,
  ): Promise<void> {
    return this.reinitialisation.reinitialiser(donnees.jeton, donnees.nouveau);
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

  @Public()
  @Post('deconnexion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Fermer la session presentee' })
  deconnexion(
    @Body(new ZodValidationPipe(rafraichissementSchema)) donnees: Rafraichissement,
  ): Promise<void> {
    return this.auth.deconnexion(donnees.jetonRafraichissement);
  }

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

  @Get('mon-espace')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fiche rattachee au compte connecte et son etat' })
  monEspace(@UtilisateurCourant() utilisateur: UtilisateurSession): Promise<EspacePersonnel> {
    return this.inscriptions.espace(utilisateur);
  }
}
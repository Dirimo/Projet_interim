import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  connexionSchema,
  inscriptionEntrepriseSchema,
  inscriptionInterimaireSchema,
  motDePasseChangeSchema,
  rafraichissementSchema,
  type Connexion,
  type EspacePersonnel,
  type InscriptionEntreprise,
  type InscriptionInterimaire,
  type MotDePasseChange,
  type Rafraichissement,
  type ReponseConnexion,
  type UtilisateurSession,
} from '@passerelle/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { InscriptionsService } from './inscriptions.service';
import { Public, UtilisateurCourant } from './auth.decorateurs';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly inscriptions: InscriptionsService,
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
   * La session est ouverte dans la foulee : le compte existe, il est actif, et
   * la personne doit pouvoir suivre l'avancement de sa demande. Ce qui attend la
   * validation de l'agence, c'est la fiche — pas l'acces.
   */
  @Public()
  @Throttle({ connexion: { limit: 5, ttl: 60_000 } })
  @Post('inscription/entreprise')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire une entreprise utilisatrice et ouvrir sa session' })
  inscrireEntreprise(
    @Body(new ZodValidationPipe(inscriptionEntrepriseSchema)) donnees: InscriptionEntreprise,
  ): Promise<ReponseConnexion> {
    return this.inscriptions.entreprise(donnees);
  }

  @Public()
  @Throttle({ connexion: { limit: 5, ttl: 60_000 } })
  @Post('inscription/interimaire')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrire un interimaire et ouvrir sa session' })
  inscrireInterimaire(
    @Body(new ZodValidationPipe(inscriptionInterimaireSchema)) donnees: InscriptionInterimaire,
  ): Promise<ReponseConnexion> {
    return this.inscriptions.interimaire(donnees);
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

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  declarationDiplomeSchema,
  disponibilitesRemplaceSchema,
  monProfilUpdateSchema,
  type CandidatDetail,
  type CompletudeProfil,
  type DeclarationDiplome,
  type DisponibilitesRemplace,
  type MonProfilUpdate,
  type UtilisateurSession,
} from '@releve/shared';
import { Roles, UtilisateurCourant } from '../auth/auth.decorateurs';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MonProfilService } from './mon-profil.service';

/**
 * L'interimaire sur sa propre fiche.
 *
 * Routes separees de `/candidats` plutot que des gardes assouplies : le
 * back-office garde ses regles intactes, et ce qu'un candidat peut toucher se
 * lit d'un coup d'oeil sur ce seul fichier.
 */
@ApiTags('mon-profil')
@ApiBearerAuth()
@Roles('CANDIDAT')
@Controller('mon-profil')
export class MonProfilController {
  constructor(private readonly profil: MonProfilService) {}

  @Get()
  @ApiOperation({ summary: 'Ma fiche complete' })
  lire(@UtilisateurCourant() session: UtilisateurSession): Promise<CandidatDetail> {
    return this.profil.lire(session);
  }

  @Get('completude')
  @ApiOperation({ summary: 'Ce qu il me manque pour recevoir des missions' })
  completude(@UtilisateurCourant() session: UtilisateurSession): Promise<CompletudeProfil> {
    return this.profil.completude(session);
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier mes coordonnees et mon secteur' })
  modifier(
    @Body(new ZodValidationPipe(monProfilUpdateSchema)) donnees: MonProfilUpdate,
    @UtilisateurCourant() session: UtilisateurSession,
  ): Promise<CandidatDetail> {
    return this.profil.modifier(donnees, session);
  }

  @Put('disponibilites')
  @ApiOperation({ summary: 'Declarer mes creneaux de disponibilite' })
  disponibilites(
    @Body(new ZodValidationPipe(disponibilitesRemplaceSchema)) donnees: DisponibilitesRemplace,
    @UtilisateurCourant() session: UtilisateurSession,
  ): Promise<CandidatDetail> {
    return this.profil.remplacerDisponibilites(donnees, session);
  }

  @Post('diplomes')
  @ApiOperation({ summary: 'Declarer un diplome, en attente de verification' })
  declarer(
    @Body(new ZodValidationPipe(declarationDiplomeSchema)) donnees: DeclarationDiplome,
    @UtilisateurCourant() session: UtilisateurSession,
  ): Promise<CandidatDetail> {
    return this.profil.declarerDiplome(donnees, session);
  }

  @Delete('diplomes/:qualificationId')
  @ApiOperation({ summary: 'Retirer un diplome que l agence n a pas encore verifie' })
  retirer(
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @UtilisateurCourant() session: UtilisateurSession,
  ): Promise<CandidatDetail> {
    return this.profil.retirerDiplome(qualificationId, session);
  }
}

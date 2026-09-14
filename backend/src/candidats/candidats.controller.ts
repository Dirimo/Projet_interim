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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  candidatCreateSchema,
  candidatListQuerySchema,
  candidatUpdateSchema,
  disponibilitesRemplaceSchema,
  indisponibiliteSchema,
  qualificationCandidatSchema,
  qualificationCandidatUpdateSchema,
  ROLES_AGENCE,
  type CandidatCreate,
  type CandidatDetail,
  type CandidatListQuery,
  type CandidatResume,
  type CandidatUpdate,
  type DisponibilitesRemplace,
  type Indisponibilite,
  type PageResultat,
  type QualificationCandidatCreate,
  type QualificationCandidatUpdate,
  type UtilisateurSession,
} from '@passerelle/shared';
import { AgenceCourante, Roles, UtilisateurCourant } from '../auth/auth.decorateurs';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CandidatsService } from './candidats.service';

// Le vivier est un ecran de back-office : ni le client ni le candidat n'y accedent.
@ApiTags('candidats')
@ApiBearerAuth()
@Roles(...ROLES_AGENCE)
@Controller('candidats')
export class CandidatsController {
  constructor(private readonly candidats: CandidatsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister le vivier, filtrable par filiere et par statut' })
  @ApiQuery({ name: 'filiere', required: false, enum: ['DOMICILE', 'ETABLISSEMENT'] })
  @ApiQuery({ name: 'statut', required: false })
  @ApiQuery({ name: 'recherche', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  lister(
    @Query(new ZodValidationPipe(candidatListQuerySchema)) query: CandidatListQuery,
    @AgenceCourante() agenceId: string,
  ): Promise<PageResultat<CandidatResume>> {
    return this.candidats.lister(query, agenceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche complete : qualifications, disponibilites, indisponibilites' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.detail(id, agenceId);
  }

  @Post()
  @ApiOperation({ summary: 'Creer un candidat' })
  creer(
    @Body(new ZodValidationPipe(candidatCreateSchema)) donnees: CandidatCreate,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatResume> {
    return this.candidats.creer(donnees, agenceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier la fiche ou le statut' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(candidatUpdateSchema)) donnees: CandidatUpdate,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.modifier(id, donnees, agenceId);
  }

  @Post(':id/qualifications')
  @ApiOperation({ summary: 'Rattacher une qualification du referentiel' })
  ajouterQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(qualificationCandidatSchema)) donnees: QualificationCandidatCreate,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.ajouterQualification(id, donnees, agenceId);
  }

  @Patch(':id/qualifications/:qualificationId')
  @ApiOperation({ summary: 'Verifier une qualification ou corriger ses dates' })
  modifierQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @Body(new ZodValidationPipe(qualificationCandidatUpdateSchema))
    donnees: QualificationCandidatUpdate,
    @UtilisateurCourant() utilisateur: UtilisateurSession,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.modifierQualification(
      id,
      qualificationId,
      donnees,
      utilisateur,
      agenceId,
    );
  }

  @Delete(':id/qualifications/:qualificationId')
  @ApiOperation({ summary: 'Retirer une qualification du candidat' })
  retirerQualification(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.retirerQualification(id, qualificationId, agenceId);
  }

  @Put(':id/disponibilites')
  @ApiOperation({ summary: 'Remplacer le planning hebdomadaire complet' })
  remplacerDisponibilites(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(disponibilitesRemplaceSchema)) donnees: DisponibilitesRemplace,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.remplacerDisponibilites(id, donnees, agenceId);
  }

  @Post(':id/indisponibilites')
  @ApiOperation({ summary: 'Declarer une periode d indisponibilite' })
  ajouterIndisponibilite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(indisponibiliteSchema)) donnees: Indisponibilite,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.ajouterIndisponibilite(id, donnees, agenceId);
  }

  @Delete(':id/indisponibilites/:indisponibiliteId')
  @ApiOperation({ summary: 'Supprimer une periode d indisponibilite' })
  retirerIndisponibilite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('indisponibiliteId', ParseUUIDPipe) indisponibiliteId: string,
    @AgenceCourante() agenceId: string,
  ): Promise<CandidatDetail> {
    return this.candidats.retirerIndisponibilite(id, indisponibiliteId, agenceId);
  }
}

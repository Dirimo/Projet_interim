import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  qualificationCreateSchema,
  qualificationListQuerySchema,
  type QualificationCreate,
  type QualificationListQuery,
  type QualificationResume,
} from '@passerelle/shared';
import { Roles } from '../auth/auth.decorateurs';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QualificationsService } from './qualifications.service';

@ApiTags('qualifications')
@ApiBearerAuth()
@Controller('qualifications')
export class QualificationsController {
  constructor(private readonly qualifications: QualificationsService) {}

  /**
   * Lecture ouverte a tout compte authentifie : le candidat et le client ont
   * besoin du libelle des qualifications pour lire une mission. Le referentiel
   * ne contient aucune donnee nominative.
   */
  @Get()
  @ApiOperation({ summary: 'Referentiel des qualifications, filtrable par filiere' })
  @ApiQuery({ name: 'filiere', required: false, enum: ['DOMICILE', 'ETABLISSEMENT'] })
  lister(
    @Query(new ZodValidationPipe(qualificationListQuerySchema)) query: QualificationListQuery,
  ): Promise<QualificationResume[]> {
    return this.qualifications.lister(query);
  }

  // Le referentiel est partage par toutes les agences : y ajouter une ligne
  // engage tout le monde, donc administrateur seulement.
  @Post()
  @Roles('ADMIN_AGENCE')
  @ApiOperation({ summary: 'Ajouter une qualification au referentiel' })
  creer(
    @Body(new ZodValidationPipe(qualificationCreateSchema)) donnees: QualificationCreate,
  ): Promise<QualificationResume> {
    return this.qualifications.creer(donnees);
  }
}

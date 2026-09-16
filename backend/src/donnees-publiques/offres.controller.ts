import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  offresQuerySchema,
  type OffrePubliqueDetail,
  type OffrePubliqueResume,
  type OffresQuery,
  type PageResultat,
} from '@releve/shared';
import { Public } from '../auth/auth.decorateurs';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OffresService } from './offres.service';

/**
 * Offres publiques republiees depuis France Travail.
 *
 * Le seul controleur ouvert sans session du cote metier, et c'est voulu : ces
 * offres sont de la donnee publique, un candidat doit pouvoir les lire avant de
 * s'inscrire. C'est meme l'interet de les republier.
 *
 * Deux choses n'en sortent jamais. Les coordonnees du recruteur, exclues de la
 * licence de reutilisation, ne sont pas collectees — elles ne peuvent donc pas
 * fuir ici. Et `intituleNormalise`, valeur derivee pour le barometre, reste
 * interne : republier une annonce sous un titre reecrit la denaturerait.
 *
 * A ne pas confondre avec `/missions`, qui porte les missions de Releve et
 * demande une session. Ce controleur ne recoit aucune candidature : on postule
 * chez la source, par `urlOrigine`.
 */
@ApiTags('offres')
@Controller('offres')
export class OffresController {
  constructor(private readonly offres: OffresService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Lister les offres d'interim republiees" })
  @ApiQuery({ name: 'recherche', required: false })
  @ApiQuery({ name: 'departement', required: false })
  @ApiQuery({ name: 'rome', required: false })
  @ApiQuery({ name: 'tauxMinimum', required: false, type: Number })
  @ApiQuery({ name: 'tri', required: false, enum: ['RECENTES', 'TAUX_DECROISSANT'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  lister(
    @Query(new ZodValidationPipe(offresQuerySchema)) query: OffresQuery,
  ): Promise<PageResultat<OffrePubliqueResume>> {
    return this.offres.lister(query);
  }

  /**
   * L'identifiant est celui de la source ("213YHHM"), pas un UUID : pas de
   * `ParseUUIDPipe` ici, il rejetterait toutes les offres.
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: "Detail d'une offre republiee" })
  detail(@Param('id') id: string): Promise<OffrePubliqueDetail> {
    return this.offres.detail(id);
  }
}

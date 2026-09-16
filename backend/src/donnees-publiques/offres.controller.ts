import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  missionsVitrineQuerySchema,
  suggestionsQuerySchema,
  type MissionsVitrineQuery,
  type MissionVitrine,
  type OptionsVitrine,
  type PageResultat,
  type SuggestionsMarche,
  type SuggestionsQuery,
  type UtilisateurSession,
} from '@releve/shared';
import { ForbiddenException } from '@nestjs/common';
import { Public, Roles, UtilisateurCourant } from '../auth/auth.decorateurs';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VitrineService } from './vitrine.service';

/**
 * Les offres d'emploi telles que le site les presente.
 *
 * Deux routes ouvertes et une fermee, et la frontiere entre elles est la
 * distinction la plus importante de ce controleur.
 *
 * Ce qui est ouvert, ce sont **nos** missions : celles que les etablissements
 * deposent sur Releve, sur lesquelles on postule ici, et dont l'agence recoit
 * les candidatures.
 *
 * Ce qui est ferme, ce sont les offres collectees sur France Travail. Elles ne
 * sont plus republiees au tout-venant : elles servent a suggerer des pistes a
 * un candidat identifie, avec leur source citee et un lien vers l'annonce
 * d'origine. Les melanger aux missions Releve ferait croire a un candidat qu'il
 * postule ici, et denaturerait des annonces qui appartiennent a d'autres
 * employeurs.
 */
@ApiTags('offres')
@Controller('offres')
export class OffresController {
  constructor(private readonly vitrine: VitrineService) {}

  // Declaree avant toute route a parametre : « options » serait sinon lu comme
  // un identifiant.
  @Get('options')
  @Public()
  @ApiOperation({ summary: 'Departements, villes et metiers proposes au filtrage' })
  options(): Promise<OptionsVitrine> {
    return this.vitrine.options();
  }

  /**
   * Suggestions issues du marche, pour le candidat connecte.
   *
   * Reservee au candidat, et pas seulement par prudence : sans son metier et
   * son adresse, la question n'a pas de reponse — il n'y a ni ROME a croiser ni
   * point depuis lequel mesurer une distance.
   */
  @Get('suggestions')
  @Roles('CANDIDAT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Offres du marche proches du profil, par metier et distance' })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  suggestions(
    @Query(new ZodValidationPipe(suggestionsQuerySchema)) query: SuggestionsQuery,
    @UtilisateurCourant() session: UtilisateurSession,
  ): Promise<SuggestionsMarche> {
    if (!session.candidatId) {
      throw new ForbiddenException('Ce compte n est rattache a aucune fiche candidat');
    }

    return this.vitrine.suggestions(session.candidatId, query.limite);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Missions Releve ouvertes, visibles sans session' })
  @ApiQuery({ name: 'departement', required: false })
  @ApiQuery({ name: 'ville', required: false })
  @ApiQuery({ name: 'metier', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  missions(
    @Query(new ZodValidationPipe(missionsVitrineQuerySchema)) query: MissionsVitrineQuery,
  ): Promise<PageResultat<MissionVitrine>> {
    return this.vitrine.missions(query);
  }
}

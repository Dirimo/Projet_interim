import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { FranceTravailClient } from './france-travail.client';
import { ImportPlanifieService } from './import-planifie.service';
import { OffresController } from './offres.controller';
import { OffresService } from './offres.service';
import { TensionController } from './tension.controller';

@Module({
  controllers: [TensionController, OffresController],
  providers: [CacheService, FranceTravailClient, OffresService, ImportPlanifieService],
  exports: [OffresService, CacheService],
})
export class DonneesPubliquesModule {}

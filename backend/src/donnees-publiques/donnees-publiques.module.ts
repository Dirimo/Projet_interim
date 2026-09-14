import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { FranceTravailClient } from './france-travail.client';
import { OffresService } from './offres.service';
import { TensionController } from './tension.controller';

@Module({
  controllers: [TensionController],
  providers: [CacheService, FranceTravailClient, OffresService],
  exports: [OffresService, CacheService],
})
export class DonneesPubliquesModule {}

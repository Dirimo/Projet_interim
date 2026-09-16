import { Module, forwardRef } from '@nestjs/common';
import { GeocodageModule } from '../geocodage/geocodage.module';
import { MatchingModule } from '../matching/matching.module';
import { PropositionsModule } from '../propositions/propositions.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [GeocodageModule, MatchingModule, forwardRef(() => PropositionsModule)],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

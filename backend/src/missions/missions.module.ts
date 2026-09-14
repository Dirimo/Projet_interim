import { Module, forwardRef } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { PropositionsModule } from '../propositions/propositions.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [MatchingModule, forwardRef(() => PropositionsModule)],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

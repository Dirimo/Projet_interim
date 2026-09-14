import { Module, forwardRef } from '@nestjs/common';
import { PropositionsModule } from '../propositions/propositions.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [forwardRef(() => PropositionsModule)],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

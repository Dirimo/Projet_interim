import { Module, forwardRef } from '@nestjs/common';
import { MissionsModule } from '../missions/missions.module';
import { PropositionsController } from './propositions.controller';
import { PropositionsService } from './propositions.service';

@Module({
  imports: [forwardRef(() => MissionsModule)],
  controllers: [PropositionsController],
  providers: [PropositionsService],
  exports: [PropositionsService],
})
export class PropositionsModule {}

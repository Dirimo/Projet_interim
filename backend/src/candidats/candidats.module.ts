import { Module } from '@nestjs/common';
import { CandidatsController } from './candidats.controller';
import { CandidatsService } from './candidats.service';

@Module({
  controllers: [CandidatsController],
  providers: [CandidatsService],
  exports: [CandidatsService],
})
export class CandidatsModule {}

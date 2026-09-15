import { Module } from '@nestjs/common';
import { GeocodageModule } from '../geocodage/geocodage.module';
import { CandidatsController } from './candidats.controller';
import { CandidatsService } from './candidats.service';

@Module({
  imports: [GeocodageModule],
  controllers: [CandidatsController],
  providers: [CandidatsService],
  exports: [CandidatsService],
})
export class CandidatsModule {}

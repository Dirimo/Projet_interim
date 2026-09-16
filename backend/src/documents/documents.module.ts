import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { StockageService } from './stockage.service';

/**
 * Le module n'expose aucun controleur : les pieces se manipulent depuis
 * `/mon-profil` pour l'interesse et depuis `/candidats/:id` pour l'agence,
 * chacun avec ses gardes. Un `/documents` autonome aurait duplique ces regles.
 */
@Module({
  providers: [DocumentsService, StockageService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

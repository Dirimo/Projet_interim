import { Module } from '@nestjs/common';
import { BanClient } from './ban.client';
import { GeocodageService } from './geocodage.service';

/**
 * Le geocodage n'expose aucune route.
 *
 * Il n'y a rien a y demander : c'est une consequence de l'enregistrement d'une
 * adresse, jamais une action en soi. Trois modules l'importent — le vivier,
 * l'inscription publique et les lieux d'intervention — parce que ce sont les
 * trois endroits ou une adresse entre dans la base.
 */
@Module({
  providers: [BanClient, GeocodageService],
  exports: [GeocodageService],
})
export class GeocodageModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CandidatsModule } from './candidats/candidats.module';
import { ClientsModule } from './clients/clients.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { DonneesPubliquesModule } from './donnees-publiques/donnees-publiques.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    CandidatsModule,
    ClientsModule,
    QualificationsModule,
    UtilisateursModule,
    DonneesPubliquesModule,
  ],
})
export class AppModule {}

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
import { MatchingModule } from './matching/matching.module';
import { MissionsModule } from './missions/missions.module';
import { MonProfilModule } from './mon-profil/mon-profil.module';
import { PropositionsModule } from './propositions/propositions.module';

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
    MatchingModule,
    MissionsModule,
    MonProfilModule,
    PropositionsModule,
  ],
})
export class AppModule {}

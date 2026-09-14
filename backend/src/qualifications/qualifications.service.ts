import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  QualificationCreate,
  QualificationListQuery,
  QualificationResume,
} from '@passerelle/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(query: QualificationListQuery): Promise<QualificationResume[]> {
    const where: Prisma.QualificationWhereInput = query.filiere
      ? // Une qualification peut servir aux deux filieres (le DEAES par
        // exemple) : on filtre avec `has` et pas avec une egalite.
        { filieres: { has: query.filiere } }
      : {};

    return this.prisma.qualification.findMany({
      where,
      select: { id: true, code: true, libelle: true, filieres: true },
      orderBy: { code: 'asc' },
    });
  }

  async creer(donnees: QualificationCreate): Promise<QualificationResume> {
    const existante = await this.prisma.qualification.findUnique({
      where: { code: donnees.code },
    });

    if (existante) {
      throw new ConflictException(`La qualification ${donnees.code} existe deja`);
    }

    return this.prisma.qualification.create({
      data: donnees,
      select: { id: true, code: true, libelle: true, filieres: true },
    });
  }
}

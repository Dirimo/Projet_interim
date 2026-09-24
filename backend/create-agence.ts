import { NestFactory } from '@nestjs/core';
// Ou plus simple, utiliser directement PrismaClient si tu as déjà `@prisma/client` installé :
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const agence = await prisma.agence.create({
      data: {
        nom: 'Agence Paris Centre',
        ville: 'Paris',
      },
    });
    console.log('🎉 Agence créée avec succès ! ID :', agence.id);
  } catch (error) {
    console.error('❌ Erreur lors de la création :', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
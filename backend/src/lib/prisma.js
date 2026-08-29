import { PrismaClient } from '@prisma/client';

/**
 * Instance unique de Prisma. En developpement, `node --watch` recharge le module
 * a chaque sauvegarde : on la garde sur globalThis pour ne pas ouvrir une nouvelle
 * pool de connexions a chaque rechargement.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

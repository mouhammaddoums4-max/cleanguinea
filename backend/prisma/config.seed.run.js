import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { semerConfig } from './config.seed.js';

/**
 * Met a jour les seuls referentiels de configuration, sans toucher aux donnees.
 * A lancer apres chaque deploiement qui ajoute un parametre.
 */
const prisma = new PrismaClient();

try {
  const resume = await semerConfig(prisma);
  console.log('Configuration a jour :');
  console.log(`  ${resume.categories} categories de dechets`);
  console.log(`  ${resume.niveaux} niveaux de fidelite`);
  console.log(`  ${resume.conversions} modes de conversion`);
  console.log(`  ${resume.parametres} parametres`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

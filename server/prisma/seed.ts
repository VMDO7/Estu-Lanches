/**
 * Seed base (idempotente): categorias iniciais + conta administradora.
 * Uso: npm run db:seed
 */
import { prisma } from '../src/lib/prisma.js';
import { seedBase } from './seeds/base.js';

console.log('Executando seed base do EstuLanches…');

try {
  await seedBase();
  console.log('Seed base concluído.');
} catch (error) {
  console.error('Falha no seed base:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

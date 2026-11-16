import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.js';
import { env, isDevelopment } from '../config/env.js';
import { logger } from './logger.js';

const adapter = new PrismaPg(
  {
    connectionString: env.DATABASE_URL,
    // O adapter serializa datas em UTC sem offset: a sessão precisa estar em UTC,
    // senão o servidor (ex.: instalado com fuso America/Sao_Paulo) desloca os
    // horários gravados e quebra os cálculos de "hoje" feitos no SQL.
    options: '-c TimeZone=UTC',
    // Pool por instância. Com várias instâncias, use um pooler (PgBouncer).
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
  {
    onPoolError: (error) => logger.error({ err: error }, 'Erro no pool do PostgreSQL'),
  },
);

export const prisma = new PrismaClient({
  adapter,
  log: isDevelopment ? ['warn', 'error'] : ['error'],
});

/** Cliente disponível dentro de `prisma.$transaction(async (tx) => …)`. */
export type DbClient = Prisma.TransactionClient | typeof prisma;

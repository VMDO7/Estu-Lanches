import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { authService } from './modules/auth/auth.service.js';

const SESSION_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

const server = app.listen(env.PORT, (error?: Error) => {
  if (error) {
    logger.fatal({ err: error }, 'Não foi possível iniciar a API');
    process.exit(1);
  }
  logger.info(`API do EstuLanches ouvindo em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Atrás de load balancers, o keep-alive do Node deve superar o do balanceador.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Limpeza periódica de sessões expiradas. Idempotente: seguro com várias
// instâncias. Em escala, mover para um job agendado/fila dedicada.
const purgeTimer = setInterval(() => {
  authService
    .purgeExpiredSessions()
    .then((count) => count > 0 && logger.info({ count }, 'Sessões expiradas removidas'))
    .catch((error: unknown) => logger.error({ err: error }, 'Falha ao limpar sessões expiradas'));
}, SESSION_PURGE_INTERVAL_MS);
purgeTimer.unref();

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Encerrando a API com segurança…');

  clearInterval(purgeTimer);
  server.close(() => {
    prisma
      .$disconnect()
      .catch((error: unknown) => logger.error({ err: error }, 'Erro ao desconectar do banco'))
      .finally(() => process.exit(0));
  });

  setTimeout(() => {
    logger.error('Tempo de encerramento excedido; finalizando à força.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promise rejeitada sem tratamento');
});

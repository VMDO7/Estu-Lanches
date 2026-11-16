import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { LOW_STOCK_THRESHOLD, MAX_ITEM_QUANTITY } from '../../shared/constants.js';

/** Probes para balanceadores/orquestradores (liveness e readiness). */
export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch (error) {
    req.log.error({ err: error }, 'Readiness check falhou');
    res.status(503).json({ status: 'unavailable', database: 'down' });
  }
});

/** Configurações públicas consumidas pela interface. */
export const metaRouter = Router();

metaRouter.get('/', (_req, res) => {
  res.json({
    data: {
      name: 'EstuLanches',
      demoMode: env.DEMO_MODE,
      timezone: env.APP_TIMEZONE,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      maxItemQuantity: MAX_ITEM_QUANTITY,
    },
  });
});

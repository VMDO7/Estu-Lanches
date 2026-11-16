import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { uploadsDirectory } from './lib/storage.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { httpLogger } from './middlewares/http-logger.js';
import { apiRateLimit } from './middlewares/rate-limit.js';
import { healthRouter } from './modules/system/system.routes.js';
import { apiRouter } from './routes.js';
import './shared/validation.js';

/** Respostas da API contêm dados pessoais: nunca devem ser cacheadas. */
const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(httpLogger);
  app.use(
    helmet({
      // A API só devolve JSON e imagens: política restritiva por padrão.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || env.CORS_ORIGINS.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Idempotent-Replayed', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );

  app.use('/health', healthRouter);

  // Imagens de produtos: nomes aleatórios e imutáveis → cache longo (CDN-friendly).
  app.use(
    '/uploads',
    express.static(uploadsDirectory, {
      index: false,
      dotfiles: 'deny',
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
      },
    }),
  );

  app.use('/api/v1', noStore, apiRateLimit, express.json({ limit: '100kb' }), cookieParser(), apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

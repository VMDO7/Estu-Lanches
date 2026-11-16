import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { forbidden } from '../shared/errors.js';

/**
 * Defesa extra contra CSRF nas rotas autenticadas por cookie (refresh/logout):
 * além do SameSite=Strict, rejeita requisições vindas de origens desconhecidas.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && !env.CORS_ORIGINS.includes(origin)) {
    throw forbidden('Origem da requisição não autorizada.');
  }
  next();
};

import type { RequestHandler } from 'express';
import { errors as joseErrors } from 'jose';
import { verifyAccessToken } from '../lib/tokens.js';
import { unauthorized } from '../shared/errors.js';

/**
 * Valida o access token (JWT) do header Authorization.
 * Stateless: nenhuma consulta ao banco — permite escalar horizontalmente.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }

  try {
    const claims = await verifyAccessToken(header.slice('Bearer '.length).trim());
    req.auth = { userId: claims.userId, role: claims.role, studentId: claims.studentId };
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw unauthorized('Sua sessão expirou.', 'TOKEN_EXPIRED');
    }
    throw unauthorized('Credenciais de acesso inválidas.', 'INVALID_TOKEN');
  }

  next();
};

import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { getAuth } from '../../shared/auth-context.js';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './auth.schemas.js';
import { authService, type ClientContext, type IssuedSession } from './auth.service.js';

const REFRESH_COOKIE = 'el_rt';
/** O cookie só trafega nas rotas de autenticação — nunca no restante da API. */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function refreshCookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(expires && { expires }),
  };
}

function clientContext(req: Request): ClientContext {
  return { userAgent: req.get('user-agent'), ipAddress: req.ip };
}

function readRefreshToken(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : undefined;
}

function sendSession(res: Response, session: IssuedSession, status = 200) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions(session.refreshExpiresAt));
  res.status(status).json({
    user: session.user,
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
  });
}

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    sendSession(res, await authService.register(input, clientContext(req)), 201);
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    sendSession(res, await authService.login(input, clientContext(req)));
  },

  async refresh(req: Request, res: Response) {
    const token = readRefreshToken(req);
    if (!token) {
      // Visitante sem sessão não é um erro: 204 evita ruído de 401 a cada visita anônima.
      res.status(204).end();
      return;
    }

    try {
      sendSession(res, await authService.refresh(token, clientContext(req)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      throw error;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    res.json({ user: await authService.me(getAuth(req).userId) });
  },

  async updateProfile(req: Request, res: Response) {
    const input = updateProfileSchema.parse(req.body);
    res.json({ user: await authService.updateProfile(getAuth(req).userId, input) });
  },

  async changePassword(req: Request, res: Response) {
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(getAuth(req).userId, input, readRefreshToken(req));
    res.status(204).end();
  },
};

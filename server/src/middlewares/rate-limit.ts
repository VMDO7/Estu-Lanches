import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';

/**
 * Limites de requisição. O store padrão é em memória (por instância);
 * com múltiplas instâncias, troque por um store compartilhado em Redis
 * (ex.: `rate-limit-redis`) mantendo as mesmas regras.
 *
 * Escolas costumam compartilhar um único IP (NAT), por isso o limite global
 * por IP é generoso e as rotas sensíveis usam chaves mais específicas.
 */
const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: { code: 'RATE_LIMITED', message: String(options.message) },
    });
  },
};

const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? '0.0.0.0');

/** Proteção geral da API contra abuso/flood. */
export const apiRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 60_000,
  limit: 1200,
  message: 'Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.',
});

/** Login: conta apenas falhas, por IP + e-mail (mitiga força bruta sem punir a escola toda). */
export const loginRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60_000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${clientIp(req)}:${email}`;
  },
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

/** Cadastro de contas por IP. */
export const registerRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60_000,
  limit: 30,
  keyGenerator: clientIp,
  message: 'Muitos cadastros a partir desta rede. Tente novamente mais tarde.',
});

/** Renovação de sessão por IP. */
export const refreshRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 60_000,
  limit: 120,
  keyGenerator: clientIp,
  message: 'Muitas renovações de sessão. Aguarde um instante.',
});

/** Troca de senha: conta apenas falhas, por usuário (use após `authenticate`). */
export const passwordChangeRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60_000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.auth?.userId ?? clientIp(req),
  message: 'Muitas tentativas de troca de senha. Aguarde alguns minutos.',
});

/** Criação de pedidos por usuário autenticado (use após `authenticate`). */
export const orderRateLimit = rateLimit({
  ...baseOptions,
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.auth?.userId ?? clientIp(req),
  message: 'Você fez muitos pedidos em sequência. Aguarde um instante.',
});

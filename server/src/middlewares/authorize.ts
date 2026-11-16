import type { RequestHandler } from 'express';
import type { Role } from '../generated/prisma/enums.js';
import { forbidden, unauthorized } from '../shared/errors.js';

/** RBAC: restringe a rota aos papéis informados. Use após `authenticate`. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };

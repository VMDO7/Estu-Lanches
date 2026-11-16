import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums.js';
import { unauthorized } from './errors.js';

export interface AuthContext {
  userId: string;
  role: Role;
  studentId?: string | undefined;
}

/** Retorna o usuário autenticado (garantido pelo middleware `authenticate`). */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthorized();
  return req.auth;
}

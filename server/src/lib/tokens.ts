import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import type { Role } from '../generated/prisma/enums.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = 'estulanches-api';
const AUDIENCE = 'estulanches-web';

export interface AccessTokenClaims {
  userId: string;
  role: Role;
  /** Presente apenas para estudantes — evita uma consulta extra por requisição. */
  studentId?: string | undefined;
}

export async function signAccessToken(claims: AccessTokenClaims) {
  const token = await new SignJWT({
    role: claims.role,
    ...(claims.studentId && { sid: claims.studentId }),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret);

  return { token, expiresIn: env.ACCESS_TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, accessSecret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  });

  if (typeof payload.sub !== 'string' || (payload.role !== 'ADMIN' && payload.role !== 'STUDENT')) {
    throw new Error('Payload de token inválido');
  }

  return {
    userId: payload.sub,
    role: payload.role,
    studentId: typeof payload.sid === 'string' ? payload.sid : undefined,
  };
}

/** Refresh token opaco de 256 bits. Apenas o hash é persistido. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

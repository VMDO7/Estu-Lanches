import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import type { Role } from '../../generated/prisma/enums.js';
import { hashPassword, simulatePasswordCheck, verifyPassword } from '../../lib/password.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/tokens.js';
import { AppError, badRequest, conflict, unauthorized } from '../../shared/errors.js';
import { authRepository, type UserWithStudent } from './auth.repository.js';
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from './auth.schemas.js';

/**
 * Janela em que um refresh token recém-rotacionado ainda é aceito.
 * Cobre abas abertas renovando a sessão ao mesmo tempo sem disparar
 * falsos positivos de roubo de token.
 */
const ROTATION_GRACE_MS = 15_000;
const DAY_MS = 86_400_000;

export interface ClientContext {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  student: { id: string; registration: string; grade: string } | null;
}

export interface IssuedSession {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');

const accountDisabled = () =>
  new AppError(403, 'ACCOUNT_DISABLED', 'Sua conta está desativada. Procure a administração da cantina.');

const sessionExpired = () => unauthorized('Sua sessão expirou. Entre novamente.', 'SESSION_EXPIRED');

function toAuthUser(user: UserWithStudent): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    student: user.student,
  };
}

async function issueSession(
  user: UserWithStudent,
  client: ClientContext,
  familyId: string = randomUUID(),
): Promise<IssuedSession> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);

  await authRepository.createSession({
    userId: user.id,
    familyId,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: client.userAgent?.slice(0, 255),
    ipAddress: client.ipAddress?.slice(0, 45),
  });

  const { token, expiresIn } = await signAccessToken({
    userId: user.id,
    role: user.role,
    studentId: user.student?.id,
  });

  return { user: toAuthUser(user), accessToken: token, expiresIn, refreshToken, refreshExpiresAt };
}

export const authService = {
  /** Autocadastro de estudantes. Administradores são criados apenas via seed. */
  async register(input: RegisterInput, client: ClientContext): Promise<IssuedSession> {
    const [emailTaken, registrationTaken] = await Promise.all([
      authRepository.emailExists(input.email),
      authRepository.registrationExists(input.registration),
    ]);

    if (emailTaken || registrationTaken) {
      const fieldErrors: Record<string, string[]> = {};
      if (emailTaken) fieldErrors.email = ['Este e-mail já está cadastrado.'];
      if (registrationTaken) fieldErrors.registration = ['Esta matrícula já está cadastrada.'];
      throw conflict('Não foi possível concluir o cadastro.', { fieldErrors }, 'ACCOUNT_EXISTS');
    }

    const user = await authRepository.createStudentAccount({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      registration: input.registration,
      grade: input.grade,
    });

    return issueSession(user, client);
  },

  async login(input: LoginInput, client: ClientContext): Promise<IssuedSession> {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      await simulatePasswordCheck(input.password);
      throw invalidCredentials();
    }

    if (!(await verifyPassword(input.password, user.passwordHash))) {
      throw invalidCredentials();
    }

    if (!user.isActive) {
      throw accountDisabled();
    }

    await authRepository.touchLastLogin(user.id);
    return issueSession(user, client);
  },

  /** Rotação de refresh token com detecção de reutilização. */
  async refresh(refreshToken: string, client: ClientContext): Promise<IssuedSession> {
    const session = await authRepository.findSessionByTokenHash(hashToken(refreshToken));

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw sessionExpired();
    }

    if (session.rotatedAt) {
      const elapsed = Date.now() - session.rotatedAt.getTime();
      if (elapsed > ROTATION_GRACE_MS) {
        // Token antigo reapresentado: indício de vazamento → encerra a cadeia inteira.
        await authRepository.revokeFamily(session.familyId);
        throw unauthorized('Sessão encerrada por segurança. Entre novamente.', 'SESSION_REVOKED');
      }
    } else {
      await authRepository.markSessionRotated(session.id);
    }

    if (!session.user.isActive) {
      await authRepository.revokeFamily(session.familyId);
      throw accountDisabled();
    }

    return issueSession(session.user, client, session.familyId);
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await authRepository.findSessionByTokenHash(hashToken(refreshToken));
    if (session) {
      await authRepository.revokeFamily(session.familyId);
    }
  },

  async me(userId: string): Promise<AuthUser> {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.isActive) throw sessionExpired();
    return toAuthUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.isActive) throw sessionExpired();
    if (input.grade !== undefined && !user.student) {
      throw badRequest('Apenas estudantes possuem turma.', undefined, 'GRADE_NOT_ALLOWED');
    }
    return toAuthUser(await authRepository.updateProfile(userId, input));
  },

  /**
   * Troca de senha com confirmação da senha atual. As sessões de outros
   * dispositivos são encerradas; a sessão em uso (cookie atual) é mantida.
   */
  async changePassword(userId: string, input: ChangePasswordInput, currentRefreshToken?: string): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.isActive) throw sessionExpired();

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw badRequest(
        'A senha atual está incorreta.',
        { fieldErrors: { currentPassword: ['Senha atual incorreta.'] } },
        'INVALID_CURRENT_PASSWORD',
      );
    }

    await authRepository.updatePasswordHash(userId, await hashPassword(input.newPassword));

    const current = currentRefreshToken
      ? await authRepository.findSessionByTokenHash(hashToken(currentRefreshToken))
      : null;
    const keepFamilyId = current && current.userId === userId && !current.revokedAt ? current.familyId : undefined;
    await authRepository.revokeOtherSessions(userId, keepFamilyId);
  },

  /** Limpeza de sessões expiradas (idempotente — seguro em várias instâncias). */
  async purgeExpiredSessions(): Promise<number> {
    const { count } = await authRepository.deleteExpiredSessions(new Date());
    return count;
  },
};

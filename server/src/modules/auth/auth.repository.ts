import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

const userWithStudent = {
  student: { select: { id: true, registration: true, grade: true } },
} satisfies Prisma.UserInclude;

export type UserWithStudent = Prisma.UserGetPayload<{ include: typeof userWithStudent }>;

interface NewStudentAccount {
  name: string;
  email: string;
  passwordHash: string;
  registration: string;
  grade: string;
}

interface NewSession {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: userWithStudent });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: userWithStudent });
  },

  async emailExists(email: string) {
    return (await prisma.user.count({ where: { email } })) > 0;
  },

  async registrationExists(registration: string) {
    return (await prisma.student.count({ where: { registration } })) > 0;
  },

  createStudentAccount(account: NewStudentAccount) {
    return prisma.user.create({
      data: {
        name: account.name,
        email: account.email,
        passwordHash: account.passwordHash,
        role: 'STUDENT',
        student: { create: { registration: account.registration, grade: account.grade } },
      },
      include: userWithStudent,
    });
  },

  touchLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });
  },

  createSession(session: NewSession) {
    return prisma.session.create({ data: session, select: { id: true } });
  },

  findSessionByTokenHash(tokenHash: string) {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { include: userWithStudent } },
    });
  },

  markSessionRotated(id: string) {
    return prisma.session.updateMany({
      where: { id, rotatedAt: null },
      data: { rotatedAt: new Date() },
    });
  },

  revokeFamily(familyId: string) {
    return prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllForUser(userId: string) {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash }, select: { id: true } });
  },

  /** Atualiza nome (usuário) e turma (perfil de estudante, se houver) de uma vez. */
  updateProfile(userId: string, data: { name?: string | undefined; grade?: string | undefined }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.grade !== undefined && { student: { update: { grade: data.grade } } }),
      },
      include: userWithStudent,
    });
  },

  /** Revoga todas as sessões do usuário, exceto a cadeia informada (a sessão atual). */
  revokeOtherSessions(userId: string, keepFamilyId?: string) {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(keepFamilyId && { NOT: { familyId: keepFamilyId } }) },
      data: { revokedAt: new Date() },
    });
  },

  deleteExpiredSessions(before: Date) {
    return prisma.session.deleteMany({ where: { expiresAt: { lt: before } } });
  },
};

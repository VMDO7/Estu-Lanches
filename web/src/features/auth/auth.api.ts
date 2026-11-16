import { api } from '@/lib/api-client';
import type { AuthSession, Role } from '@/types/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  registration: string;
  grade: string;
}

export const authApi = {
  login: (input: LoginInput) => api.post<AuthSession>('/auth/login', input, { auth: false }),
  register: (input: RegisterInput) => api.post<AuthSession>('/auth/register', input, { auth: false }),
  logout: () => api.post<void>('/auth/logout', undefined, { auth: false }),
};

export function homePathFor(role: Role) {
  return role === 'ADMIN' ? '/admin' : '/aluno';
}

/** Aceita apenas caminhos internos (evita open redirect via ?redirect=). */
export function safeRedirect(value: string | null, role: Role): string {
  const fallback = homePathFor(role);
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  const area = role === 'ADMIN' ? '/admin' : '/aluno';
  return value.startsWith(area) ? value : fallback;
}

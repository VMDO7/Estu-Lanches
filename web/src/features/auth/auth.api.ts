import { api } from '@/lib/api-client';
import type { AuthSession, AuthUser } from '@/types/api';

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

export interface UpdateProfileInput {
  name?: string;
  grade?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  login: (input: LoginInput) => api.post<AuthSession>('/auth/login', input, { auth: false }),
  register: (input: RegisterInput) => api.post<AuthSession>('/auth/register', input, { auth: false }),
  logout: () => api.post<void>('/auth/logout', undefined, { auth: false }),
  updateProfile: async (input: UpdateProfileInput) => (await api.patch<{ user: AuthUser }>('/auth/me', input)).user,
  changePassword: (input: ChangePasswordInput) => api.patch<void>('/auth/password', input),
};

export { homePathFor, safeRedirect } from './redirect';

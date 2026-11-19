import type { Role } from '@/types/api';

export function homePathFor(role: Role) {
  return role === 'ADMIN' ? '/admin' : '/aluno';
}

/** Aceita apenas caminhos internos da área do papel (evita open redirect via ?redirect=). */
export function safeRedirect(value: string | null, role: Role): string {
  const fallback = homePathFor(role);
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  const area = homePathFor(role);
  return value === area || value.startsWith(`${area}/`) || value.startsWith(`${area}?`) ? value : fallback;
}

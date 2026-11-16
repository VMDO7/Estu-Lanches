import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/ui/Feedback';
import type { Role } from '@/types/api';
import { homePathFor } from './auth.api';
import { useAuth } from './useAuth';

/**
 * Protege áreas por papel. É uma camada de UX — a autorização real
 * acontece na API (RBAC em cada rota).
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

/** Telas de login/cadastro: quem já está autenticado vai direto para sua área. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

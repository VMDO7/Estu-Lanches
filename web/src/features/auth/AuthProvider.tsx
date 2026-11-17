import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onSessionRefresh, refreshSession, setAccessToken } from '@/lib/api-client';
import type { AuthSession, AuthUser } from '@/types/api';
import { authApi, type LoginInput, type RegisterInput } from './auth.api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Atualiza os dados do usuário em memória (ex.: após editar o perfil). */
  updateUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_CHANNEL = 'estulanches-auth';
/** Renova o access token um minuto antes de expirar. */
const REFRESH_MARGIN_SECONDS = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ user: AuthUser | null; status: AuthStatus }>({
    user: null,
    status: 'loading',
  });
  const refreshTimer = useRef<number | undefined>(undefined);
  const channel = useRef<BroadcastChannel | null>(null);

  const applySession = useCallback(
    (session: AuthSession | null) => {
      window.clearTimeout(refreshTimer.current);
      if (session) {
        setAccessToken(session.accessToken);
        setState({ user: session.user, status: 'authenticated' });
        const delay = Math.max(15, session.expiresIn - REFRESH_MARGIN_SECONDS) * 1000;
        refreshTimer.current = window.setTimeout(() => void refreshSession(), delay);
      } else {
        setAccessToken(null);
        setState({ user: null, status: 'unauthenticated' });
        queryClient.clear();
      }
    },
    [queryClient],
  );

  // Toda renovação (automática ou por 401) atualiza o estado global.
  useEffect(() => onSessionRefresh(applySession), [applySession]);

  // Restaura a sessão ao abrir o app (refresh token em cookie httpOnly).
  useEffect(() => {
    let active = true;
    void refreshSession().then((session) => {
      if (active && !session) applySession(null);
    });
    return () => {
      active = false;
    };
  }, [applySession]);

  // Sincroniza login/logout entre abas abertas.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const broadcast = new BroadcastChannel(AUTH_CHANNEL);
    broadcast.onmessage = (event: MessageEvent<string>) => {
      if (event.data === 'logout') applySession(null);
      if (event.data === 'login') void refreshSession();
    };
    channel.current = broadcast;
    return () => {
      broadcast.close();
      channel.current = null;
    };
  }, [applySession]);

  useEffect(() => () => window.clearTimeout(refreshTimer.current), []);

  const startSession = useCallback(
    (session: AuthSession) => {
      queryClient.clear();
      applySession(session);
      channel.current?.postMessage('login');
      return session.user;
    },
    [applySession, queryClient],
  );

  const login = useCallback(async (input: LoginInput) => startSession(await authApi.login(input)), [startSession]);

  const register = useCallback(
    async (input: RegisterInput) => startSession(await authApi.register(input)),
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Mesmo sem resposta da API, a sessão local é encerrada.
    }
    applySession(null);
    channel.current?.postMessage('logout');
  }, [applySession]);

  const updateUser = useCallback((user: AuthUser) => {
    setState((current) => (current.user ? { ...current, user } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, updateUser }),
    [state, login, register, logout, updateUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

import type { AuthSession } from '@/types/api';
import { ApiError } from './api-error';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '');

type QueryValue = string | number | boolean | null | undefined;
type SessionListener = (session: AuthSession | null) => void;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** false para rotas públicas (sem Authorization e sem tentativa de refresh). */
  auth?: boolean;
}

/*
 * O access token vive apenas em memória (nunca em localStorage), reduzindo o
 * impacto de XSS. A sessão persiste via refresh token em cookie httpOnly,
 * renovado de forma transparente quando a API responde 401.
 */
let accessToken: string | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;
const sessionListeners = new Set<SessionListener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onSessionRefresh(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/** Renova a sessão (single-flight: chamadas simultâneas compartilham a mesma requisição). */
export function refreshSession(): Promise<AuthSession | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      // 204 = nenhuma sessão (visitante); 401 = sessão expirada/revogada.
      if (response.status === 204 || !response.ok) {
        accessToken = null;
        sessionListeners.forEach((listener) => listener(null));
        return null;
      }
      const session = (await response.json()) as AuthSession;
      accessToken = session.accessToken;
      sessionListeners.forEach((listener) => listener(session));
      return session;
    } catch {
      // Falha de rede: não derruba a sessão local; a próxima requisição tenta de novo.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, formData, query, signal, auth = true } = options;
  const headers = new Headers(options.headers);

  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (response.status === 401 && auth && !isRetry) {
    const session = await refreshSession();
    if (session) return apiRequest<T>(path, options, true);
  }

  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type BodyOptions = Omit<RequestOptions, 'method' | 'body'>;

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: BodyOptions) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => apiRequest<T>(path, { method: 'POST', formData }),
};

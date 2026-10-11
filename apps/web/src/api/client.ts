/**
 * Cliente HTTP mínimo. Tipos completos: `npm run gen:api` gera src/api/schema.d.ts a partir de specs/03-api.yaml.
 */

const TOKEN_KEY = 'paytrail.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage indisponível: sessão só em memória */
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.code ?? 'HTTP_ERROR', body.message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// Tipos usados pelo esqueleto (espelham specs/03-api.yaml).
export type Role = 'FREELANCER' | 'ACCOUNTANT';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  city?: string;
  bio?: string;
  specialties: string[];
  solanaWallet?: string;
  fxRule: 'CARNE_LEAO' | 'PTAX_DAY';
}

export interface AuthResponse {
  token: string;
  user: User;
}

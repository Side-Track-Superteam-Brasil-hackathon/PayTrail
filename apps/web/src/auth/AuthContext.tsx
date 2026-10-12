import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type AuthResponse, type Role, type User } from '../api/client';

const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@paytrail.app',
  role: 'FREELANCER',
  name: 'Ana Costa',
  city: 'São Paulo',
  bio: 'Independent designer and operations lead.',
  specialties: ['Brand design', 'Operations', 'Accounting'],
  solanaWallet: '3hRkQ2r9cZQeW2y4A7qRz7gNnVv7gmn7Q4U4Q2y1Qj8V',
  fxRule: 'CARNE_LEAO',
};

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: Role }) => Promise<void>;
  logout: () => void;
  /** Recarrega /me (ex.: depois de editar o perfil). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    const demoMode = new URLSearchParams(window.location.search).get('demo');
    if (demoMode === 'dashboard') {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    if (!getToken()) return;
    api<User>('/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (res: AuthResponse) => {
    setToken(res.token);
    setUser(res.user);
  };

  const login = useCallback(async (email: string, password: string) => {
    handleAuth(await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }));
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; role: Role }) => {
    handleAuth(await api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }));
  }, []);

  const refresh = useCallback(async () => {
    setUser(await api<User>('/me'));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

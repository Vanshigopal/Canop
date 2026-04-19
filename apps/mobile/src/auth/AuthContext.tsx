import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/api/client';
import { SecureStorage } from './SecureStorage';

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  tenantSlug: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setTenant: (slug: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const slug = await SecureStorage.getTenantSlug();
        if (slug) setTenantSlug(slug);

        const token = await SecureStorage.getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
      } catch {
        await SecureStorage.clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function setTenant(slug: string): Promise<void> {
    await SecureStorage.setTenantSlug(slug);
    setTenantSlug(slug);
  }

  async function login(email: string, password: string): Promise<void> {
    if (!tenantSlug) throw new Error('Select a tenant first');
    const { data } = await api.post('/auth/login', {
      tenantSlug,
      email,
      password,
    });
    await SecureStorage.setAccessToken(data.data.accessToken);
    await SecureStorage.setRefreshToken(data.data.refreshToken);
    setUser(data.data.user);
  }

  async function requestOtp(phone: string): Promise<void> {
    if (!tenantSlug) throw new Error('Select a tenant first');
    await api.post('/auth/otp/send', { tenantSlug, phone });
  }

  async function loginWithOtp(phone: string, otp: string): Promise<void> {
    if (!tenantSlug) throw new Error('Select a tenant first');
    const { data } = await api.post('/auth/otp/verify', {
      tenantSlug,
      phone,
      otp,
    });
    await SecureStorage.setAccessToken(data.data.accessToken);
    await SecureStorage.setRefreshToken(data.data.refreshToken);
    setUser(data.data.user);
  }

  async function logout(): Promise<void> {
    try {
      const deviceId = await SecureStorage.getDeviceId();
      await api.delete(`/auth/device-token/${deviceId}`);
      await api.delete('/auth/sessions');
    } catch {
      // Best effort — proceed to local cleanup
    }
    await SecureStorage.clearSession();
    setUser(null);
  }

  async function refresh(): Promise<void> {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
    } catch {
      // Silent — interceptor handles 401
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantSlug,
        isLoading,
        isAuthenticated: Boolean(user),
        setTenant,
        login,
        requestOtp,
        loginWithOtp,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

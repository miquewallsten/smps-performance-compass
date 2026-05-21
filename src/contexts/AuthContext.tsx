import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, getToken } from '@/api/client';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  position: string;
  practiceArea?: string;
  customPositionId?: string;
  isAdmin: boolean;
  isSuperUser: boolean;
  isManagingPartner: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  systemInitialized: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, securityQuestion?: string, securityAnswer?: string) => Promise<void>;
  resetPassword: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
  getSecurityQuestion: (email: string) => Promise<string>;
  refreshUser: () => Promise<void>;
  initializeSystem: (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.get<AuthUser>('/api/auth/me');
      setUser(userData);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await api.get<{ initialized: boolean }>('/api/system/initialized');
        setSystemInitialized(result.initialized);
      } catch {
        setSystemInitialized(false);
      }
      if (getToken()) {
        await refreshUser();
      }
      setLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, securityQuestion?: string, securityAnswer?: string) => {
    await api.post('/api/auth/change-password', { currentPassword, newPassword, securityQuestion, securityAnswer });
    await refreshUser();
  }, [refreshUser]);

  const getSecurityQuestion = useCallback(async (email: string) => {
    const result = await api.post<{ securityQuestion: string }>('/api/auth/security-question', { email });
    return result.securityQuestion;
  }, []);

  const resetPassword = useCallback(async (email: string, securityAnswer: string, newPassword: string) => {
    await api.post('/api/auth/reset-password', { email, securityAnswer, newPassword });
  }, []);

  const initializeSystem = useCallback(async (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/system/init', data);
    setToken(result.token);
    setUser(result.user);
    setSystemInitialized(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, systemInitialized,
      login, logout, changePassword, resetPassword, getSecurityQuestion,
      refreshUser, initializeSystem,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

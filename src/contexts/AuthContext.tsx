import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, getToken } from '@/api/client';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  position: string;
  practiceArea?: string;
  customPositionId?: string;
  locationId?: string;
  isAdmin: boolean;
  isSuperUser: boolean;
  isManagingPartner: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface ModuleConfig {
  evaluations: boolean;
  communications: boolean;
  vacations: boolean;
  copilot: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  systemInitialized: boolean | null;
  moduleConfig: ModuleConfig | null;
  isSuperUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  initializeSystem: (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  completePasswordReset: (token: string, newPassword: string, confirmPassword: string) => Promise<string>;
  verifyResetToken: (token: string) => Promise<{ email: string; name: string }>;
  activateAccount: (token: string, password: string, confirmPassword: string) => Promise<string>;
  verifyActivationToken: (token: string) => Promise<{ email: string; name: string }>;
  resendActivation: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const result = await api.get<{ user: AuthUser }>('/api/auth/me');
      setUser(result.user);
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
        try {
          const modCfg = await api.get<ModuleConfig>('/api/system/modules');
          setModuleConfig(modCfg);
        } catch {
          setModuleConfig(null);
        }
      }
      setLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
    setToken(result.token);
    setUser(result.user);
    try {
      const modCfg = await api.get<ModuleConfig>('/api/system/modules');
      setModuleConfig(modCfg);
    } catch {
      setModuleConfig(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post('/api/auth/change-password', { currentPassword, newPassword });
    await refreshUser();
  }, [refreshUser]);


  const initializeSystem = useCallback(async (data: { name: string; email: string; password: string; securityQuestion: string; securityAnswer: string }) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/api/system/init', data);
    setToken(result.token);
    setUser(result.user);
    setSystemInitialized(true);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = await api.post<{ message: string }>('/api/auth/request-password-reset', { email });
    return result.message;
  }, []);

  const completePasswordReset = useCallback(async (token: string, newPassword: string, confirmPassword: string) => {
    const result = await api.post<{ message: string }>('/api/auth/complete-password-reset', { token, newPassword, confirmPassword });
    return result.message;
  }, []);

  const verifyResetToken = useCallback(async (token: string) => {
    const result = await api.get<{ email: string; name: string }>(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    return result;
  }, []);

  const activateAccount = useCallback(async (token: string, password: string, confirmPassword: string) => {
    const result = await api.post<{ message: string }>('/api/auth/activate', { token, password, confirmPassword });
    return result.message;
  }, []);

  const verifyActivationToken = useCallback(async (token: string) => {
    const result = await api.get<{ email: string; name: string }>(`/api/auth/verify-activation?token=${encodeURIComponent(token)}`);
    return result;
  }, []);

  const resendActivation = useCallback(async (email: string) => {
    const result = await api.post<{ message: string }>('/api/auth/resend-activation', { email });
    return result.message;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, systemInitialized, moduleConfig,
      isSuperUser: user?.isSuperUser ?? false,
      login, logout, changePassword,
      refreshUser, initializeSystem,
      requestPasswordReset, completePasswordReset, verifyResetToken,
      activateAccount, verifyActivationToken, resendActivation,
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

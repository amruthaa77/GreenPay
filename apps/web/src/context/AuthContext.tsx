import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface CitizenUser {
  id: string;
  greenpay_id: string;
  name: string;
  masked_meter: string;
  ward_name: string;
  role: string;
  status: string;
  green_score: number;
  is_demo?: boolean;
}

interface AuthContextType {
  user: CitizenUser | null;
  loading: boolean;
  isDemo: boolean;
  login: (meter: string, pwd: string) => Promise<any>;
  demoLogin: (role?: string, demo_id?: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CitizenUser | null>(() => {
    try {
      const saved = localStorage.getItem('greenpay_citizen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem('greenpay_is_demo') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await api.citizen.getProfile();
      setUser(profile);
      if (profile.is_demo !== undefined) {
        setIsDemo(Boolean(profile.is_demo));
        localStorage.setItem('greenpay_is_demo', profile.is_demo ? 'true' : 'false');
      }
      localStorage.setItem('greenpay_citizen_user', JSON.stringify(profile));
    } catch {
      // Not authenticated or error
      setUser(null);
      setIsDemo(false);
      localStorage.removeItem('greenpay_citizen_user');
      localStorage.removeItem('greenpay_is_demo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (meter: string, pwd: string) => {
    const res = await api.auth.login(meter, pwd);
    setIsDemo(Boolean(res?.is_demo));
    localStorage.setItem('greenpay_is_demo', res?.is_demo ? 'true' : 'false');
    if (res.role === 'CITIZEN') {
      await refreshProfile();
    }
    return res;
  };

  const demoLogin = async (role = 'CITIZEN', demo_id?: string) => {
    const res = await api.auth.demoLogin(role, demo_id);
    setIsDemo(true);
    localStorage.setItem('greenpay_is_demo', 'true');
    if (res.role === 'CITIZEN') {
      await refreshProfile();
    }
    return res;
  };

  const register = async (payload: any) => {
    const res = await api.auth.register(payload);
    setIsDemo(false);
    localStorage.setItem('greenpay_is_demo', 'false');
    await refreshProfile();
    return res;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setIsDemo(false);
    localStorage.removeItem('greenpay_citizen_user');
    localStorage.removeItem('greenpay_is_demo');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, login, demoLogin, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

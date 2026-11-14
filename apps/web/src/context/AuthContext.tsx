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
}

interface AuthContextType {
  user: CitizenUser | null;
  loading: boolean;
  login: (meter: string, pwd: string) => Promise<any>;
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
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await api.citizen.getProfile();
      setUser(profile);
      localStorage.setItem('greenpay_citizen_user', JSON.stringify(profile));
    } catch {
      // Not authenticated or error
      setUser(null);
      localStorage.removeItem('greenpay_citizen_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (meter: string, pwd: string) => {
    const res = await api.auth.login(meter, pwd);
    if (res.role === 'CITIZEN') {
      await refreshProfile();
    }
    return res;
  };

  const register = async (payload: any) => {
    const res = await api.auth.register(payload);
    await refreshProfile();
    return res;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    localStorage.removeItem('greenpay_citizen_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

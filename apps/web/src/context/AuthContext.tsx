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
  backendError: string | null;
  login: (meter: string, pwd: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
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
  const [backendError, setBackendError] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      const profile = await api.citizen.getProfile();
      setUser(profile);
      setBackendError(null);
      localStorage.setItem('greenpay_citizen_user', JSON.stringify(profile));
    } catch (err: any) {
      setUser(null);
      localStorage.removeItem('greenpay_citizen_user');
      const msg = err?.message || '';
      if (
        msg.includes('timed out') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Network request failed') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504')
      ) {
        setBackendError('The GreenPay API server could not be reached. It may be starting up or temporarily offline.');
      } else {
        setBackendError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const retryAuth = async () => {
    setLoading(true);
    setBackendError(null);
    await refreshProfile();
  };

  useEffect(() => {
    let mounted = true;
    // Guaranteed safety resolution: loading state NEVER hangs for > 3.5 seconds
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 3500);

    refreshProfile().finally(() => {
      if (mounted) {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (meter: string, pwd: string) => {
    const res = await api.auth.login(meter, pwd);
    setBackendError(null);
    if (res.role === 'CITIZEN') {
      await refreshProfile();
    }
    return res;
  };

  const register = async (payload: any) => {
    const res = await api.auth.register(payload);
    setBackendError(null);
    await refreshProfile();
    return res;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setBackendError(null);
    localStorage.removeItem('greenpay_citizen_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, backendError, login, register, logout, refreshProfile, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

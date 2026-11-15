import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';

export interface AdminUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SUPERVISOR';
  greenpay_id: string;
  status: string;
  profile?: {
    name: string;
    ward_id?: string;
    ward_name?: string;
  };
}

export interface LoginResult {
  requires_2fa: boolean;
  temp_token?: string;
  user?: AdminUser;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  challenge2FA: (temp_token: string, totp_code?: string, recovery_code?: string) => Promise<AdminUser>;
  acceptInvite: (payload: { invite_token: string; name: string; password: string; phone_number?: string }) => Promise<AdminUser>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isSupervisor: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('greenpay_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.auth.getMe()
      .then((data) => {
        if (data && (data.role === 'SUPER_ADMIN' || data.role === 'SUPERVISOR')) {
          setUser(data);
          localStorage.setItem('greenpay_admin_user', JSON.stringify(data));
        } else {
          setUser(null);
          localStorage.removeItem('greenpay_admin_user');
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('greenpay_admin_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    const res = await adminApi.auth.login(email, pass);
    if (res.requires_2fa) {
      return {
        requires_2fa: true,
        temp_token: res.temp_token,
      };
    }

    const authedUser: AdminUser = {
      id: res.greenpay_id || 'admin',
      email: email,
      role: res.role as 'SUPER_ADMIN' | 'SUPERVISOR',
      greenpay_id: res.greenpay_id || '',
      status: res.user_status,
      profile: {
        name: res.name,
        ward_name: res.ward_name,
      },
    };
    setUser(authedUser);
    localStorage.setItem('greenpay_admin_user', JSON.stringify(authedUser));
    return {
      requires_2fa: false,
      user: authedUser,
    };
  };

  const challenge2FA = async (temp_token: string, totp_code?: string, recovery_code?: string): Promise<AdminUser> => {
    const res = await adminApi.auth.challenge2FA(temp_token, totp_code, recovery_code);
    const authedUser: AdminUser = {
      id: res.greenpay_id || 'admin',
      email: res.name || 'admin@greenpay.blr',
      role: res.role as 'SUPER_ADMIN' | 'SUPERVISOR',
      greenpay_id: res.greenpay_id || '',
      status: res.user_status,
      profile: {
        name: res.name,
        ward_name: res.ward_name,
      },
    };
    setUser(authedUser);
    localStorage.setItem('greenpay_admin_user', JSON.stringify(authedUser));
    return authedUser;
  };

  const acceptInvite = async (payload: { invite_token: string; name: string; password: string; phone_number?: string }) => {
    const res = await adminApi.auth.acceptInvite(payload);
    const authedUser: AdminUser = {
      id: res.greenpay_id || 'supervisor',
      email: payload.name,
      role: res.role as 'SUPER_ADMIN' | 'SUPERVISOR',
      greenpay_id: res.greenpay_id || '',
      status: res.user_status,
      profile: {
        name: res.name,
        ward_name: res.ward_name,
      },
    };
    setUser(authedUser);
    localStorage.setItem('greenpay_admin_user', JSON.stringify(authedUser));
    return authedUser;
  };

  const logout = async () => {
    try {
      await adminApi.auth.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      localStorage.removeItem('greenpay_admin_user');
      // Amendment #8: Security wipe on supervisor logout
      offlineQueue.clearAllOnLogout();
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        login,
        challenge2FA,
        acceptInvite,
        logout,
        isSuperAdmin,
        isSupervisor,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};

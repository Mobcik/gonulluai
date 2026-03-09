import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user:     User | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, city?: string) => Promise<void>;
  logout:   () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, full_name: string, city?: string) => {
    const { data } = await authApi.register({ email, password, full_name, city });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('mock_current_user');
    localStorage.removeItem('mock_joined_events');
    setUser(null);
  };

  const updateUser = (updated: User) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

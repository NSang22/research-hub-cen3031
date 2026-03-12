import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, role: 'student' | 'pi', firstName: string, lastName: string) => Promise<User>;
  loginDemo: (role: 'student' | 'pi') => Promise<User>;
  loginWithGoogle: (credential: string, role?: 'student' | 'pi') => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login({ email, password });
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const register = async (
    email: string,
    password: string,
    role: 'student' | 'pi',
    firstName: string,
    lastName: string
  ) => {
    const { token, user: u } = await api.auth.register({
      email,
      password,
      role,
      firstName,
      lastName,
    });
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const loginWithGoogle = async (credential: string, role?: 'student' | 'pi') => {
    const { token, user: u } = await api.auth.google({ credential, role });
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const loginDemo = async (role: 'student' | 'pi') => {
    const { token, user: u } = await api.auth.demo(role);
    setAuthToken(token);
    setUser(u);
    return u;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginDemo, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

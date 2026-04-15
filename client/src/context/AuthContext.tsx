import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';
import type { User } from '../types';

const TOKEN_KEY = 'rh_token';

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

function persistToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  setAuthToken(token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  setAuthToken(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore token from localStorage and fetch the current user.
  // If the token is missing or expired the API call fails silently and we
  // stay logged-out, which is the correct behaviour.
  const loadUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    setAuthToken(stored);
    try {
      const u = await api.auth.me();
      setUser(u);
    } catch {
      // Token invalid or expired — clear it so the user starts fresh
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login({ email, password });
    persistToken(token);
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
    persistToken(token);
    setUser(u);
    return u;
  };

  const loginWithGoogle = async (credential: string, role?: 'student' | 'pi') => {
    const { token, user: u } = await api.auth.google({ credential, role });
    persistToken(token);
    setUser(u);
    return u;
  };

  const loginDemo = async (role: 'student' | 'pi') => {
    const { token, user: u } = await api.auth.demo(role);
    persistToken(token);
    setUser(u);
    return u;
  };

  const logout = () => {
    clearToken();
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

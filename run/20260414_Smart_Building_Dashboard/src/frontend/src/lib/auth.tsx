'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { api, setAccessToken, getAccessToken } from './api';
import { connectSocket, disconnectSocket } from './socket';

export type UserRole =
  | 'financial_decision_maker'
  | 'sys_admin'
  | 'technician'
  | 'building_manager'
  | 'security_officer'
  | 'tenant'
  | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  buildingId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  tenantCompany?: string | null;
  floorId?: string | null;
  roomNumber?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  mfaEnabled?: boolean;
  biometricEnrolled?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ data: User }>('/auth/me');
      const user = res.data;
      setState({ user, isLoading: false, isAuthenticated: true });
      if (getAccessToken() && user.buildingId) {
        connectSocket(getAccessToken()!, user.buildingId);
      }
    } catch {
      setAccessToken(null);
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ data: { user: User; accessToken: string } }>('/auth/login', { email, password });
    const { user, accessToken } = res.data;
    setAccessToken(accessToken);
    setState({ user, isLoading: false, isAuthenticated: true });
    if (user.buildingId) {
      connectSocket(accessToken, user.buildingId);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    setAccessToken(null);
    disconnectSocket();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

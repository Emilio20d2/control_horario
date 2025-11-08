'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  user: null;
  appUser: AppUser | null;
  loading: boolean;
  authConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  reauthenticateWithPassword: (password: string) => Promise<boolean>;
  signInWithEmailLink: (email: string, link: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  appUser: null,
  loading: false,
  authConfigured: false,
  async signIn() {
    return {
      success: false,
      error: 'No hay un proveedor de autenticación configurado. Revisa la documentación para integrar tu solución.',
    };
  },
  async signOut() {
    console.warn('[auth] signOut invocado sin un proveedor de autenticación configurado.');
  },
  async reauthenticateWithPassword() {
    console.warn('[auth] reauthenticateWithPassword requiere un proveedor real.');
    return false;
  },
  async signInWithEmailLink() {
    throw new Error('Configura un proveedor de autenticación para usar enlaces mágicos.');
  },
  async sendPasswordResetEmail() {
    throw new Error('Configura un proveedor de autenticación para enviar restablecimientos de contraseña.');
  },
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthContext.Provider value={defaultAuthContext}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

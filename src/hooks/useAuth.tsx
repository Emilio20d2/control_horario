'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { loadLocalDatabase } from '@/lib/local-data';

interface AuthContextType {
  user: AppUser | null;
  appUser: AppUser | null;
  loading: boolean;
  authConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  reauthenticateWithPassword: (password: string) => Promise<boolean>;
  signInWithEmailLink: (email: string, link: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  viewMode: 'admin' | 'employee';
  setViewMode: (mode: 'admin' | 'employee') => void;
  isEmployeeViewEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  authConfigured: false,
  async signIn() {
    return { success: false, error: 'Proveedor de autenticación no configurado.' };
  },
  async logout() {
    console.warn('[auth] logout() invocado sin proveedor configurado.');
  },
  async reauthenticateWithPassword() {
    console.warn('[auth] reauthenticateWithPassword() invocado sin proveedor configurado.');
    return false;
  },
  async signInWithEmailLink() {
    console.warn('[auth] signInWithEmailLink() invocado sin proveedor configurado.');
  },
  async sendPasswordResetEmail() {
    console.warn('[auth] sendPasswordResetEmail() invocado sin proveedor configurado.');
  },
  viewMode: 'employee',
  setViewMode() {
    console.warn('[auth] setViewMode() invocado sin proveedor configurado.');
  },
  isEmployeeViewEnabled: true,
});

const STORAGE_KEY = 'control-horario:auth';

const getDefaultCredentials = () => ({
  email: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL ?? 'admin@example.com',
  password: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD ?? 'admin1234',
});

const persistAuthUser = (user: AppUser | null) => {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

const loadPersistedAuthUser = (): AppUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch (error) {
    console.warn('[auth] No se pudo cargar el usuario almacenado, se iniciará sesión de nuevo.', error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authConfigured] = useState(true);
  const [viewMode, setViewModeState] = useState<'admin' | 'employee'>('employee');
  const router = useRouter();
  const pathname = usePathname();

  const [isEmployeeViewEnabled, setIsEmployeeViewEnabled] = useState(true);

  useEffect(() => {
    const persisted = loadPersistedAuthUser();
    if (persisted) {
      setUser(persisted);
      setAppUser(persisted);
      setViewModeState(persisted.role ?? 'employee');
    }
    const db = loadLocalDatabase();
    setIsEmployeeViewEnabled(db.appConfig.isEmployeeViewEnabled ?? true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!appUser) return;

    const employeePages = ['/my-profile', '/my-schedule', '/my-messages', '/help'];
    const adminPages = [
      '/home',
      '/dashboard',
      '/schedule',
      '/employees',
      '/listings',
      '/vacations',
      '/calendar',
      '/messages',
      '/settings',
      '/guide',
    ];

    if (appUser.role === 'employee') {
      const attemptingAdminPage = adminPages.some((page) => pathname.startsWith(page));
      if (!isEmployeeViewEnabled) {
        if (pathname !== '/unavailable') {
          router.replace('/unavailable');
        }
      } else if (attemptingAdminPage) {
        router.replace('/my-profile');
      }
    } else if (appUser.role === 'admin') {
      const attemptingEmployeePage = employeePages.some((page) => pathname.startsWith(page));
      if (viewMode === 'admin' && attemptingEmployeePage) {
        router.replace('/home');
      } else if (viewMode === 'employee') {
        const attemptingAdminPage = adminPages.some((page) => pathname.startsWith(page));
        if (attemptingAdminPage) {
          router.replace('/my-profile');
        }
      }
    }
  }, [appUser, pathname, router, isEmployeeViewEnabled, viewMode]);

  const setViewMode = useCallback(
    (mode: 'admin' | 'employee') => {
      setViewModeState((current) => {
        if (mode === current) return current;
        if (appUser?.trueRole !== 'admin' && mode === 'admin') {
          return 'employee';
        }
        return mode;
      });
    },
    [appUser?.trueRole],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const credentials = getDefaultCredentials();
    if (email.trim().toLowerCase() !== credentials.email.toLowerCase() || password !== credentials.password) {
      return { success: false, error: 'Credenciales no válidas. Comprueba el correo y la contraseña configurados.' };
    }

    const db = loadLocalDatabase();
    const matchedUser = db.users.find((item) => item.email?.toLowerCase() === credentials.email.toLowerCase());

    const finalUser: AppUser =
      matchedUser ?? {
        id: 'local-admin',
        email: credentials.email,
        employeeId: null,
        role: 'admin',
        trueRole: 'admin',
      };

    setUser(finalUser);
    setAppUser(finalUser);
    setViewModeState(finalUser.role ?? 'admin');
    persistAuthUser(finalUser);

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAppUser(null);
    setViewModeState('employee');
    persistAuthUser(null);
  }, []);

  const reauthenticateWithPassword = useCallback(async (password: string) => {
    const credentials = getDefaultCredentials();
    return password === credentials.password;
  }, []);

  const signInWithEmailLink = useCallback(async () => {
    console.warn('[auth] Inicio de sesión por enlace mágico no está disponible en el modo local.');
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    console.info(`[auth] Solicitud de restablecimiento de contraseña para ${email}. En modo local debes cambiarla manualmente.`);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      appUser,
      loading,
      authConfigured,
      signIn,
      logout,
      reauthenticateWithPassword,
      signInWithEmailLink,
      sendPasswordResetEmail,
      viewMode,
      setViewMode,
      isEmployeeViewEnabled,
    }),
    [
      user,
      appUser,
      loading,
      authConfigured,
      signIn,
      logout,
      reauthenticateWithPassword,
      signInWithEmailLink,
      sendPasswordResetEmail,
      viewMode,
      setViewMode,
      isEmployeeViewEnabled,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

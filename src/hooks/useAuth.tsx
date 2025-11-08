'use client';

import { createContext, useContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  EmailAuthProvider,
  User,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { AppUser, Employee } from '@/lib/types';

interface AuthContextType {
  user: User | null;
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

const defaultAuthContext: AuthContextType = {
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
  setViewMode: () => {
    console.warn('[auth] setViewMode() invocado sin proveedor configurado.');
  },
  isEmployeeViewEnabled: true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

const UNIVERSAL_ADMIN_EMAIL = 'emiliogp@inditex.com';

type EmployeeWithRole = Employee & { role?: 'admin' | 'employee' };

type EmployeeLookupResult = {
  employeeId: string | null;
  employeeRole: 'admin' | 'employee' | null;
  employeeData: EmployeeWithRole | null;
};

const normalizeRole = (role?: string | null): 'admin' | 'employee' | null => {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'empleado' || normalized === 'employee') return 'employee';
  return null;
};

const buildEmployeeFromSnapshot = (snapshot: DocumentSnapshot<DocumentData>): EmployeeWithRole => {
  const data = snapshot.data() as Omit<EmployeeWithRole, 'id'>;
  return {
    id: snapshot.id,
    ...data,
  };
};

const fetchEmployeeInfo = async (
  employeeId: string | null,
  email: string | null,
): Promise<EmployeeLookupResult> => {
  if (employeeId) {
    const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
    if (employeeDoc.exists()) {
      const employeeData = buildEmployeeFromSnapshot(employeeDoc);
      return {
        employeeId: employeeDoc.id,
        employeeRole: normalizeRole(employeeData.role),
        employeeData,
      };
    }
  }

  if (email) {
    const employeesRef = collection(db, 'employees');
    const emailCandidates = new Set<string>([email, email.toLowerCase()]);

    for (const candidate of emailCandidates) {
      const employeeQuery = query(employeesRef, where('email', '==', candidate));
      const snapshot = await getDocs(employeeQuery);

      if (!snapshot.empty) {
        const employeeDoc = snapshot.docs[0];
        const employeeData = buildEmployeeFromSnapshot(employeeDoc);
        return {
          employeeId: employeeDoc.id,
          employeeRole: normalizeRole(employeeData.role),
          employeeData,
        };
      }
    }
  }

  return { employeeId: null, employeeRole: null, employeeData: null };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authConfigured] = useState(true);
  const [viewMode, setViewModeState] = useState<'admin' | 'employee'>('employee');
  const [isEmployeeViewEnabled, setIsEmployeeViewEnabled] = useState<boolean>(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const configRef = doc(db, 'app_config', 'features');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const configData = docSnap.data() as { isEmployeeViewEnabled?: boolean };
        setIsEmployeeViewEnabled(configData.isEmployeeViewEnabled ?? false);
      } else {
        setIsEmployeeViewEnabled(false);
      }
    });

    return () => unsubscribeConfig();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (!currentUser) {
        setUser(null);
        setAppUser(null);
        setViewModeState('employee');
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const storedData = userDoc.exists() ? (userDoc.data() as Omit<AppUser, 'id'>) : null;

        const normalizedEmail = (currentUser.email ?? storedData?.email ?? '').trim().toLowerCase();
        const employeeInfo = await fetchEmployeeInfo(storedData?.employeeId ?? null, normalizedEmail || null);

        let finalRole: 'admin' | 'employee' = 'employee';

        if (normalizedEmail === UNIVERSAL_ADMIN_EMAIL) {
          finalRole = 'admin';
        } else if (employeeInfo.employeeRole) {
          finalRole = employeeInfo.employeeRole;
        } else if (normalizeRole(storedData?.role) === 'admin') {
          finalRole = 'admin';
        }

        const resolvedEmployeeId = employeeInfo.employeeId ?? storedData?.employeeId ?? null;

        const nextAppUser: AppUser = {
          id: currentUser.uid,
          email: normalizedEmail,
          employeeId: resolvedEmployeeId,
          role: finalRole,
          trueRole: finalRole,
        };

        setAppUser(nextAppUser);
        setViewModeState(finalRole);

        const updates: Partial<AppUser> & Record<string, any> = {};
        if (normalizedEmail && (!storedData?.email || storedData.email.toLowerCase() !== normalizedEmail)) {
          updates.email = normalizedEmail;
        }
        if (storedData?.role !== finalRole) {
          updates.role = finalRole;
        }
        if (resolvedEmployeeId && storedData?.employeeId !== resolvedEmployeeId) {
          updates.employeeId = resolvedEmployeeId;
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(userDocRef, updates, { merge: true });
        }

        if (employeeInfo.employeeData) {
          const employeeDocRef = doc(db, 'employees', employeeInfo.employeeData.id);
          const employeeUpdates: Record<string, any> = {};

          if (employeeInfo.employeeData.authId !== currentUser.uid) {
            employeeUpdates.authId = currentUser.uid;
          }

          if (Object.keys(employeeUpdates).length > 0) {
            await setDoc(employeeDocRef, employeeUpdates, { merge: true });
          }
        }
      } catch (error) {
        console.error('[auth] Error resolving authenticated user:', error);
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (loading || !appUser) {
      return;
    }

    if (appUser.trueRole === 'admin' && appUser.role !== viewMode) {
      setAppUser((prev) => (prev ? { ...prev, role: viewMode } : prev));
    }

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
  }, [appUser, viewMode, loading, pathname, router, isEmployeeViewEnabled]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const setViewMode = useCallback(
    (mode: 'admin' | 'employee') => {
      setViewModeState((current) => {
        if (mode === current) {
          return current;
        }

        if (appUser?.trueRole !== 'admin' && mode === 'admin') {
          return 'employee';
        }

        return mode;
      });
    },
    [appUser?.trueRole],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error('[auth] Error during signIn:', error);
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const reauthenticateWithPassword = useCallback(async (password: string) => {
    if (!user?.email) {
      return false;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      if (!auth.currentUser) {
        return false;
      }
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error) {
      console.error('[auth] Error during reauthentication:', error);
      return false;
    }
  }, [user?.email]);

  const signInWithEmailLink = useCallback(async (email: string, link: string) => {
    await firebaseSignInWithEmailLink(auth, email, link);
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
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
  }), [
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
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

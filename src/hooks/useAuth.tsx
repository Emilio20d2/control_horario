
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { AppUser, Employee } from '@/lib/types';


interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reauthenticateWithPassword: (password: string) => Promise<boolean>;
  viewMode: 'admin' | 'employee';
  setViewMode: (mode: 'admin' | 'employee') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  reauthenticateWithPassword: async () => false,
  viewMode: 'admin',
  setViewMode: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'employee'>('admin');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
              const dbData = userDoc.data() as Omit<AppUser, 'id'>;
              // Set the definitive role and view mode from the database
              setAppUser({ id: user.uid, ...dbData, trueRole: dbData.role });
              setViewMode(dbData.role);
          } else {
              // This is a fallback for users that exist in Auth but not in 'users' collection yet.
              // This can happen during initial signup. Let's try to find them by email in employees.
              if(user.email) {
                const q = query(collection(db, 'employees'), where('email', '==', user.email));
                const empSnapshot = await getDocs(q);
                if (!empSnapshot.empty) {
                    const empDoc = empSnapshot.docs[0];
                    const defaultRole = 'employee';
                    const newUserDocData = { email: user.email, employeeId: empDoc.id, role: defaultRole };
                    await setDoc(userDocRef, newUserDocData); // Create the user doc
                    setAppUser({ id: user.uid, ...newUserDocData, trueRole: defaultRole });
                    setViewMode(defaultRole);
                } else {
                    // This handles the case of an admin-only user who might not have an employee record.
                    // We'll create a minimal user profile for them if they don't exist.
                    // The role should be assigned manually in Firestore for such users.
                    const minimalUserData = { email: user.email, employeeId: null, role: 'employee' }; // Default to employee
                    await setDoc(userDocRef, minimalUserData);
                    setAppUser({ id: user.uid, ...minimalUserData, trueRole: 'employee' });
                    setViewMode('employee');
                }
              }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAppUser(null);
        }
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to handle view mode changes for admins
  useEffect(() => {
    if (appUser && appUser.trueRole === 'admin' && appUser.role !== viewMode) {
      setAppUser(prev => prev ? { ...prev, role: viewMode } : null);
    }
  }, [viewMode, appUser]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    // The redirect is now handled by the useEffect in this same hook watching the `user` state.
    // Explicitly pushing here can cause race conditions.
  };
  
  const reauthenticateWithPassword = async (password: string): Promise<boolean> => {
    if (!user || !user.email) return false;
    try {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return true;
    } catch (error) {
        console.error("Reauthentication failed:", error);
        return false;
    }
  };

  // Redirect on logout
  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
  }, [user, loading, router]);


  const value = { user, appUser, loading, login, logout, reauthenticateWithPassword, viewMode, setViewMode };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

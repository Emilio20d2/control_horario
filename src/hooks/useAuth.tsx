
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
  employeeRecord: Employee | null;
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
  employeeRecord: null,
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
  const [employeeRecord, setEmployeeRecord] = useState<Employee | null>(null);
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

          let foundEmployee: Employee | null = null;

          if (userDoc.exists()) {
              const dbData = userDoc.data() as Omit<AppUser, 'id'>;
              setAppUser({ id: user.uid, ...dbData, trueRole: dbData.role });
              setViewMode(dbData.role); // Set view mode based on the true role from DB

              if (dbData.employeeId) {
                  const empDoc = await getDoc(doc(db, 'employees', dbData.employeeId));
                  if (empDoc.exists()) {
                      foundEmployee = { id: empDoc.id, ...empDoc.data() } as Employee;
                  }
              }
          } else {
              // Fallback for users that exist in Auth but not in 'users' collection
              // This can happen during initial signup. Let's find them by email.
              if(user.email) {
                const q = query(collection(db, 'employees'), where('email', '==', user.email));
                const empSnapshot = await getDocs(q);
                if (!empSnapshot.empty) {
                    const empDoc = empSnapshot.docs[0];
                    foundEmployee = { id: empDoc.id, ...empDoc.data() } as Employee;
                    const defaultRole = 'employee';
                    const newUserDocData = { email: user.email, employeeId: empDoc.id, role: defaultRole };
                    await setDoc(userDocRef, newUserDocData); // Create the user doc
                    setAppUser({ id: user.uid, ...newUserDocData, trueRole: defaultRole });
                    setViewMode(defaultRole);
                }
              }
          }
          setEmployeeRecord(foundEmployee);

        } catch (error) {
          console.error("Error fetching user data:", error);
          setAppUser(null);
          setEmployeeRecord(null);
        }
      } else {
        setUser(null);
        setAppUser(null);
        setEmployeeRecord(null);
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


  const value = { user, appUser, loading, login, logout, reauthenticateWithPassword, viewMode, setViewMode, employeeRecord };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

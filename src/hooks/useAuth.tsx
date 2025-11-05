
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import type { AppUser, Employee } from '@/lib/types';
import { useIsMobile } from './use-is-mobile';
import { useToast } from './use-toast';


interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reauthenticateWithPassword: (password: string) => Promise<boolean>;
  viewMode: 'admin' | 'employee';
  setViewMode: (mode: 'admin' | 'employee') => void;
  isEmployeeViewEnabled: boolean;
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
  isEmployeeViewEnabled: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'employee'>('admin');
  const [isEmployeeViewEnabled, setIsEmployeeViewEnabled] = useState<boolean>(true); // Default to true to avoid initial lockout
  const router = useRouter();
  const { toast } = useToast();
  
  // Effect to listen for app configuration changes (e.g., employee view toggle)
  useEffect(() => {
    const configRef = doc(db, 'app_config', 'features');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
            setIsEmployeeViewEnabled(docSnap.data().isEmployeeViewEnabled ?? false);
        } else {
            // Default to disabled if the document doesn't exist, for security
            setIsEmployeeViewEnabled(false);
        }
    });

    return () => unsubscribeConfig();
  }, []);

  // Effect to handle user authentication state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
              const dbData = userDoc.data() as Omit<AppUser, 'id'>;
              
              let finalRole: 'admin' | 'employee' = 'employee';
              if (dbData.email === 'mariaavg@inditex.com' || dbData.role === 'admin') {
                  finalRole = 'admin';
              }

              setAppUser({ id: user.uid, ...dbData, trueRole: finalRole, role: finalRole });
              setViewMode(finalRole);
          } else {
              // This is a fallback for users that might exist in Auth but not in Firestore 'users' collection
              if(user.email) {
                const q = query(collection(db, 'employees'), where('email', '==', user.email));
                const empSnapshot = await getDocs(q);
                
                const isSpecialAdmin = user.email === 'mariaavg@inditex.com';
                const defaultRole = isSpecialAdmin ? 'admin' : 'employee';
                
                const employeeId = !empSnapshot.empty ? empSnapshot.docs[0].id : null;
                
                const newUserDocData = { email: user.email, employeeId, role: defaultRole };
                await setDoc(userDocRef, newUserDocData, { merge: true });
                
                setAppUser({ id: user.uid, ...newUserDocData, trueRole: defaultRole });
                setViewMode(defaultRole);
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

    return () => unsubscribeAuth();
  }, []);

  // Effect to handle view mode changes for admins
  useEffect(() => {
    if (appUser && appUser.trueRole === 'admin' && appUser.role !== viewMode) {
      setAppUser(prev => prev ? { ...prev, role: viewMode } : null);
    }
  }, [viewMode, appUser]);

  // Effect to redirect users based on their role and employee view status
  useEffect(() => {
    if (loading || !user || !appUser) return;

    if (appUser.role === 'employee' && !isEmployeeViewEnabled) {
        router.replace('/unavailable');
    }
  }, [loading, user, appUser, isEmployeeViewEnabled, router]);


  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
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


  const value = { user, appUser, loading, login, logout, reauthenticateWithPassword, viewMode, setViewMode, isEmployeeViewEnabled };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

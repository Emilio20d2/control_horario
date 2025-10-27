
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
          // Primero, buscamos en la colección 'users' para obtener el rol.
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          let userData: Omit<AppUser, 'id'>;
          let foundEmployee: Employee | null = null;
          
          if (userDoc.exists()) {
             userData = userDoc.data() as Omit<AppUser, 'id'>;
             // Si tenemos employeeId, lo usamos para buscar al empleado.
             if (userData.employeeId) {
                const empDoc = await getDoc(doc(db, 'employees', userData.employeeId));
                if (empDoc.exists()) {
                    foundEmployee = { id: empDoc.id, ...empDoc.data() } as Employee;
                }
             }
          } else {
             // Si no hay documento en 'users', lo creamos a partir de la info de 'employees'.
             const q = query(collection(db, 'employees'), where('email', '==', user.email));
             const empSnapshot = await getDocs(q);
             if (!empSnapshot.empty) {
                 const empDoc = empSnapshot.docs[0];
                 foundEmployee = { id: empDoc.id, ...empDoc.data() } as Employee;
                 userData = { email: user.email!, employeeId: empDoc.id, role: 'employee' }; // Asumimos rol de empleado
                 await setDoc(userDocRef, userData); // Creamos el documento en 'users'
             }
          }
          
          // Si después de todo no encontramos al empleado, buscamos por email.
          if (!foundEmployee && user.email) {
            const q = query(collection(db, 'employees'), where('email', '==', user.email));
            const empSnapshot = await getDocs(q);
            if (!empSnapshot.empty) {
                foundEmployee = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() } as Employee;
            }
          }
          
          setEmployeeRecord(foundEmployee);

          if (userDoc.exists()) {
            const dbData = userDoc.data() as Omit<AppUser, 'id'>;
            const trueRole = dbData.role;
            const initialViewMode = trueRole === 'admin' ? 'admin' : 'employee';
            setViewMode(initialViewMode);
            setAppUser({ id: user.uid, ...dbData, trueRole, role: initialViewMode });
          } else {
            setViewMode('employee'); // Default for new users or users without a doc
            setAppUser({ id: user.uid, email: user.email!, employeeId: foundEmployee?.id || '', role: 'employee', trueRole: 'employee' });
          }

        } catch (error) {
          console.error("Error fetching user data:", error);
          setAppUser(null);
          setEmployeeRecord(null);
          setViewMode('employee');
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

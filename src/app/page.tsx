
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, appUser, loading: authLoading } = useAuth();

  useEffect(() => {
    // This effect only runs AFTER all loading is complete (handled by AppProviders)
    if (authLoading) {
      return; // Wait until auth/appUser loading is fully finished
    }

    // If, after loading, there's no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // If we have an appUser, redirect based on their role
    if (appUser) {
      if (appUser.role === 'admin') {
        router.replace('/dashboard');
      } else { // 'employee'
        router.replace('/my-profile');
      }
    } else {
       // This case can happen if the user doc doesn't exist. Fallback to login.
       console.error("User authenticated but no appUser profile found after load. Redirecting to login.");
       router.replace('/login');
    }
    
  }, [user, appUser, authLoading, router]);


  // The actual loading UI is handled by AppStateController in AppProviders.
  // This component just returns a placeholder while the redirection logic runs.
  return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Iniciando...</p>
            <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full"></div>
            </div>
        </div>
    </div>
  );
}

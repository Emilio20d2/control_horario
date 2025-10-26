
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDataProvider } from '@/hooks/use-data-provider';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { appUser, loading: dataLoading, viewMode } = useDataProvider();

  useEffect(() => {
    // Render loading screen (handled by AppStateController) while waiting
    if (authLoading || dataLoading) {
      return;
    }

    // If loading is finished and there's no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // If we have an appUser, redirect based on their role and current view mode
    if (appUser) {
      if (appUser.role === 'admin') {
        router.replace('/dashboard');
      } else if (appUser.role === 'employee') {
        router.replace('/my-profile');
      } else {
        // Fallback for unexpected roles
        router.replace('/login');
      }
    } else {
      // Fallback if appUser is null after loading (e.g., data inconsistency)
       console.error("User authenticated but no appUser profile found. Redirecting to login.");
       router.replace('/login');
    }
    
  }, [user, appUser, authLoading, dataLoading, router]);


  // The actual loading UI is now handled by the AppStateController in AppProviders.
  // This just returns a placeholder while the redirection logic runs.
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

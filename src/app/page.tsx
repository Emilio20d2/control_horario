
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDataProvider } from '@/hooks/use-data-provider';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { appUser, loading: dataLoading } = useDataProvider();

  useEffect(() => {
    // Wait until both authentication and data loading are complete
    if (authLoading || dataLoading) {
      return; // Do nothing while loading
    }

    // Once loading is finished, decide where to redirect
    if (!user) {
      // If no user is authenticated, go to login
      router.replace('/login');
    } else if (appUser) {
      // If there is an authenticated user and app user data is available
      if (appUser.role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/my-profile');
      }
    }
    // If user is authenticated but appUser is not loaded yet, this effect will
    // re-run once appUser is available, handling the redirection correctly.
    // A fallback to /login is included in case appUser never loads for an auth'd user.
    else if (!dataLoading) {
        router.replace('/login');
    }
    
  }, [user, appUser, authLoading, dataLoading, router]);

  // Display a consistent loading screen while logic is processing
  return (
    <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Cargando...</p>
            <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full"></div>
            </div>
        </div>
    </div>
  );
}

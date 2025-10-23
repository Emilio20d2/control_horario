
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
    // If user is logged in but appUser is not yet available, the effect
    // will re-run when dataLoading becomes false.
    
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

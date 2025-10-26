
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
    // Do nothing while loading. The loading screen is handled by AppProviders.
    if (authLoading || dataLoading) {
      return;
    }

    // If loading is done and there's no user, go to login.
    if (!user) {
      router.replace('/login');
      return;
    }

    // If we have a user profile, redirect based on roles.
    if (appUser) {
      // If the true role is admin and they are in employee view mode
      if (appUser.trueRole === 'admin' && viewMode === 'employee') {
        router.replace('/my-profile');
      } 
      // If the true role is admin and they are in admin view mode
      else if (appUser.trueRole === 'admin' && viewMode === 'admin') {
        router.replace('/dashboard');
      } 
      // If the user is a regular employee
      else if (appUser.trueRole === 'employee') {
        router.replace('/my-profile');
      }
      // Fallback
      else {
        router.replace('/login');
      }
    } 
    // Fallback if appUser is null after loading
    else {
      router.replace('/login');
    }
    
  }, [user, appUser, authLoading, dataLoading, router, viewMode]);


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

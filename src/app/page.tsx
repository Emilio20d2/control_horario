
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
    // This effect runs only when loading states or user objects change.
    // It is responsible for redirecting the user AFTER all loading is complete.

    // Do nothing while either auth or data is loading.
    // The loading screen is handled by AppProviders.
    if (authLoading || dataLoading) {
      return; 
    }

    // If loading is done and there's no authenticated user, go to login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // If loading is done and we have an authenticated user with an app profile.
    if (appUser) {
      if (appUser.role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/my-profile');
      }
    } 
    // Fallback: If loading is done, user is auth'd, but appUser failed to load,
    // send back to login to prevent being stuck.
    else {
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

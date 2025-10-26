
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, appUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (appUser) {
      if (appUser.role === 'admin') {
        router.replace('/dashboard');
      } else if (appUser.role === 'employee') {
        router.replace('/my-profile');
      }
    }
    // If appUser is not available after loading, it will implicitly do nothing,
    // waiting for the state to resolve. The loading screen from AppProviders handles the UI.

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

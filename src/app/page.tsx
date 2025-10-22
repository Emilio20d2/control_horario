
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
    const loading = authLoading || dataLoading;
    if (!loading) {
      if (user && appUser) {
        if (appUser.role === 'admin') {
            router.replace('/dashboard');
        } else {
            router.replace('/my-profile');
        }
      } else if (!user) {
        router.replace('/login');
      }
    }
  }, [user, appUser, authLoading, dataLoading, router]);

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

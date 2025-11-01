
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, viewMode } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return; // Espera a que la autenticación y la determinación del rol finalicen.
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    // Una vez que la carga ha terminado y tenemos un usuario,
    // el viewMode ya estará correctamente establecido.
    if (viewMode === 'admin') {
        router.replace('/home');
    } else if (viewMode === 'employee') {
        router.replace('/my-profile');
    }

  }, [user, authLoading, viewMode, router]);


  // La pantalla de carga principal es manejada por AppStateController en AppProviders.
  // Este componente solo muestra un placeholder mientras se ejecuta la lógica de redirección.
  return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Redirigiendo...</p>
            <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full"></div>
            </div>
        </div>
    </div>
  );
}

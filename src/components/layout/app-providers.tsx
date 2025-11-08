
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";
import { AppLayout } from "./app-layout";

function AppStateController({ children }: { children: ReactNode }) {
    const { user, loading: authLoading, authConfigured } = useAuth();
    const { loading: dataLoading, databaseConfigured } = useDataProvider();

    // While auth is resolving (user and appUser), show a spinner. This is the very first check.
    if (authLoading) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">Autenticando y verificando perfil...</p>
                    <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!authConfigured) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
                <div className="max-w-xl space-y-4">
                    <h1 className="text-3xl font-semibold">Configura la autenticación y la base de datos</h1>
                    <p className="text-muted-foreground">
                        Este repositorio se entrega sin proveedores externos configurados. Implementa tu adaptador siguiendo la guía en
                        <code className="mx-1 rounded bg-muted px-2 py-1 text-sm">src/lib/database/README.md</code> y activa tu solución de autenticación
                        antes de continuar.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Una vez que hayas configurado ambos servicios podrás eliminar este mensaje y cargar tus propios datos.
                    </p>
                </div>
                <div className="w-full max-w-xl">{children}</div>
            </div>
        );
    }

    if (!user) {
        return <>{children}</>;
    }

    // If we have an authenticated user but the main app data is still loading
    if (user && (dataLoading || !databaseConfigured)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">Cargando datos de la aplicación...</p>
                    <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Once everything is loaded, render the full app layout and content.
    return <AppLayout>{children}</AppLayout>;
}


export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <DataProvider>
                <AppStateController>
                    {children}
                </AppStateController>
            </DataProvider>
        </AuthProvider>
    );
}

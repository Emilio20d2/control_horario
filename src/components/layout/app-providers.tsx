
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";

function AppStateController({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { loading: dataLoading, appUser } = useDataProvider();

    // While auth is resolving, show a spinner. This is the very first check.
    if (authLoading) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">Autenticando...</p>
                    <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    // If there's no user after auth check, it's a public page like /login.
    // Let it render immediately.
    if (!user) {
        return <>{children}</>;
    }
    
    // If we have an authenticated user but data is still loading (either appUser or the rest)
    if (user && dataLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        {!appUser ? 'Verificando perfil...' : 'Cargando datos...'}
                    </p>
                    <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Once everything is loaded, render the full app layout and content.
    return <>{children}</>;
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

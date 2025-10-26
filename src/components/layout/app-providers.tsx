
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";

function AppStateController({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { appUser, loading: dataLoading } = useDataProvider();

    // If auth is still resolving, or if there's no user and we're not in an auth loading state (i.e., on a public page), show children.
    if (authLoading || !user) {
        // Show a loading spinner during the initial auth check
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
        // If not auth loading and no user, it's a public page like /login
        return <>{children}</>;
    }
    
    // If we have an authenticated user but are still waiting for app data (including appUser profile)
    if (user && dataLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        {authLoading || !appUser ? 'Verificando perfil...' : 'Cargando datos...'}
                    </p>
                    <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Once everything is loaded, render the app
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

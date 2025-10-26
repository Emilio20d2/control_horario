
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";

function AppStateController({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { appUser, loading: dataLoading } = useDataProvider();

    // If there is no user, we are on a public page (login, register, etc.)
    if (!user) {
        return <>{children}</>;
    }

    // If there is a user but we are still loading their profile or app data
    if (authLoading || dataLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                        {authLoading || !appUser ? 'Autenticando...' : 'Cargando datos...'}
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

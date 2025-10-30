
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";
import { AppLayout } from "./app-layout";

function AppStateController({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { loading: dataLoading } = useDataProvider();

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
    
    // If there's no user after auth check, it's a public page like /login.
    // Render the content directly without the main layout.
    if (!user) {
        return <>{children}</>;
    }
    
    // If we have an authenticated user but the main app data is still loading
    if (user && dataLoading) {
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

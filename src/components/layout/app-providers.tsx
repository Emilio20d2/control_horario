
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";
import { AppLayout } from "./app-layout";

export function AppProviders({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();

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
    
    // If there is no user, we are on a public page (login, register), so we just render children.
    if (!user) {
        return <>{children}</>;
    }
    
    // If there is a user, wrap with DataProvider. AppLayout is now in the root layout.
    return (
        <DataProvider>
            {children}
        </DataProvider>
    );
}

// Wrapping the main component with AuthProvider
export default function AppProvidersWrapper({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <AppProviders>{children}</AppProviders>
        </AuthProvider>
    )
}

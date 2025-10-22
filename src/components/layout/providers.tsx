
'use client';

import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "./app-layout";
import { ReactNode, useEffect } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";

export const CoreApp = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const { loading: dataLoading, loadData } = useDataProvider();

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, loadData]);

    // Step 1: Handle initial authentication loading. This is the most crucial part.
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
    
    // Step 2: If user is logged in, handle data loading.
    if (user) {
        if (dataLoading) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground">Cargando datos...</p>
                        <div className="w-64 h-2 rounded-full bg-muted-foreground/10 overflow-hidden">
                            <div className="h-full bg-primary animate-pulse w-full"></div>
                        </div>
                    </div>
                </div>
            );
        }
        // If user and data are loaded, show the app layout.
        return (
            <AppLayout>
                {children}
            </AppLayout>
        );
    }

    // Step 3: If no user after auth check, render children (e.g., the login page).
    return <>{children}</>;
}

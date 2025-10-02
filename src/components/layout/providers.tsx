
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

    const isLoading = authLoading || (user && dataLoading);

    if (isLoading) {
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
    
    // If not logged in, pages like /login will render directly.
    if (!user) {
        return <>{children}</>;
    }

    // If logged in, wrap content with the main app layout.
    return (
        <AppLayout>
            {children}
        </AppLayout>
    );
}

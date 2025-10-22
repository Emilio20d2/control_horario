
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider, useDataProvider } from "@/hooks/use-data-provider";
import { ReactNode, useEffect } from "react";
import { AppLayout } from "./app-layout";

const CoreApp = ({ children }: { children: ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const { loading: dataLoading, loadData } = useDataProvider();

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, loadData]);

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
        return (
            <AppLayout>
                {children}
            </AppLayout>
        );
    }

    return <>{children}</>;
}


export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
          <DataProvider>
            <CoreApp>
              {children}
            </CoreApp>
          </DataProvider>
        </AuthProvider>
    )
}

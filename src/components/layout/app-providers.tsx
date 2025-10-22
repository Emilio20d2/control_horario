
'use client';

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";
import { AppLayout } from "./app-layout";

const CoreApp = ({ children }: { children: ReactNode }) => {
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
    
    if (user) {
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

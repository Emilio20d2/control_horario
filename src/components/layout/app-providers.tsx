
'use client';

import { AuthProvider } from "@/hooks/useAuth";
import { DataProvider } from "@/hooks/use-data-provider";
import { ReactNode } from "react";
import { CoreApp } from "./providers";

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

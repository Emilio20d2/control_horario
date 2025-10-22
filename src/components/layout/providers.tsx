
'use client';

// This component is no longer used. Its logic has been moved to app-providers.tsx
// to simplify the component tree and fix initialization issues.

import { ReactNode } from "react";

export const CoreApp = ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
}


import './globals.css';
import 'react-day-picker/dist/style.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProviders } from '@/components/layout/app-providers';
import { cn } from '@/lib/utils';
import '@/lib/database/register-postgres-adapter.server';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>Control Horario</title>
        <meta name="description" content="Gestión de Turnos de Empleados" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Control Horario" />
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#020817" media="(prefers-color-scheme: dark)" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={cn('antialiased font-body')}>
        <AppProviders>
            {children}
        </AppProviders>
        <Toaster />
      </body>
    </html>
  );
}

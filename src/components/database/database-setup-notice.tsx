'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function DatabaseSetupNotice() {
  return (
    <Alert className="flex items-start gap-4 border-dashed border-primary/40 bg-primary/5">
      <ExternalLink className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <AlertTitle>Base de datos no configurada</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Este módulo requiere una base de datos operativa. Implementa tu propio adaptador siguiendo la guía disponible en
            <code className="mx-1 rounded bg-muted px-2 py-1 text-sm">src/lib/database/README.md</code> y vuelve a cargar la página cuando
            hayas finalizado la integración.
          </p>
          <p className="text-sm text-muted-foreground">
            También puedes documentar tu implementación en el README para que otras personas sepan cómo conectar su instancia.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Ver documentación de configuración
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </AlertDescription>
      </div>
    </Alert>
  );
}

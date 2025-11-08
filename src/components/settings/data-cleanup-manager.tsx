import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';

export function DataCleanupManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Limpieza de datos</CardTitle>
        <CardDescription>
          Configura un adaptador de base de datos para habilitar las herramientas de mantenimiento y migración.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DatabaseSetupNotice />
      </CardContent>
    </Card>
  );
}

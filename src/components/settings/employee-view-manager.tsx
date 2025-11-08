import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';

export function EmployeeViewManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista del empleado</CardTitle>
        <CardDescription>
          Conecta tu base de datos para permitir que los empleados consulten su portal personal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Switch disabled />
        <DatabaseSetupNotice />
      </CardContent>
    </Card>
  );
}

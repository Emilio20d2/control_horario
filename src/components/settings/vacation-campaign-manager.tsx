import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';

export function VacationCampaignManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campañas de vacaciones</CardTitle>
        <CardDescription>
          Implementa tu base de datos para publicar, editar y monitorizar campañas de vacaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DatabaseSetupNotice />
      </CardContent>
    </Card>
  );
}

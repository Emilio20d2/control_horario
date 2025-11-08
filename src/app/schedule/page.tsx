import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function SchedulePage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Planificador semanal"
        description="Conecta tu base de datos para gestionar turnos y confirmar semanas."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

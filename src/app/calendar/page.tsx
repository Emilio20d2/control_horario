import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function CalendarPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Calendario de ausencias"
        description="Configura tu proveedor de base de datos para habilitar el calendario colaborativo."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function VacationsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Gestión de vacaciones"
        description="Agrega un proveedor de datos para visualizar campañas y solicitudes de vacaciones."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

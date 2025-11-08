import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function MySchedulePage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Mi horario"
        description="Este módulo requiere una base de datos configurada para mostrar registros personales."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

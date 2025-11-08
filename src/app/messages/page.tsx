import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function MessagesPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Centro de mensajes"
        description="Integra tu proveedor de base de datos y mensajería para gestionar conversaciones del equipo."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

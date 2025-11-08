import { DatabaseSetupNotice } from '@/components/database/database-setup-notice';
import { PageHeader } from '@/components/layout/page-header';

export default function MyMessagesPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Mis mensajes"
        description="Conecta un servicio de base de datos y mensajería para habilitar la bandeja de conversación."
      />
      <DatabaseSetupNotice />
    </div>
  );
}

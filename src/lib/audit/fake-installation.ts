import type { DatabaseAdapterDefinition } from '../database';
import {
  runLocalAuthAudit,
  type LocalAuthAuditReport,
  type LocalAuthOptions,
} from '../auth/local-auth-service';

interface DatabaseAuditReport {
  success: boolean;
  insertedId?: string | null;
  totalDocuments?: number;
  issues: string[];
}

export interface FakeInstallationAuditOptions {
  createAdapter: () => DatabaseAdapterDefinition;
  loadDatabase?: LocalAuthOptions['loadDatabase'];
  authEmail?: string;
  authPassword?: string;
}

export interface FakeInstallationAuditReport {
  timestamp: string;
  database: DatabaseAuditReport;
  authentication: LocalAuthAuditReport;
}

const generateTestEmployee = () => ({
  id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  name: 'Auditoría Técnica',
  role: 'employee',
});

export const runFakeInstallationAudit = async (
  options: FakeInstallationAuditOptions,
): Promise<FakeInstallationAuditReport> => {
  const databaseIssues: string[] = [];
  let insertedId: string | null = null;
  let totalDocuments: number | undefined;

  try {
    const adapter = options.createAdapter();
    const testEmployee = generateTestEmployee();
    const reference = await adapter.addDocument('employees', testEmployee);
    insertedId = reference.id;

    const employees = await adapter.getCollection<{ id: string; name: string }>('employees');
    totalDocuments = employees.length;
    const inserted = employees.find((item) => item.id === insertedId);
    if (!inserted) {
      databaseIssues.push('No se pudo verificar la inserción del documento de prueba en la base de datos.');
    }

    await adapter.deleteDocument('employees', insertedId);
  } catch (error) {
    databaseIssues.push(`Error durante la verificación de la base de datos: ${(error as Error).message}`);
  }

  const email = options.authEmail ?? process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const password =
    options.authPassword ?? process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD ?? 'admin1234';

  const authentication = runLocalAuthAudit(email, password, {
    loadDatabase: options.loadDatabase,
  });

  if (!authentication.success && authentication.issues.length === 0) {
    authentication.issues.push('No se pudo completar la auditoría de autenticación.');
  }

  return {
    timestamp: new Date().toISOString(),
    database: {
      success: databaseIssues.length === 0,
      insertedId,
      totalDocuments,
      issues: databaseIssues,
    },
    authentication,
  };
};

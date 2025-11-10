import assert from 'node:assert/strict';
import test from 'node:test';
import { newDb } from 'pg-mem';

import { createPostgresAdapter } from '../src/lib/database/adapters/postgres';
import { runFakeInstallationAudit } from '../src/lib/audit/fake-installation';
import { authenticateWithLocalProvider } from '../src/lib/auth/local-auth-service';
import { DEFAULT_LOCAL_DATABASE } from '../src/lib/local-data';

const ensureEnvironment = () => {
  process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL = 'admin@example.com';
  process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD = 'admin1234';
  process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD = 'welcome1234';
};

test('fake installation audit verifies database connectivity and authentication', async () => {
  ensureEnvironment();
  const db = newDb();
  const { Pool } = db.adapters.createPg();

  const report = await runFakeInstallationAudit({
    createAdapter: () =>
      createPostgresAdapter({
        connectionString: 'postgres://user:pass@localhost:5432/control_horario',
        poolFactory: () => new Pool(),
      }),
    loadDatabase: () => DEFAULT_LOCAL_DATABASE,
    authEmail: 'admin@example.com',
    authPassword: 'admin1234',
  });

  assert.equal(report.database.success, true, `Database audit failed: ${report.database.issues.join('; ')}`);
  assert.equal(
    report.authentication.success,
    true,
    `Auth audit failed: ${report.authentication.issues.join('; ')}`,
  );
  assert.ok(report.database.insertedId, 'The audit should record the inserted document identifier.');
  assert.ok(
    (report.database.totalDocuments ?? 0) >= 1,
    'The audit should report the number of documents retrieved from the database.',
  );
});

test('local authentication rejects invalid passwords', () => {
  ensureEnvironment();
  const result = authenticateWithLocalProvider('admin@example.com', 'invalid-password', {
    loadDatabase: () => DEFAULT_LOCAL_DATABASE,
  });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Contraseña no válida'));
});

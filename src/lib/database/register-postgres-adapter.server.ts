import 'server-only';

import { configureDatabaseAdapter } from './index';
import { createPostgresAdapter } from './adapters/postgres';

let registered = false;

const resolveSslConfig = (): boolean | { rejectUnauthorized: boolean } | undefined => {
  const sslMode = process.env.POSTGRES_SSLMODE ?? process.env.PGSSLMODE ?? 'disable';
  const allowSelfSigned = String(process.env.POSTGRES_ALLOW_SELF_SIGNED ?? '').toLowerCase() === 'true';

  switch (sslMode) {
    case 'require':
    case 'verify-ca':
    case 'verify-full':
      return { rejectUnauthorized: !allowSelfSigned };
    case 'disable':
    default:
      return undefined;
  }
};

export const registerPostgresAdapter = () => {
  if (registered) {
    return;
  }

  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }

  const schema = process.env.POSTGRES_SCHEMA;

  const adapter = createPostgresAdapter({
    connectionString,
    schema: schema && schema.trim().length > 0 ? schema : undefined,
    ssl: resolveSslConfig(),
  });

  configureDatabaseAdapter(adapter);
  registered = true;
};

registerPostgresAdapter();

import { Pool, type PoolClient, type PoolConfig } from 'pg';

if (typeof window !== 'undefined') {
  throw new Error('El adaptador de Postgres solo puede ejecutarse en el servidor.');
}

import type { DatabaseAdapterDefinition, DatabaseDocumentReference } from '../index';

interface PostgresAdapterConfig {
  connectionString: string;
  schema?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  poolFactory?: (config: PoolConfig) => Pool;
}

interface PostgresAdapterInternals {
  pool: Pool;
  schema: string;
  schemaReady: Promise<void>;
}

const DEFAULT_SCHEMA = 'public';

const buildDocumentPayload = (id: string, data: any) => ({
  ...data,
  id,
});

const mapRowToDocument = <T>(row: { id: string; data: any }): T => ({
  id: row.id,
  ...(row.data as Record<string, unknown>),
}) as T;

const ensureSchema = async (client: PoolClient, schema: string) => {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS ${schema};

    CREATE TABLE IF NOT EXISTS ${schema}.app_documents (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, id)
    );

    CREATE TABLE IF NOT EXISTS ${schema}.app_subcollection_documents (
      collection TEXT NOT NULL,
      document_id TEXT NOT NULL,
      subcollection TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, document_id, subcollection, id)
    );

    CREATE TABLE IF NOT EXISTS ${schema}.app_conversation_messages (
      conversation_id TEXT NOT NULL,
      id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (conversation_id, id)
    );

    CREATE INDEX IF NOT EXISTS app_documents_collection_idx
      ON ${schema}.app_documents (collection);

    CREATE INDEX IF NOT EXISTS app_subcollection_documents_collection_idx
      ON ${schema}.app_subcollection_documents (collection, document_id, subcollection);

    CREATE INDEX IF NOT EXISTS app_conversation_messages_conversation_idx
      ON ${schema}.app_conversation_messages (conversation_id);
  `);
};

const createInternals = async (config: PostgresAdapterConfig): Promise<PostgresAdapterInternals> => {
  const { connectionString, schema = DEFAULT_SCHEMA, ssl, poolFactory } = config;
  const poolConfig: PoolConfig = { connectionString, ssl };
  const pool = poolFactory ? poolFactory(poolConfig) : new Pool(poolConfig);

  const schemaReady = pool
    .connect()
    .then(async (client) => {
      try {
        await ensureSchema(client, schema);
      } finally {
        client.release();
      }
    })
    .catch((error) => {
      console.error('[database] Error al preparar el esquema de Postgres:', error);
      throw error;
    });

  return {
    pool,
    schema,
    schemaReady,
  };
};

const withSchema = (schema: string, table: string) => `${schema}.${table}`;

const runWithSchema = async <T>(internals: PostgresAdapterInternals, task: (client: PoolClient, schema: string) => Promise<T>) => {
  await internals.schemaReady;
  const client = await internals.pool.connect();
  try {
    return await task(client, internals.schema);
  } finally {
    client.release();
  }
};

export const createPostgresAdapter = (
  config: PostgresAdapterConfig,
): DatabaseAdapterDefinition => {
  const internalsPromise = createInternals(config);

  const withInternals = async <T>(
    task: (internals: PostgresAdapterInternals) => Promise<T>,
  ): Promise<T> => task(await internalsPromise);

  const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    return withInternals((internals) =>
      runWithSchema(internals, async (client, schema) => {
        const result = await client.query<{ id: string; data: any }>(
          `SELECT id, data FROM ${withSchema(schema, 'app_documents')} WHERE collection = $1 ORDER BY updated_at DESC`,
          [collectionName],
        );
        return result.rows.map((row) => mapRowToDocument<T>(row));
      }),
    );
  };

  const getDocumentById = async <T>(collectionName: string, id: string): Promise<T | null> => {
    return withInternals((internals) =>
      runWithSchema(internals, async (client, schema) => {
        const result = await client.query<{ id: string; data: any }>(
          `SELECT id, data FROM ${withSchema(schema, 'app_documents')} WHERE collection = $1 AND id = $2 LIMIT 1`,
          [collectionName, id],
        );
        const row = result.rows[0];
        return row ? mapRowToDocument<T>(row) : null;
      }),
    );
  };

  return {
    async getCollection(collectionName) {
      return getCollection(collectionName);
    },
    async getDocumentById(collectionName, id) {
      return getDocumentById(collectionName, id);
    },
    onCollectionUpdate(collectionName, callback) {
      const ready = getCollection(collectionName).then((documents) => callback(documents));
      return {
        ready: ready.then(() => undefined),
        unsubscribe: () => {
          // No hay listeners activos que liberar.
        },
      };
    },
    onDocumentUpdate(collectionName, id, callback) {
      const ready = getDocumentById(collectionName, id).then((document) => callback(document));
      return {
        ready: ready.then(() => undefined),
        unsubscribe: () => {
          // No hay listeners activos que liberar.
        },
      };
    },
    async addDocument(collectionName, data) {
      const id = data?.id ?? crypto.randomUUID();
      const payload = buildDocumentPayload(id, data);
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `INSERT INTO ${withSchema(schema, 'app_documents')} (collection, id, data)
             VALUES ($1, $2, $3)
             ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [collectionName, id, JSON.stringify(payload)],
          );
        }),
      );
      return { id } satisfies DatabaseDocumentReference;
    },
    async updateDocument(collectionName, docId, data) {
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `UPDATE ${withSchema(schema, 'app_documents')}
               SET data = jsonb_set(data, '{id}', to_jsonb($2::text)) || $3::jsonb, updated_at = NOW()
             WHERE collection = $1 AND id = $2`,
            [collectionName, docId, JSON.stringify(data ?? {})],
          );
        }),
      );
    },
    async deleteDocument(collectionName, docId) {
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `DELETE FROM ${withSchema(schema, 'app_documents')} WHERE collection = $1 AND id = $2`,
            [collectionName, docId],
          );
        }),
      );
    },
    async deleteSubcollectionDocument(collectionName, docId, subcollectionName, subDocId) {
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `DELETE FROM ${withSchema(schema, 'app_subcollection_documents')}
               WHERE collection = $1 AND document_id = $2 AND subcollection = $3 AND id = $4`,
            [collectionName, docId, subcollectionName, subDocId],
          );
        }),
      );
    },
    async setDocument(collectionName, docId, data, options) {
      const payload = buildDocumentPayload(docId, data);
      const merge = Boolean(options?.merge);
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `INSERT INTO ${withSchema(schema, 'app_documents')} (collection, id, data)
             VALUES ($1, $2, $3)
             ON CONFLICT (collection, id)
             DO UPDATE SET data = ${merge ? `${withSchema(schema, 'app_documents')}.data || EXCLUDED.data` : 'EXCLUDED.data'}, updated_at = NOW()`,
            [collectionName, docId, JSON.stringify(payload)],
          );
        }),
      );
    },
    async createConversation(employeeId, employeeName) {
      const id = employeeId;
      const now = new Date().toISOString();
      const payload = {
        id,
        employeeId,
        employeeName,
        lastMessageText: '',
        lastMessageTimestamp: now,
        readBy: [],
        unreadByEmployee: true,
      };
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `INSERT INTO ${withSchema(schema, 'app_documents')} (collection, id, data)
             VALUES ('conversations', $1, $2)
             ON CONFLICT (collection, id) DO NOTHING`,
            [id, JSON.stringify(payload)],
          );
        }),
      );
    },
    async addConversationMessage(conversationId, data) {
      const messageId = data?.id ?? crypto.randomUUID();
      const timestamp = data?.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString();
      const messagePayload = {
        ...data,
        id: messageId,
        timestamp,
      };
      await withInternals((internals) =>
        runWithSchema(internals, async (client, schema) => {
          await client.query(
            `INSERT INTO ${withSchema(schema, 'app_conversation_messages')} (conversation_id, id, data)
             VALUES ($1, $2, $3)
             ON CONFLICT (conversation_id, id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW()`,
            [conversationId, messageId, JSON.stringify(messagePayload)],
          );
          const updates: Record<string, unknown> = {
            lastMessageText: messagePayload.text ?? '',
            lastMessageTimestamp: timestamp,
          };
          if (typeof messagePayload.unreadByEmployee === 'boolean') {
            updates.unreadByEmployee = messagePayload.unreadByEmployee;
          }
          if (Array.isArray(messagePayload.readBy)) {
            updates.readBy = messagePayload.readBy;
          }
          await client.query(
            `UPDATE ${withSchema(schema, 'app_documents')}
               SET data = data || $3::jsonb, updated_at = NOW()
             WHERE collection = 'conversations' AND id = $1`,
            [conversationId, conversationId, JSON.stringify(updates)],
          );
        }),
      );
    },
  } satisfies DatabaseAdapterDefinition;
};

export type { PostgresAdapterConfig };

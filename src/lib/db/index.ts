import { Pool } from 'pg';
import { Tables, tableSQLMap, tableSQLDepend } from './schema';
import { logger } from '@/lib/utils/logger';

export const DB_INITIALIZED = true;

declare global {
  var pgPool: Pool | undefined
}
// Более быстрое соединения с БД
export const getPool = () => {
  if (!global.pgPool) {
    global.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,

      // максимальное количество соединений
      max: 10,

      // сколько соединение может простаивать
      idleTimeoutMillis: 30000,

      // сколько ждать соединение из pool
      connectionTimeoutMillis: 2000,

      // закрывать соединения через время
      maxUses: 7500
    })

    global.pgPool.on("connect", () => {
      logger.dbLog('POOL_CONNECTED')
    })

    global.pgPool.on("error", (err) => {
      logger.dbError('POOL_ERROR', undefined, err instanceof Error ? err.message : String(err))
    })
  }

  return global.pgPool
}

export async function createTable(table: Tables) {
  const client = getPool();

  try {

    await createTableIfNotExists(client, table);

    if (tableSQLDepend[table]) {
      for (const dep of tableSQLDepend[table]!) {
        await createTableIfNotExists(client, dep);
      }
    }    

    // 👉 ДОБАВЛЯЕМ FK ТОЛЬКО ДЛЯ DOCUMENT
    if (table === Tables.DOCUMENT) {
      await addDocumentCurrentVersionFK(client);
    }
  
  } catch (err) {
    logger.dbError('CREATE_TABLE_FAILED', table, err instanceof Error ? err.message : String(err));
    throw err;

  }
}

async function createTableIfNotExists(client: any, table: Tables) {
  const checkQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;

  const checkResult = await client.query(checkQuery, [table]);
  const tableExists = checkResult.rows[0].exists;

  if (tableExists) {
    logger.dbLog('TABLE_ALREADY_EXISTS', table);
    return;
  }

  const query = tableSQLMap[table];

  if (!query) {
    throw new Error(`SQL not found for table: ${table}`);
  }

  await client.query(query);
  logger.dbLog('TABLE_CREATED', table);
}

async function addDocumentCurrentVersionFK(client: any) {
  const constraintName = 'document_current_version_fk';

  const checkConstraint = `
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = $1
    );
  `;

  const result = await client.query(checkConstraint, [constraintName]);
  const exists = result.rows[0].exists;

  if (exists) {
    logger.dbLog('CONSTRAINT_ALREADY_EXISTS', constraintName);
    return;
  }

  await client.query(`
    ALTER TABLE document
    ADD CONSTRAINT ${constraintName}
    FOREIGN KEY (current_version_id)
    REFERENCES document_version(id)
    ON DELETE SET NULL
  `);

  logger.dbLog('CONSTRAINT_CREATED', constraintName);
}
import { Pool } from 'pg';
import { Tables, tableSQLMap, tableSQLDepend } from './schema';

const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connection successful');
    return client;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

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
      console.log("PostgreSQL pool connected")
    })

    global.pgPool.on("error", (err) => {
      console.error("PostgreSQL pool error", err)
    })
  }

  return global.pgPool
}

export async function createTable(table: Tables) {
  const client = await connectDB();

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
    console.error(`createTable: Failed to create table "${table}". `, err);
    throw err;

  } finally {
    client.release();
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
    console.log(`createTable: Table "${table}" already exists. Skipping creation.`);
    return;
  }

  const query = tableSQLMap[table];

  if (!query) {
    throw new Error(`SQL not found for table: ${table}`);
  }

  await client.query(query);
  console.log(`createTable: Table "${table}" created successfully.`);
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
    console.log(`Constraint "${constraintName}" already exists. Skipping.`);
    return;
  }

  await client.query(`
    ALTER TABLE document
    ADD CONSTRAINT ${constraintName}
    FOREIGN KEY (current_version_id)
    REFERENCES document_version(id)
    ON DELETE SET NULL
  `);

  console.log(`Constraint "${constraintName}" created successfully.`);
}
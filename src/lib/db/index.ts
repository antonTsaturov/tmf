import { Pool } from 'pg';
import { Tables, tableSQLMap } from './schema';

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

// Function to close the database connection pool
// export async function closeDB() {
//   if (pool) {
//     await pool.end();
//     console.log('PostgreSQL connection pool closed');
//   }
// }


//export default pool;

export async function createTable(table: Tables) {
  const client = await connectDB();
  try {
    const query = tableSQLMap[table];

    if (!query) {
      throw new Error(`SQL not found for table: ${table}`);
    }

    await client.query(query);
    console.log(`createTable: Table "${table}" created successfully.`);

  } catch (err) {
    console.error(`createTable: Table "${table}" not created!. `, err);
    throw err;

  } finally {
    client.release();
  }
}

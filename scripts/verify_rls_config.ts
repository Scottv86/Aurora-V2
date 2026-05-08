import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        relname as tablename, 
        relrowsecurity as rls_enabled, 
        relforcerowsecurity as rls_forced 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
      AND relkind = 'r'
      AND relname IN ('parties', 'modules', 'records')
    `);
    console.table(res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

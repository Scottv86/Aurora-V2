import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkAllRls() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);

    console.log('--- RLS STATUS OF ALL PUBLIC TABLES ---');
    res.rows.forEach(row => {
      console.log(`${row.table_name.padEnd(30)} | RLS Enabled: ${row.rls_enabled} | RLS Forced: ${row.rls_forced}`);
    });
  } catch (err) {
    console.error('Error connecting or checking RLS:', err.message);
  } finally {
    await client.end();
  }
}

checkAllRls();

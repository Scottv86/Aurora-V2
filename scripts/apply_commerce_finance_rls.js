import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRlsMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const migrationPath = path.join(__dirname, '..', 'prisma', 'apply_commerce_finance_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying RLS enablement & policies to all 21 commerce and finance tables...');
    await client.query(sql);
    console.log('Successfully enabled RLS, forced security, and applied tenant policies!\n');

    // Verify all tables
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

    const unenabled = res.rows.filter(r => !r.rls_enabled);
    console.log(`TOTAL PUBLIC TABLES: ${res.rows.length}`);
    console.log(`TABLES WITHOUT RLS: ${unenabled.length}`);
    if (unenabled.length > 0) {
      unenabled.forEach(r => console.log(` - ${r.table_name}`));
    } else {
      console.log('ALL PUBLIC TABLES NOW HAVE ROW LEVEL SECURITY (RLS) ENABLED!');
    }

  } catch (err) {
    console.error('Error applying RLS migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRlsMigration();

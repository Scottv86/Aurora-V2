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

async function applyUniversalToolsRls() {
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

    const migrationPath = path.join(__dirname, '..', 'prisma', 'fix_supabase_universal_tools_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying RLS fixes for universal_calculations, universal_notes, universal_reminders...');
    await client.query(sql);
    console.log('Successfully enabled RLS, forced security, and applied tenant/service policies!\n');

    // Verification check across all public tables
    const res = await client.query(`
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced,
        (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);

    const missingRls = res.rows.filter(r => !r.rls_enabled);
    const noPolicy = res.rows.filter(r => r.rls_enabled && parseInt(r.policy_count, 10) === 0);
    const notForced = res.rows.filter(r => r.rls_enabled && !r.rls_forced);

    console.log(`=== AUDIT SUMMARY ===`);
    console.log(`Total public tables checked: ${res.rows.length}`);
    console.log(`Tables with RLS disabled: ${missingRls.length}`);
    if (missingRls.length > 0) {
      console.log('  ->', missingRls.map(r => r.table_name));
    }
    console.log(`Tables with 0 policies: ${noPolicy.length}`);
    if (noPolicy.length > 0) {
      console.log('  ->', noPolicy.map(r => r.table_name));
    }
    console.log(`Tables with RLS not forced: ${notForced.length}`);
    if (notForced.length > 0) {
      console.log('  ->', notForced.map(r => r.table_name));
    }

    if (missingRls.length === 0 && noPolicy.length === 0 && notForced.length === 0) {
      console.log('\nAll public tables in Supabase have RLS enabled, forced, and configured with policies!');
    }
  } catch (err) {
    console.error('Error applying RLS migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyUniversalToolsRls();

import { Pool } from 'pg';
import 'dotenv/config';

async function checkRLS() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        relname as table_name, 
        relrowsecurity as rls_enabled, 
        relforcerowsecurity as force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
      AND relkind = 'r'
      AND relname IN ('User', 'Tenant', 'Workspace', 'Module', 'Record', 'TenantMember', 'DocumentTemplate', 'GeneratedDocument');
    `);
    
    console.log('--- RLS STATUS ON TABLES ---');
    console.table(res.rows);

    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    console.log('\n--- POLICIES ---');
    console.table(policies.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

checkRLS().catch(console.error);

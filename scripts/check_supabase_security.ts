import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function runSecurityAudit() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // 1. RLS Disabled on Public Tables (rls_disabled)
    const rlsDisabled = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relrowsecurity = false
        AND c.relname NOT IN ('_prisma_migrations', 'spatial_ref_sys');
    `);
    console.log('--- 1. TABLES WITH RLS DISABLED (rls_disabled) ---');
    if (rlsDisabled.rows.length === 0) {
      console.log('   None! All public tables have RLS enabled.');
    } else {
      rlsDisabled.rows.forEach(r => console.log(`   - ${r.table_name}`));
    }

    // 2. RLS Enabled but No Policies (rls_enabled_no_policy)
    const rlsNoPolicy = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
        AND p.polname IS NULL;
    `);
    console.log('\n--- 2. TABLES WITH RLS ENABLED BUT NO POLICIES (rls_enabled_no_policy) ---');
    if (rlsNoPolicy.rows.length === 0) {
      console.log('   None!');
    } else {
      rlsNoPolicy.rows.forEach(r => console.log(`   - ${r.table_name}`));
    }

    // 3. Custom SECURITY DEFINER functions missing search_path
    const secDefFuncs = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        p.proconfig AS config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prosecdef = true
        AND n.nspname = 'public'
        AND (
          p.proconfig IS NULL 
          OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
          )
        );
    `);
    console.log('\n--- 3. SECURITY DEFINER FUNCTIONS MISSING search_path (function_search_path_mutable) ---');
    if (secDefFuncs.rows.length === 0) {
      console.log('   None! All SECURITY DEFINER functions have explicit search_path set.');
    } else {
      secDefFuncs.rows.forEach(r => console.log(`   - ${r.function_name} (Config: ${JSON.stringify(r.config)})`));
    }

    // 4. Extensions installed in public schema (extension_in_public)
    const publicExtensions = await client.query(`
      SELECT extname 
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE n.nspname = 'public';
    `);
    console.log('\n--- 4. EXTENSIONS IN PUBLIC SCHEMA (extension_in_public) ---');
    if (publicExtensions.rows.length === 0) {
      console.log('   None!');
    } else {
      publicExtensions.rows.forEach(r => console.log(`   - ${r.extname}`));
    }

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await client.end();
  }
}

runSecurityAudit();

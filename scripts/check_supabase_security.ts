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
    
    // 0. All tables
    const allTables = await client.query(`
      SELECT c.relname AS table_name, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `);
    console.log(`Total public tables: ${allTables.rows.length}`);
    const disabled = allTables.rows.filter(t => !t.relrowsecurity);
    console.log('Tables with relrowsecurity = false:', disabled.map(t => t.table_name));

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

    // 2b. Policies Exist but RLS Disabled (policy_exists_rls_disabled)
    const policyRlsDisabled = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relrowsecurity = false;
    `);
    console.log('\n--- 2b. POLICIES EXIST BUT RLS DISABLED (policy_exists_rls_disabled) ---');
    if (policyRlsDisabled.rows.length === 0) {
      console.log('   None!');
    } else {
      policyRlsDisabled.rows.forEach(r => console.log(`   - ${r.table_name}`));
    }

    // 3. Custom SECURITY DEFINER functions missing search_path (function_search_path_mutable)
    const secDefFuncs = await client.query(`
      SELECT 
        p.proname AS function_name,
        n.nspname AS schema_name,
        p.proconfig AS config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prosecdef = true
        AND n.nspname IN ('public', 'auth', 'extensions')
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
      secDefFuncs.rows.forEach(r => console.log(`   - ${r.schema_name}.${r.function_name} (Config: ${JSON.stringify(r.config)})`));
    }

    // 3b. ALL functions in public schema missing search_path
    const allPublicFuncs = await client.query(`
      SELECT 
        p.proname AS function_name,
        p.prosecdef,
        p.proconfig AS config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND (
          p.proconfig IS NULL 
          OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
          )
        );
    `);
    console.log('\n--- 3b. ALL PUBLIC FUNCTIONS MISSING search_path ---');
    if (allPublicFuncs.rows.length === 0) {
      console.log('   None!');
    } else {
      allPublicFuncs.rows.forEach(r => console.log(`   - ${r.function_name} (secdef: ${r.prosecdef})`));
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

    // 5. Views in public schema (security_definer_view / security_invoker)
    const views = await client.query(`
      SELECT c.relname AS view_name, c.reloptions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v';
    `);
    console.log('\n--- 5. VIEWS IN PUBLIC SCHEMA ---');
    if (views.rows.length === 0) {
      console.log('   None!');
    } else {
      views.rows.forEach(r => console.log(`   - ${r.view_name} (options: ${JSON.stringify(r.reloptions)})`));
    }

    // 6. Materialized views in public schema (materialized_view_in_api)
    const matViews = await client.query(`
      SELECT c.relname AS matview_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'm';
    `);
    console.log('\n--- 6. MATERIALIZED VIEWS IN PUBLIC SCHEMA ---');
    if (matViews.rows.length === 0) {
      console.log('   None!');
    } else {
      matViews.rows.forEach(r => console.log(`   - ${r.matview_name}`));
    }

    // 7. RLS referencing user metadata (rls_references_user_metadata)
    const userMetaPolicies = await client.query(`
      SELECT polname, polrelid::regclass as table_name
      FROM pg_policy
      WHERE polqual::text LIKE '%raw_user_meta_data%' OR polwithcheck::text LIKE '%raw_user_meta_data%';
    `);
    console.log('\n--- 7. RLS REFERENCING raw_user_meta_data (rls_references_user_metadata) ---');
    if (userMetaPolicies.rows.length === 0) {
      console.log('   None!');
    } else {
      userMetaPolicies.rows.forEach(r => console.log(`   - Table: ${r.table_name}, Policy: ${r.polname}`));
    }

    // 8. Inspect kpi_definitions columns
    const kpiCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'kpi_definitions' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('\n--- 8. KPI_DEFINITIONS COLUMNS ---');
    kpiCols.rows.forEach(r => console.log(`   - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));

    // 9. Inspect update_updated_at_column
    const funcDef = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'update_updated_at_column';
    `);
    console.log('\n--- 9. FUNCTION update_updated_at_column ---');
    console.log(funcDef.rows[0]?.pg_get_functiondef);

    // 10. Sample policies on similar tables
    const samplePolicies = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename IN ('forms', 'workflows', 'solution_blueprints');
    `);
    console.log('\n--- 10. SAMPLE POLICIES ---');
    console.log(JSON.stringify(samplePolicies.rows, null, 2));

    // 11. Compare Prisma models to DB
    const fs = await import('fs');
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const mappedTables = Array.from(schema.matchAll(/@@map\("([^"]+)"\)/g)).map(m => m[1]);
    const allDbTableNames = new Set(allTables.rows.map(r => r.table_name));
    
    console.log('\n--- 11. PRISMA SCHEMA vs DB TABLES ---');
    console.log(`Total models with @@map: ${mappedTables.length}`);
    const missing = mappedTables.filter(t => !allDbTableNames.has(t));
    console.log('Tables in schema.prisma but NOT in DB:', missing);

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await client.end();
  }
}

runSecurityAudit();

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function audit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('=== SUPABASE SECURITY ADVISORY AUDIT ===\n');

  // 1. Tables with RLS disabled
  const rlsRes = await client.query(`
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

  const disabled = rlsRes.rows.filter(r => !r.rls_enabled);
  console.log(`[1] Tables with RLS Disabled (${disabled.length}/${rlsRes.rows.length}):`);
  disabled.forEach(r => console.log(`  - ${r.table_name}`));

  // 2. Tables with RLS enabled but no policies
  const noPolicy = rlsRes.rows.filter(r => r.rls_enabled && parseInt(r.policy_count, 10) === 0);
  console.log(`\n[2] Tables with RLS enabled but 0 policies (${noPolicy.length}):`);
  noPolicy.forEach(r => console.log(`  - ${r.table_name}`));

  // 3. Tables with RLS not forced
  const notForced = rlsRes.rows.filter(r => r.rls_enabled && !r.rls_forced);
  console.log(`\n[3] Tables with RLS not forced (${notForced.length}):`);
  notForced.forEach(r => console.log(`  - ${r.table_name}`));

  // 4. Check anon permissions
  const anonRes = await client.query(`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' AND grantee = 'anon'
    ORDER BY table_name, privilege_type;
  `);
  console.log(`\n[4] Anon role table grants (${anonRes.rows.length}):`);
  const anonTables = [...new Set(anonRes.rows.map(r => r.table_name))];
  console.log(`  Tables granting anon access: ${anonTables.length}`);
  if (anonTables.length > 0) {
    console.log(`  ${anonTables.join(', ')}`);
  }

  // 5. Check SECURITY DEFINER functions without search_path
  const funcRes = await client.query(`
    SELECT 
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prosecdef AS is_security_definer,
      p.proconfig AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  const insecureFuncs = funcRes.rows.filter(f => {
    const configs = f.config || [];
    return !configs.some(c => c.startsWith('search_path='));
  });
  console.log(`\n[5] SECURITY DEFINER functions without search_path (${insecureFuncs.length}/${funcRes.rows.length}):`);
  insecureFuncs.forEach(f => console.log(`  - ${f.func_name}(${f.args})`));

  // 6. Check extensions in public schema
  const extRes = await client.query(`
    SELECT e.extname, n.nspname 
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public';
  `);
  console.log(`\n[6] Extensions in public schema (${extRes.rows.length}):`);
  extRes.rows.forEach(e => console.log(`  - ${e.extname}`));

  // 7. Check views without security_invoker
  const viewRes = await client.query(`
    SELECT 
      c.relname AS view_name,
      c.reloptions
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
    ORDER BY c.relname;
  `);
  console.log(`\n[7] Views without security_invoker (${viewRes.rows.length}):`);
  viewRes.rows.forEach(v => console.log(`  - ${v.view_name} (opts: ${v.reloptions})`));

  await client.end();
}

audit().catch(console.error);

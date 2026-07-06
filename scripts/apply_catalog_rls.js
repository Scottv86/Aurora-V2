import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database to apply catalog RLS');
  
  try {
    await client.query(`
      ALTER TABLE "catalog_items" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "catalog_items" FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS tenant_isolation_catalog_items ON "catalog_items";
      CREATE POLICY tenant_isolation_catalog_items ON "catalog_items" FOR ALL USING (has_tenant_access(tenant_id));
    `);
    console.log('Applied tenant isolation policy on catalog_items table successfully!');
  } catch (err) {
    console.error('Error applying catalog RLS:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}
run();

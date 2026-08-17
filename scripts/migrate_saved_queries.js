import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
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

    const sql = `
      CREATE TABLE IF NOT EXISTS "saved_queries" (
          "id" TEXT NOT NULL,
          "tenant_id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "description" TEXT,
          "category" TEXT NOT NULL DEFAULT 'General',
          "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "icon_name" TEXT DEFAULT 'Database',
          "sql" TEXT NOT NULL,
          "parameters" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "columns_config" JSONB NOT NULL DEFAULT '[]'::jsonb,
          "status" TEXT NOT NULL DEFAULT 'DRAFT',
          "cache_ttl_seconds" INTEGER NOT NULL DEFAULT 0,
          "downstream_usages_count" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "saved_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "saved_queries_tenant_id_slug_key" ON "saved_queries"("tenant_id", "slug");
      CREATE INDEX IF NOT EXISTS "saved_queries_tenant_id_idx" ON "saved_queries"("tenant_id");

      ALTER TABLE "saved_queries" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "saved_queries" FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS tenant_isolation_saved_queries ON "saved_queries";
      CREATE POLICY tenant_isolation_saved_queries ON "saved_queries" 
          FOR ALL USING (has_tenant_access(tenant_id));
    `;

    console.log('Applying saved_queries table migration and RLS policies...');
    await client.query(sql);
    console.log('Successfully created saved_queries table with RLS!');

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

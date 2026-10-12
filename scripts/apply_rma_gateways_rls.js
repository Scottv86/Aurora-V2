import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runRls() {
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
      -- Enable RLS and Force RLS on return_requests, return_request_items, payment_gateway_connections
      ALTER TABLE "return_requests" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "return_requests" FORCE ROW LEVEL SECURITY;

      ALTER TABLE "return_request_items" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "return_request_items" FORCE ROW LEVEL SECURITY;

      ALTER TABLE "payment_gateway_connections" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "payment_gateway_connections" FORCE ROW LEVEL SECURITY;

      -- Policies for return_requests
      DROP POLICY IF EXISTS tenant_isolation_return_requests ON "return_requests";
      CREATE POLICY tenant_isolation_return_requests ON "return_requests"
        AS PERMISSIVE FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

      DROP POLICY IF EXISTS service_role_return_requests ON "return_requests";
      CREATE POLICY service_role_return_requests ON "return_requests"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

      -- Policies for return_request_items
      DROP POLICY IF EXISTS tenant_isolation_return_request_items ON "return_request_items";
      CREATE POLICY tenant_isolation_return_request_items ON "return_request_items"
        AS PERMISSIVE FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM "return_requests" r
            WHERE r.id = return_request_items.return_request_id
              AND r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM "return_requests" r
            WHERE r.id = return_request_items.return_request_id
              AND r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
          )
        );

      DROP POLICY IF EXISTS service_role_return_request_items ON "return_request_items";
      CREATE POLICY service_role_return_request_items ON "return_request_items"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

      -- Policies for payment_gateway_connections
      DROP POLICY IF EXISTS tenant_isolation_payment_gateway_connections ON "payment_gateway_connections";
      CREATE POLICY tenant_isolation_payment_gateway_connections ON "payment_gateway_connections"
        AS PERMISSIVE FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

      DROP POLICY IF EXISTS service_role_payment_gateway_connections ON "payment_gateway_connections";
      CREATE POLICY service_role_payment_gateway_connections ON "payment_gateway_connections"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');
    `;

    await client.query(sql);
    console.log('Successfully enabled RLS and applied tenant isolation policies on RMA and Payment Gateway tables');
  } catch (err) {
    console.error('Error applying RLS policies:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRls();

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
      -- Enable RLS and Force RLS on payment_transactions, refunds, refund_items
      ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "payment_transactions" FORCE ROW LEVEL SECURITY;

      ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "refunds" FORCE ROW LEVEL SECURITY;

      ALTER TABLE "refund_items" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "refund_items" FORCE ROW LEVEL SECURITY;

      -- Policies for payment_transactions
      DROP POLICY IF EXISTS tenant_isolation_payment_transactions ON "payment_transactions";
      CREATE POLICY tenant_isolation_payment_transactions ON "payment_transactions"
        AS PERMISSIVE FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

      DROP POLICY IF EXISTS service_role_payment_transactions ON "payment_transactions";
      CREATE POLICY service_role_payment_transactions ON "payment_transactions"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

      -- Policies for refunds
      DROP POLICY IF EXISTS tenant_isolation_refunds ON "refunds";
      CREATE POLICY tenant_isolation_refunds ON "refunds"
        AS PERMISSIVE FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

      DROP POLICY IF EXISTS service_role_refunds ON "refunds";
      CREATE POLICY service_role_refunds ON "refunds"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');

      -- Policies for refund_items (inherits tenant via refund_id)
      DROP POLICY IF EXISTS tenant_isolation_refund_items ON "refund_items";
      CREATE POLICY tenant_isolation_refund_items ON "refund_items"
        AS PERMISSIVE FOR ALL
        USING (EXISTS (
          SELECT 1 FROM refunds r 
          WHERE r.id = refund_items.refund_id 
          AND r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM refunds r 
          WHERE r.id = refund_items.refund_id 
          AND r.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
        ));

      DROP POLICY IF EXISTS service_role_refund_items ON "refund_items";
      CREATE POLICY service_role_refund_items ON "refund_items"
        AS PERMISSIVE FOR ALL
        USING (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role')
        WITH CHECK (current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role');
    `;

    console.log('Applying RLS policies to payment_transactions, refunds, refund_items...');
    await client.query(sql);
    console.log('RLS successfully enabled and secured!');

  } catch (err) {
    console.error('Error enabling RLS:', err);
  } finally {
    await client.end();
  }
}

runRls();

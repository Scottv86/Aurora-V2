import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- APPLYING RLS SECURITY FIXES ---');
  try {
    const tablesWithTenantId = [
      'modules', 
      'records', 
      'parties', 
      'party_relationships', 
      'taxonomies', 
      'tenant_connectors'
    ];

    // 1. Enable RLS and Force RLS for direct tenant_id tables
    for (const table of tablesWithTenantId) {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
      await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS ${table}_isolation ON ${table};`);
      await (prisma as any).$executeRawUnsafe(`
        CREATE POLICY ${table}_isolation ON ${table} 
        FOR ALL 
        USING (
          tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') 
          OR current_setting('app.is_superadmin', true) = 'true'
        );
      `);
      console.log(`Enabled RLS and created policy for ${table}`);
    }

    // 2. Nexus Connectors (Allowing global connectors where tenant_id is NULL)
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE nexus_connectors ENABLE ROW LEVEL SECURITY;`);
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE nexus_connectors FORCE ROW LEVEL SECURITY;`);
    await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS nexus_connectors_isolation ON nexus_connectors;`);
    await (prisma as any).$executeRawUnsafe(`
      CREATE POLICY nexus_connectors_isolation ON nexus_connectors 
      FOR ALL 
      USING (
        tenant_id IS NULL 
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') 
        OR current_setting('app.is_superadmin', true) = 'true'
      );
    `);
    console.log('Enabled RLS and created policy for nexus_connectors');

    // 3. Organizations and Persons (Join via parties)
    const detailTables = ['organizations', 'persons'];
    for (const table of detailTables) {
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      await (prisma as any).$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
      await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS ${table}_isolation ON ${table};`);
      await (prisma as any).$executeRawUnsafe(`
        CREATE POLICY ${table}_isolation ON ${table} 
        FOR ALL 
        USING (
          EXISTS (
            SELECT 1 FROM parties 
            WHERE parties.id = party_id 
            AND (parties.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') 
                 OR current_setting('app.is_superadmin', true) = 'true')
          )
        );
      `);
      console.log(`Enabled RLS and created policy for ${table}`);
    }

    // 4. Tenant Connector Secrets (Join via tenant_connectors)
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE tenant_connector_secrets ENABLE ROW LEVEL SECURITY;`);
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE tenant_connector_secrets FORCE ROW LEVEL SECURITY;`);
    await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_connector_secrets_isolation ON tenant_connector_secrets;`);
    await (prisma as any).$executeRawUnsafe(`
      CREATE POLICY tenant_connector_secrets_isolation ON tenant_connector_secrets 
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM tenant_connectors 
          WHERE tenant_connectors.id = tenant_connector_id 
          AND (tenant_connectors.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') 
               OR current_setting('app.is_superadmin', true) = 'true')
        )
      );
    `);
    console.log('Enabled RLS and created policy for tenant_connector_secrets');

    console.log('--- SECURITY FIX COMPLETED ---');
  } catch (error) {
    console.error('Error applying fixes:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

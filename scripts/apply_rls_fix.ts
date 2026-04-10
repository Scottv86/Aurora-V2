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
    // 1. Enable Force RLS
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE modules FORCE ROW LEVEL SECURITY;`);
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE records FORCE ROW LEVEL SECURITY;`);
    console.log('Enabled FORCE ROW LEVEL SECURITY.');

    // 2. Drop existing policies if any (to avoid conflicts)
    await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS modules_isolation ON modules;`);
    await (prisma as any).$executeRawUnsafe(`DROP POLICY IF EXISTS records_isolation ON records;`);

    // 3. Create Isolation Policies
    await (prisma as any).$executeRawUnsafe(`
      CREATE POLICY modules_isolation ON modules 
      FOR ALL 
      USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID 
        OR current_setting('app.is_superadmin', true) = 'true'
      );
    `);

    await (prisma as any).$executeRawUnsafe(`
      CREATE POLICY records_isolation ON records 
      FOR ALL 
      USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID 
        OR current_setting('app.is_superadmin', true) = 'true'
      );
    `);
    console.log('Created tenant isolation policies.');

    console.log('--- SECURITY FIX COMPLETED ---');
  } catch (error) {
    console.error('Error applying fixes:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

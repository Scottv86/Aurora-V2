import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testRLS(moduleId: string, tenantId: string, userId: string) {
  console.log(`Testing RLS for Module: ${moduleId}, Tenant: ${tenantId}`);
  try {
    const result = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
      
      const mod = await tx.module.findUnique({ where: { id: moduleId } });
      return mod;
    });

    console.log('Result:', result ? 'FOUND' : 'NOT FOUND (RLS BLOCKED)');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Use IDs from the inspection script
const moduleId = 'cmns4prmc0003awn3zvzyamqo';
const tenantId = 'cmna2fqmm00007gn3yxtcq927';
const userId = 'some-user-id'; // RLS might not care about userId for modules if policy only checks tenant

testRLS(moduleId, tenantId, userId);

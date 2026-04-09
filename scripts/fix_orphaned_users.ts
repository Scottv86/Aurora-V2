import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- STARTING ORPHANED USER FIX ---');
  
  try {
    const defaultTenant = await prisma.tenant.findFirst();
    if (!defaultTenant) {
      console.error('ERROR: No tenants found in database. Create a tenant first.');
      return;
    }

    console.log(`Default Tenant for onboarding: ${defaultTenant.name} (${defaultTenant.id})`);

    const users = await prisma.user.findMany({
      include: { memberships: true }
    });

    for (const user of users) {
      if (user.memberships.length === 0 && !user.isSuperAdmin) {
        console.log(`Fixing orphaned user: ${user.email} (${user.id})`);
        
        await prisma.tenantMember.create({
          data: {
            userId: user.id,
            tenantId: defaultTenant.id,
            roleId: 'admin'
          }
        });
        
        console.log(`   -> Associated with ${defaultTenant.name}`);
      } else {
        console.log(`Skipping user: ${user.email} (Already has ${user.memberships.length} memberships or is SuperAdmin)`);
      }
    }

    console.log('--- FIX COMPLETED ---');
  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

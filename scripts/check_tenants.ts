import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tenants = await prisma.tenant.findMany();
    const positions = await prisma.position.findMany();
    const teams = await prisma.team.findMany();

    console.log('--- TENANTS ---');
    console.log(tenants.map(t => t.id));
    
    console.log('\n--- POSITIONS (Tenant ID) ---');
    console.log(positions.map(p => ({ id: p.id, tenantId: p.tenantId })));

    console.log('\n--- TEAMS (Tenant ID) ---');
    console.log(teams.map(t => ({ id: t.id, tenantId: t.tenantId })));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

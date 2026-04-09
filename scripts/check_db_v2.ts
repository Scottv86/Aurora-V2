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
    const users = await prisma.user.findMany();
    const memberships = await prisma.tenantMember.findMany();

    console.log('--- TENANTS ---');
    console.log(JSON.stringify(tenants, null, 2));
    console.log('\n--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('\n--- MEMBERSHIPS ---');
    console.log(JSON.stringify(memberships, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

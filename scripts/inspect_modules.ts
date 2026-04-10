import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- MODULE INSPECTION ---');
  try {
    const modules = await prisma.module.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${modules.length} modules.`);
    modules.forEach(m => {
      console.log(`ID: ${m.id}`);
      console.log(`Name: ${m.name}`);
      console.log(`TenantID: ${m.tenantId}`);
      console.log(`Config ID: ${(m.config as any)?.id}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

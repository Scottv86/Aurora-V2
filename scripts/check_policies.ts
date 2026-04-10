import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- DATABASE RLS POLICIES ---');
  try {
    const policies = await (prisma as any).$queryRawUnsafe("SELECT * FROM pg_policies");
    console.log(JSON.stringify(policies, null, 2));

    const tables = await (prisma as any).$queryRawUnsafe("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'");
    console.log('--- TABLE SECURITY STATUS ---');
    console.table(tables);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- RLS POLICIES ---');
  try {
    const policies = await (prisma as any).$queryRawUnsafe(`
      SELECT policyname, tablename, permissive, roles, cmd, qual, with_check 
      FROM pg_policies
    `);
    
    for (const p of policies) {
      console.log(`Table: ${p.tablename} | Policy: ${p.policyname} | Command: ${p.cmd}`);
      console.log(`  Qual: ${p.qual}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const groups = await prisma.permissionGroup.findMany();
  console.log('---GROUPS---');
  console.log(JSON.stringify(groups, null, 2));
  console.log('---END---');
}

check().catch(console.error).finally(() => prisma.$disconnect());

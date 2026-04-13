import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const members = await prisma.tenantMember.findMany({
    include: {
      user: true,
      tenant: true
    }
  });
  console.log('---MEMBERS---');
  console.log(JSON.stringify(members, null, 2));
  console.log('---END---');
}

check().catch(console.error).finally(() => prisma.$disconnect());

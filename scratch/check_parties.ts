import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const allParties = await prisma.party.findMany({
    select: {
      id: true,
      partyType: true,
      status: true,
      tenantId: true
    }
  });

  console.log('Parties and Statuses:');
  allParties.forEach(p => {
    console.log(`- ID: ${p.id}, Type: ${p.partyType}, Status: ${p.status}, Tenant: ${p.tenantId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getScopedPrisma } from '../server/lib/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = 'org_28XzR0M7D3jE4fG9K1L5P';
  const userId = 'dev-user';
  
  const db = getScopedPrisma(tenantId, userId, false, prisma);
  
  try {
    console.log('Fetching connectors...');
    const [registry, active] = await Promise.all([
      prisma.nexusConnector.findMany({
        where: {
          OR: [
            { tenantId: null },
            { tenantId: tenantId }
          ]
        }
      }),
      db.tenantConnector.findMany({
        where: { tenantId },
        include: {
          secrets: {
            select: {
              secretKey: true,
            }
          }
        }
      })
    ]);
    console.log('Registry count:', registry.length);
    console.log('Active count:', active.length);
  } catch (err: any) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

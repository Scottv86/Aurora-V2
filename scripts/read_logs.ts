import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log('Querying connector_logs...');
  const logs = await prisma.connectorLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  console.log(`Found ${logs.length} log entries.`);
  logs.forEach(log => {
    console.log(`\n================================`);
    console.log(`Log ID: ${log.id}`);
    console.log(`Timestamp: ${log.timestamp}`);
    console.log(`Connector: ${log.connectorName} (${log.connectorId})`);
    console.log(`Status: ${log.status}`);
    console.log(`Payload:`, JSON.stringify(log.payload));
    console.log(`Response:`, JSON.stringify(log.response));
    if (log.errorMessage) {
      console.log(`Error Message:`, log.errorMessage);
    }
  });
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

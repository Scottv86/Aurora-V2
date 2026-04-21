import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("Checking extensions...");
    const extensions = await client.$queryRaw`SELECT extname FROM pg_extension`;
    console.log("Extensions:", extensions);

    console.log("Checking tables...");
    const tables = await client.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log("Tables:", tables);

    console.log("Testing Party query...");
    const count = await client.party.count();
    console.log("Party count:", count);

  } catch (err) {
    console.error("Critical DB Check Failed:", err);
  } finally {
    await client.$disconnect();
    await pool.end();
  }
}

main();

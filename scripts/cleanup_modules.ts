import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- STARTING MODULE DATA CLEANUP ---');
  try {
    const modules = await prisma.module.findMany();
    console.log(`Analyzing ${modules.length} modules...`);

    for (const m of modules) {
      let updated = false;
      const config = (m.config as any) || {};

      // 1. Backfill legacy template IDs if missing
      // If the module name matches a known prebuilt one, we ensure it has the correct ID in config
      if (m.name === 'Inventory Tracker' && !config.id) {
        config.id = 'inventory-tracker';
        updated = true;
      }

      if (updated) {
        console.log(`Updating module: ${m.name} (${m.id}) with templateId: ${config.id}`);
        await prisma.module.update({
          where: { id: m.id },
          data: { config: config as any }
        });
      }
    }

    console.log('--- CLEANUP COMPLETED ---');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

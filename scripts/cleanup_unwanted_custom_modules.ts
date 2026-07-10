import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- STARTING UNWANTED CUSTOM MODULES CLEANUP ---');
  try {
    const modules = await prisma.module.findMany({
      where: {
        isGlobal: false,
        isTemplate: false
      }
    });

    const keepNames = ['Applications', 'Licences', 'Automations'];
    const toDelete = modules.filter(m => !keepNames.includes(m.name));

    console.log(`Found ${modules.length} custom database modules.`);
    console.log(`Identified ${toDelete.length} modules to delete (keeping: ${keepNames.join(', ')}).`);

    for (const m of toDelete) {
      console.log(`Deleting module: ${m.name} (ID: ${m.id})`);
      await prisma.module.delete({
        where: { id: m.id }
      });
      console.log(`Successfully deleted ${m.name}`);
    }

    console.log('--- CLEANUP COMPLETED ---');
  } catch (error) {
    console.error('Error during modules cleanup:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const modules = await prisma.module.findMany({
    select: {
      id: true,
      name: true,
      config: true
    }
  });

  console.log(`Found ${modules.length} modules:`);
  modules.forEach(m => {
    console.log(`\nModule: ${m.name} (${m.id})`);
    const config = m.config as any;
    const layout = config?.layout as any[];
    if (layout) {
      console.log(`Lookups found:`);
      
      const processField = (f: any) => {
        if (f.type === 'lookup') {
          console.log(`- Field: ${f.label} (${f.id})`);
          console.log(`  Source: ${f.lookupSource}`);
          console.log(`  Platform Entity: ${f.platformEntity}`);
          console.log(`  Target Platform Module: ${f.targetPlatformModuleId}`);
          console.log(`  Display Field: ${f.lookupDisplayField}`);
        }
        if (f.fields) f.fields.forEach(processField);
      };

      layout.forEach(processField);
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

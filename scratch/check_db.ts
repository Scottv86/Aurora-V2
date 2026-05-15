import { globalPrisma } from '../server/lib/prisma';

async function check() {
  try {
    const modules = await globalPrisma.module.findMany();
    console.log(`Checking ${modules.length} modules for null configs...`);
    for (const m of modules) {
      if (!m.config) {
        console.log(` - [${m.id}] ${m.name} has NULL config!`);
      } else {
        console.log(` - [${m.id}] ${m.name} config OK`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await globalPrisma.$disconnect();
  }
}

check();

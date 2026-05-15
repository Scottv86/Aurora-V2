const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.record.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      moduleId: true,
      status: true,
      workflowState: true,
      createdAt: true
    }
  });

  console.log('Last 5 records:');
  console.log(JSON.stringify(records, null, 2));

  const modules = await prisma.module.findMany({
    select: {
      id: true,
      name: true,
      config: true
    }
  });

  console.log('\nModules with workflows:');
  modules.forEach(m => {
    const config = m.config;
    const workflow = config.workflow || (config.workflows && config.workflows[0]);
    if (workflow) {
      console.log(`- ${m.name} (${m.id}): Workflow found`);
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const records = await prisma.record.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      moduleId: true,
      workflowState: true
    }
  });

  if (records.length > 0) {
    const record = records[0];
    console.log('Last record workflow state:');
    console.log(JSON.stringify(record.workflowState, null, 2));

    const module = await prisma.module.findUnique({
      where: { id: record.moduleId },
      select: { config: true }
    });

    if (module) {
      const config = module.config;
      const workflow = config.workflow || (config.workflows && config.workflows[0]);
      if (workflow) {
        console.log('\nWorkflow Nodes:');
        workflow.nodes.forEach(n => console.log(`- ${n.id}: ${n.name}`));
        console.log('\nWorkflow Edges:');
        workflow.edges.forEach(e => console.log(`- ${e.source} -> ${e.target}`));
      } else {
        console.log('\nNo workflow found in module config');
        console.log('Config keys:', Object.keys(config));
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

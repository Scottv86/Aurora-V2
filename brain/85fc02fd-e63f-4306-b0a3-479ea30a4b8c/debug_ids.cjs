const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the last record and its module
  const record = await prisma.record.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      moduleId: true,
      workflowState: true,
      status: true
    }
  });

  if (!record) {
    console.log('No records found');
    return;
  }

  console.log('--- Record Info ---');
  console.log('ID:', record.id);
  console.log('Status:', record.status);
  console.log('CurrentNodeId:', record.workflowState?.currentNodeId);

  const module = await prisma.module.findUnique({
    where: { id: record.moduleId },
    select: { config: true, name: true }
  });

  if (!module) {
    console.log('Module not found');
    return;
  }

  console.log('\n--- Module Info ---');
  console.log('Name:', module.name);
  const config = module.config;
  const workflow = config.workflow || (config.workflows && config.workflows[0]);

  if (!workflow) {
    console.log('No workflow found in module config');
    return;
  }

  console.log('\n--- Workflow Nodes ---');
  workflow.nodes.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${n.name}, Type: ${n.type}`);
  });

  console.log('\n--- Workflow Edges ---');
  workflow.edges.forEach(e => {
    console.log(`- Source: ${e.source}, Target: ${e.target}, ID: ${e.id}`);
  });

  const currentNodeId = record.workflowState?.currentNodeId;
  const matchingEdges = workflow.edges.filter(e => e.source === currentNodeId);
  console.log(`\nMatching Edges for ${currentNodeId}: ${matchingEdges.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

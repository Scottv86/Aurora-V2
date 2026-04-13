import { globalPrisma } from '../server/lib/prisma';
const prisma = globalPrisma;

async function main() {
  const teamId = 'cmntukn5b00004on3dulsniea';
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tenant: true }
  });
  
  console.log('--- Team Debug ---');
  if (team) {
    console.log('ID:', team.id);
    console.log('Name:', team.name);
    console.log('Tenant ID:', team.tenantId);
    console.log('Tenant Name:', team.tenant.name);
  } else {
    console.log('Team NOT FOUND in database.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

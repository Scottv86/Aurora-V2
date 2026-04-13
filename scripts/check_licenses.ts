import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.tenantMember.findMany({
    include: {
      user: true,
      tenant: true
    }
  });

  console.log('--- Tenant Members ---');
  members.forEach(m => {
    console.log(`User: ${m.user?.email || 'N/A'}, Tenant: ${m.tenant.name}, Licence: ${m.licenceType}, Role: ${m.roleId}`);
  });
}

main().catch(console.error);

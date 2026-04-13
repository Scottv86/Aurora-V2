import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  console.log('---TENANT_DATA---');
  console.log(JSON.stringify(tenant, null, 2));
  console.log('---END_TENANT_DATA---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

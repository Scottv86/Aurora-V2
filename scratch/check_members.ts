import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.tenantMember.findMany({
    include: {
      user: true,
      agent: true,
      team: true
    }
  });

  console.log(JSON.stringify(members, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

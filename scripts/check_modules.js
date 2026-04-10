
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const modules = await prisma.module.findMany();
  console.log(JSON.stringify(modules, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

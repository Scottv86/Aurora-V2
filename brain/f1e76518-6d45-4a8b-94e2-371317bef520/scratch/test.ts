import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const modules = await prisma.module.findMany();
  console.log('Modules in DB:', modules);
  
  const records = await prisma.record.findMany();
  console.log('Records in DB:', records);
}
test();

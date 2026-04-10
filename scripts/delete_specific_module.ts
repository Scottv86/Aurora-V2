
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const id = 'cmnsg2qgt00007wn3mohxmfnn';
  console.log(`Attempting to delete module: ${id}`);
  
  try {
    const deleted = await prisma.module.delete({
      where: { id }
    });
    console.log('Successfully deleted module:', deleted.name, `(${deleted.id})`);
  } catch (err: any) {
    if (err.code === 'P2025') {
      console.log('Module not found or already deleted.');
    } else {
      console.error('Error deleting module:', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

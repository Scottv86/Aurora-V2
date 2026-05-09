import { globalPrisma } from '../server/lib/prisma';
import 'dotenv/config';

async function findOwner() {
  try {
    const owner = await globalPrisma.user.findFirst({
      where: { 
        OR: [
          { id: 'cmnx01rep0004mon306glp8ew' },
          { id: 'cmnx01rwy0005mon3odt6ggsc' }
        ]
      }
    });
    console.log('--- OWNER DATA FROM DB ---');
    console.log(JSON.stringify(owner, null, 2));
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

findOwner().finally(() => globalPrisma.$disconnect());

import { globalPrisma } from '../server/lib/prisma';
import 'dotenv/config';

async function findUser() {
  try {
    const user = await globalPrisma.user.findFirst({
      where: { email: 'user1.acme@aurora.com' }
    });
    console.log('--- USER DATA FROM DB ---');
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

findUser().finally(() => globalPrisma.$disconnect());

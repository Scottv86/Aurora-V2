import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const res = await prisma.user.updateMany({
      where: {
        email: {
          in: ['scottv86@gmail.com', 'scott@scottvallely.com']
        }
      },
      data: {
        isSuperAdmin: true
      }
    });
    console.log('Promoted users:', res);

    const users = await prisma.user.findMany({
      include: { memberships: true }
    });
    console.log('\n--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

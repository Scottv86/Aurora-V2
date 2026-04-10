import 'dotenv/config';
import { globalPrisma } from '../server/lib/prisma';

async function inspect() {
  try {
    const tables = await globalPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables:', tables);

    const userCols = await globalPrisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('users', 'User')
      ORDER BY table_name, ordinal_position
    `;
    console.log('Columns for users/User:', userCols);

  } catch (err) {
    console.error(err);
  } finally {
    await globalPrisma.$disconnect();
  }
}

inspect();

import { globalPrisma } from '../server/lib/prisma';
import 'dotenv/config';

async function checkField() {
  try {
    const field = await globalPrisma.moduleField.findFirst({
      where: { fieldId: 'field-tf0c10n7m' }
    });
    console.log('--- FIELD CONFIG ---');
    console.log(JSON.stringify(field, null, 2));
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

checkField().finally(() => globalPrisma.$disconnect());

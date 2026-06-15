import { globalPrisma } from '../server/lib/prisma';

async function main() {
  const recordId = 'cmop73ulw0001j8n3vrgt45xh';
  try {
    const record = await globalPrisma.record.findUnique({
      where: { id: recordId }
    });
    if (!record) {
      console.log('Record not found');
      return;
    }
    console.log('Record Module ID:', record.moduleId);

    const module = await globalPrisma.module.findUnique({
      where: { id: record.moduleId }
    });
    if (!module) {
      console.log('Module not found');
      return;
    }

    console.log('Module Name:', module.name);
    const config = module.config as any;
    console.log('Validation Rules:', JSON.stringify(config?.validationRules || [], null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await globalPrisma.$disconnect();
  }
}

main();

import { globalPrisma } from '../server/lib/prisma';

async function main() {
  const moduleId = 'cmom9i9z20000p4n3a7e1fs2c';
  const targetRuleId = 'rule-1781476845282';

  try {
    const module = await globalPrisma.module.findUnique({
      where: { id: moduleId }
    });
    if (!module) {
      console.log('Module not found');
      return;
    }

    const config = module.config as any;
    if (!config || !config.validationRules) {
      console.log('No validation rules found in config');
      return;
    }

    let updated = false;
    const validationRules = config.validationRules.map((rule: any) => {
      if (rule.id === targetRuleId) {
        console.log('Updating rule:', rule.name);
        rule.expression = 'NOT({warning_tester})';
        updated = true;
      }
      return rule;
    });

    if (updated) {
      await globalPrisma.module.update({
        where: { id: moduleId },
        data: {
          config: {
            ...config,
            validationRules
          }
        }
      });
      console.log('SUCCESS: Module validation rules updated!');
    } else {
      console.log('Rule not found inside module config');
    }

  } catch (error) {
    console.error('Error during database update:', error);
  } finally {
    await globalPrisma.$disconnect();
  }
}

main();

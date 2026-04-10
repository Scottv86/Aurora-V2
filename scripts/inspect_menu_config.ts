
import { globalPrisma } from '../server/lib/prisma';

async function main() {
  console.log('--- Deep Scan for "Document Studio" ---');
  const tenants = await globalPrisma.tenant.findMany({});
  const members = await globalPrisma.tenantMember.findMany({
    include: { user: true }
  });

  let found = false;

  const checkConfig = (config: any, context: string) => {
    if (!config || !config.sections) return;
    config.sections.forEach((section: any) => {
      section.items.forEach((item: any) => {
        if (item.label && item.label.includes('Document Studio')) {
          console.log(`FOUND in ${context}: Section "${section.title}", Item "${item.label}" (ID: ${item.id})`);
          found = true;
        }
      });
    });
  };

  tenants.forEach(t => checkConfig(t.menuConfig, `Tenant ${t.id} (${t.name})`));
  members.forEach(m => checkConfig(m.menuConfig, `Member ${m.user.email} (Tenant: ${m.tenantId})`));

  if (!found) {
    console.log('No instances of "Document Studio" found in any menu_config labels.');
    
    console.log('\nChecking for "Docs" since that might be the target...');
    tenants.forEach(t => {
      if (JSON.stringify(t.menuConfig).includes('"Docs"')) {
        console.log(`Found "Docs" in Tenant ${t.name}`);
      }
    });
    members.forEach(m => {
       if (JSON.stringify(m.menuConfig).includes('"Docs"')) {
        console.log(`Found "Docs" in Member ${m.user.email}`);
      }
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {});

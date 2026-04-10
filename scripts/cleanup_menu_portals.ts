import { globalPrisma as prisma } from '../server/lib/prisma';

async function main() {
  // Clean TenantMembers
  const members = await prisma.tenantMember.findMany({
    where: { menuConfig: { not: null } }
  });

  for (const member of members) {
    let config = member.menuConfig as any;
    if (config && config.sections) {
      config.sections = config.sections.map((sec: any) => ({
        ...sec,
        items: sec.items ? sec.items.filter((item: any) => item.id !== 'portals') : []
      }));
      await prisma.tenantMember.update({
        where: { id: member.id },
        data: { menuConfig: config }
      });
      console.log(`Cleaned Portals from user ${member.userId}`);
    }
  }

  // Clean Tenants
  const tenants = await prisma.tenant.findMany({
    where: { menuConfig: { not: null } }
  });

  for (const tenant of tenants) {
    let config = tenant.menuConfig as any;
    if (config && config.sections) {
      config.sections = config.sections.map((sec: any) => ({
        ...sec,
        items: sec.items ? sec.items.filter((item: any) => item.id !== 'portals') : []
      }));
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { menuConfig: config }
      });
      console.log(`Cleaned Portals from tenant ${tenant.id}`);
    }
  }

  console.log('Cleanup complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

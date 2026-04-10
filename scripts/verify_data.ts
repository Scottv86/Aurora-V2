import { globalPrisma as prisma } from '../server/lib/prisma';

async function main() {
  console.log('--- Verifying Data ---');
  
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });

  console.log(`Total Users: ${users.length}`);
  users.forEach(u => {
    console.log(`\nUser: ${u.email} (SuperAdmin: ${u.isSuperAdmin})`);
    u.memberships.forEach(m => {
      console.log(`  - Tenant: ${m.tenant.name} (${m.tenant.subdomain}) | Role: ${m.roleId}`);
    });
  });

  const tenants = await prisma.tenant.findMany();
  console.log(`\nTotal Tenants: ${tenants.length}`);
  tenants.forEach(t => console.log(`- ${t.name} (${t.subdomain})`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { globalPrisma as prisma } from '../server/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });

  console.log('--- ALL USERS ---');
  users.forEach(u => {
    console.log(`Email: ${u.email} | ID: ${u.id} | isSuper: ${u.isSuperAdmin}`);
    u.memberships.forEach(m => {
      console.log(`  -> Member of ${m.tenant.subdomain} | License: ${m.licenceType} | Role: ${m.roleId}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

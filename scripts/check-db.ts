import { globalPrisma } from '../server/lib/prisma';

async function checkDb() {
  const prisma = globalPrisma;
  try {
    const tenantCount = await prisma.tenant.count();
    const userCount = await prisma.user.count();
    const membershipCount = await prisma.tenantMember.count();
    const workspaceCount = await prisma.workspace.count();

    console.log('Database Status:');
    console.log(`- Tenants: ${tenantCount}`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Memberships: ${membershipCount}`);
    console.log(`- Workspaces: ${workspaceCount}`);

    if (tenantCount > 0) {
      const firstTenant = await prisma.tenant.findFirst();
      console.log('First Tenant:', JSON.stringify(firstTenant, null, 2));
    }

    if (userCount > 0) {
      const firstUser = await prisma.user.findFirst({ include: { memberships: true } });
      console.log('First User:', JSON.stringify(firstUser, null, 2));
    }

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();

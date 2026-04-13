import { globalPrisma } from '../server/lib/prisma';

async function checkUser() {
  const email = 'user1.acme@aurora.com';
  const user = await globalPrisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });

  if (!user) {
    console.log(`User ${email} not found`);
    return;
  }

  console.log('User:', {
    id: user.id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin
  });

  user.memberships.forEach(m => {
    console.log('Membership:', {
      tenant: m.tenant.name,
      roleId: m.roleId,
      licenceType: m.licenceType,
      status: m.status,
      hasMenuConfig: !!m.menuConfig
    });
    if (m.menuConfig) {
      console.log('MenuConfig structure:', JSON.stringify(m.menuConfig, null, 2).substring(0, 500));
    }
  });

  await globalPrisma.$disconnect();
}

checkUser();

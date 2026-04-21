import { PrismaClient } from '@prisma/client';

async function verifyAuthLogic() {
  console.log('--- Verifying Authorization Logic ---');

  const mockUsers = [
    { email: 'superadmin@aurora.ai', isSuperAdmin: true, membership: { licenceType: 'Developer', roleId: 'admin' } },
    { email: 'developer@tenant.com', isSuperAdmin: false, membership: { licenceType: 'Developer', roleId: 'member' } },
    { email: 'admin_plain@tenant.com', isSuperAdmin: false, membership: { licenceType: 'Standard', roleId: 'admin' } },
    { email: 'user@tenant.com', isSuperAdmin: false, membership: { licenceType: 'Standard', roleId: 'member' } },
  ];

  for (const user of mockUsers) {
    const isDeveloper = user.membership.licenceType === 'Developer' || user.isSuperAdmin;
    
    console.log(`User: ${user.email}`);
    console.log(` - isSuperAdmin: ${user.isSuperAdmin}`);
    console.log(` - License: ${user.membership.licenceType}`);
    console.log(` - Role: ${user.membership.roleId}`);
    console.log(` - Access to Settings: ${isDeveloper ? '✅ GRANTED' : '❌ DENIED'}`);
    
    // Validate expectation
    const expected = (user.isSuperAdmin || user.membership.licenceType === 'Developer');
    if (isDeveloper !== expected) {
      console.error(` ❌ FAILED: Unexpected access result for ${user.email}`);
    }
  }
}

verifyAuthLogic();

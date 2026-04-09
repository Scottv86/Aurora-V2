import { globalPrisma, getScopedPrisma } from '../server/lib/prisma';
import 'dotenv/config';

async function testRLS() {
  console.log('--- RLS VERIFICATION TEST ---');

  // 1. Setup Test Data
  const timestamp = Date.now();
  const tenantA = await globalPrisma.tenant.create({
    data: { name: `Tenant A ${timestamp}`, subdomain: `tenant-a-${timestamp}` }
  });
  const tenantB = await globalPrisma.tenant.create({
    data: { name: `Tenant B ${timestamp}`, subdomain: `tenant-b-${timestamp}` }
  });

  const userA = await globalPrisma.user.create({
    data: { id: `user-a-${timestamp}`, email: `user-a-${timestamp}@test.com` }
  });
  const userB = await globalPrisma.user.create({
    data: { id: `user-b-${timestamp}`, email: `user-b-${timestamp}@test.com` }
  });

  await globalPrisma.tenantMember.create({
    data: { userId: userA.id, tenantId: tenantA.id, roleId: 'admin' }
  });
  await globalPrisma.tenantMember.create({
    data: { userId: userB.id, tenantId: tenantB.id, roleId: 'member' }
  });

  const workspaceA = await globalPrisma.workspace.create({
    data: { name: 'A Workspace', tenantId: tenantA.id }
  });
  const workspaceB = await globalPrisma.workspace.create({
    data: { name: 'B Workspace', tenantId: tenantB.id }
  });

  console.log('Test data created.');

  // 2. Test Tenant A Context
  console.log('\n--- Testing Tenant A Context ---');
  const dbA = getScopedPrisma(tenantA.id, userA.id, false);
  const workspacesForA = await dbA.workspace.findMany();
  console.log(`Workspaces found for A: ${workspacesForA.length}`);
  workspacesForA.forEach(w => console.log(` - ${w.name} (tenant: ${w.tenantId})`));

  if (workspacesForA.some(w => w.tenantId !== tenantA.id)) {
    console.error('FAIL: Tenant A saw data from another tenant!');
  } else if (workspacesForA.length === 0) {
    console.warn('WARN: Tenant A saw nothing (might be correct if isolation is working but expected data is missing)');
  }

  // 3. Test Tenant B Context
  console.log('\n--- Testing Tenant B Context ---');
  const dbB = getScopedPrisma(tenantB.id, userB.id, false);
  const workspacesForB = await dbB.workspace.findMany();
  console.log(`Workspaces found for B: ${workspacesForB.length}`);
  workspacesForB.forEach(w => console.log(` - ${w.name} (tenant: ${w.tenantId})`));

  if (workspacesForB.some(w => w.tenantId !== tenantB.id)) {
    console.error('FAIL: Tenant B saw data from another tenant!');
  }

  // 4. Test Cross-Tenant Access (Should Fail/Empty)
  console.log('\n--- Testing Cross-Tenant Access (User A trying to see Tenant B via Scoped A client) ---');
  // If we manually try to filter by B while context is A, RLS should return 0 results.
  const crossTenant = await dbA.workspace.findMany({
    where: { tenantId: tenantB.id }
  });
  console.log(`Cross-tenant results (User A looking for B): ${crossTenant.length}`);
  if (crossTenant.length > 0) {
    console.error('FAIL: Cross-tenant leakage detected!');
  } else {
    console.log('SUCCESS: Cross-tenant access denied by RLS.');
  }

  // 5. Cleanup
  console.log('\nCleaning up test data...');
  // Since we are super admins of the "process", we can use globalPrisma to delete everything.
  // Actually, I'll just leave it if it's a dev db, but it's better to clean.
  await globalPrisma.workspace.deleteMany({ where: { id: { in: [workspaceA.id, workspaceB.id] } } });
  await globalPrisma.tenantMember.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await globalPrisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  await globalPrisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });

  console.log('Done.');
}

testRLS().catch(console.error);

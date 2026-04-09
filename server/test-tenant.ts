import { spawnTenant } from './services/provisioner';
import { globalPrisma, getScopedPrisma } from './lib/prisma';

async function testProvisioning() {
  console.log('🚀 Starting Multi-tenancy Verification...');

  try {
    // 1. Test Spawning a Tenant
    const suffix = Math.random().toString(36).substring(2, 7);
    console.log('--- Phase 1: Spawning Tenant "Acme Corp" ---');
    const result = await spawnTenant({
      name: `Acme Corp ${suffix}`,
      subdomain: `acme-${suffix}`,
      adminEmail: `admin-${suffix}@acme.com`,
      plan: 'pro'
    });

    console.log('✅ Tenant spawned successfully:', result.tenant.id);
    console.log('✅ Workspace created:', result.workspace.id);
    console.log('✅ Admin user created:', result.admin.id);

    // 2. Test Scoped Data Access (Logical Isolation)
    console.log('\n--- Phase 2: Testing Scoped Data Isolation ---');
    const scopedDb = getScopedPrisma(result.tenant.id, result.admin.id);

    // Create a module for Acme
    const module = await scopedDb.module.create({
      data: {
        name: 'Inventory Tracker',
        workspaceId: result.workspace.id,
        tenantId: result.tenant.id,
        config: { sections: [] } // Native JSON object for Postgres
      }
    });
    console.log('✅ Module created for Acme:', module.id);

    // Try to find modules for Acme (should find 1)
    const acmeModules = await scopedDb.module.findMany();
    console.log('🔍 Acme Modules found via Scoped DB:', acmeModules.length);

    // 3. Test Cross-Tenant Leakage Prevention
    console.log('\n--- Phase 3: Testing Data Leakage Prevention ---');
    
    // Create another tenant "Globex"
    const globexSuffix = Math.random().toString(36).substring(2, 7);
    const globex = await spawnTenant({
      name: `Globex ${globexSuffix}`,
      subdomain: `globex-${globexSuffix}`,
      adminEmail: `admin-${globexSuffix}@globex.com`
    });
    console.log('✅ Tenant spawned: Globex');

    // Scoped DB for Globex
    const globexDb = getScopedPrisma(globex.tenant.id, globex.admin.id);

    // Find modules for Globex (should find 0, NOT see Acme's module)
    const globexModules = await globexDb.module.findMany();
    console.log('🔍 Globex Modules found via Scoped DB:', globexModules.length);

    if (globexModules.length === 0) {
      console.log('🛡️  SUCCESS: Data leakage prevention confirmed (Globex cannot see Acme)');
    } else {
      console.error('❌ FAILURE: Data leakage detected!');
    }

    // 4. Verify Global Registry still works
    console.log('\n--- Phase 4: Global Registry Check ---');
    const allTenants = await globalPrisma.tenant.findMany();
    console.log('🔍 Total Tenants in Global Registry:', allTenants.length);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await globalPrisma.$disconnect();
  }
}

testProvisioning();

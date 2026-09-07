import { resolveAIFeatureAccess } from '../server/lib/aiPermissions';

async function runTests() {
  console.log('=== AI Feature Governance Precedence Resolution Tests ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, actual?: any) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, actual);
    }
  }

  // Test 1: User Override DENY takes precedence over everything
  const mockDb1 = {
    user: { findUnique: async () => ({ isSuperAdmin: false }) },
    tenantMember: {
      findFirst: async () => ({
        aiOverrides: { 'ai:antigravity_agent': 'DENY' },
        team: { name: 'Engineering', aiOverrides: { 'ai:antigravity_agent': 'ALLOW' } },
        permissionGroups: []
      })
    },
    tenantAIMapping: { findUnique: async () => ({ featureDefaults: { 'ai:antigravity_agent': true } }) }
  };
  const res1 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-1',
    featureKey: 'ai:antigravity_agent',
    db: mockDb1
  });
  assert(res1.allowed === false && res1.level === 'MEMBER', 'User Override DENY wins over all ALLOWs', res1);

  // Test 2: User Override ALLOW wins even when Tenant Default is false
  const mockDb2 = {
    user: { findUnique: async () => ({ isSuperAdmin: false }) },
    tenantMember: {
      findFirst: async () => ({
        aiOverrides: { 'ai:form_builder': 'ALLOW' },
        team: { name: 'Engineering', aiOverrides: { 'ai:form_builder': 'DENY' } },
        permissionGroups: []
      })
    },
    tenantAIMapping: { findUnique: async () => ({ featureDefaults: { 'ai:form_builder': false } }) }
  };
  const res2 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-2',
    featureKey: 'ai:form_builder',
    db: mockDb2
  });
  assert(res2.allowed === true && res2.level === 'MEMBER', 'User Override ALLOW wins over Team DENY & Tenant false', res2);

  // Test 3: Team Override DENY wins when User is INHERIT
  const mockDb3 = {
    user: { findUnique: async () => ({ isSuperAdmin: false }) },
    tenantMember: {
      findFirst: async () => ({
        aiOverrides: {},
        team: { name: 'Support', aiOverrides: { 'ai:smart_inbox': 'DENY' } },
        permissionGroups: []
      })
    },
    tenantAIMapping: { findUnique: async () => ({ featureDefaults: { 'ai:smart_inbox': true } }) }
  };
  const res3 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-3',
    featureKey: 'ai:smart_inbox',
    db: mockDb3
  });
  assert(res3.allowed === false && res3.level === 'TEAM', 'Team Override DENY wins when User is INHERIT', res3);

  // Test 4: Tenant Default fallback when member has no overrides
  const mockDb4 = {
    user: { findUnique: async () => ({ isSuperAdmin: false }) },
    tenantMember: {
      findFirst: async () => ({
        aiOverrides: {},
        team: null,
        permissionGroups: []
      })
    },
    tenantAIMapping: { findUnique: async () => ({ featureDefaults: { 'ai:report_generator': false } }) }
  };
  const res4 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-4',
    featureKey: 'ai:report_generator',
    db: mockDb4
  });
  assert(res4.allowed === false && res4.level === 'TENANT', 'Falls back to Tenant Default (false)', res4);

  // Test 5: System Default fallback (true) when no tenant mapping exists
  const mockDb5 = {
    user: { findUnique: async () => ({ isSuperAdmin: false }) },
    tenantMember: {
      findFirst: async () => null
    },
    tenantAIMapping: { findUnique: async () => null }
  };
  const res5 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-5',
    featureKey: 'ai:record_summary',
    db: mockDb5
  });
  assert(res5.allowed === true && res5.level === 'SYSTEM', 'Falls back to System Default (true)', res5);

  // Test 6: SuperAdmin bypass
  const mockDb6 = {
    user: { findUnique: async () => ({ isSuperAdmin: true }) }
  };
  const res6 = await resolveAIFeatureAccess({
    tenantId: 'tenant-1',
    userId: 'user-superadmin',
    featureKey: 'ai:antigravity_agent',
    db: mockDb6
  });
  assert(res6.allowed === true && res6.level === 'SUPERADMIN', 'SuperAdmin bypass grants full access', res6);

  console.log(`\nTests Completed: ${passed}/${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});

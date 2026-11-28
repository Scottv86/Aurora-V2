import assert from 'node:assert/strict';
import {
  isUserAuthorizedForModuleAction,
  buildRowScopeWhere,
  isRecordWithinRowScope,
} from '../server/routes/dataRoutes';
import {
  isUserAuthorizedForModule as uiIsUserAuthorizedForModule,
  getFieldSecurityPermission,
} from '../src/utils/fieldSecurity';

console.log('Running Aurora RBAC End-to-End Enforcement Verification...');

const mockModule = {
  id: 'mod_permits',
  name: 'Building Permits',
  config: {},
};

const restrictedUser = {
  uid: 'u_worker_1',
  memberId: 'mem_worker_1',
  teamId: 'team_inspections',
  role: 'staff',
  isSuperAdmin: false,
  permissionGroupIds: ['role_case_worker'],
  effectivePolicies: {
    capabilities: ['create:records'],
    hasExplicitModulePolicies: true,
    modulePolicies: {
      mod_permits: {
        access: true,
        read: true,
        create: true,
        update: true,
        delete: false,
        export: false,
        rowScope: 'OWNED' as const,
        fields: {
          ssn: { visibility: 'hidden' as const },
          taxId: { visibility: 'masked' as const },
          approvedAmount: { visibility: 'readonly' as const },
        },
      },
      mod_secret: {
        access: false,
        read: false,
        create: false,
        update: false,
        delete: false,
        export: false,
        rowScope: 'ALL' as const,
        fields: {},
      },
    },
    workflowPolicies: {
      allowedQueueIds: ['q_permits'],
      allowedWorkflowIds: [],
      allowedTransitions: {},
      canApprove: true,
      maxApprovalAmount: 5000,
    },
    aiPolicies: {
      'ai:agent_builder': 'DENY' as const,
      'ai:record_summary': 'ALLOW' as const,
    },
  },
};

// 1. Verb-Level CRUD Enforcement
assert.equal(isUserAuthorizedForModuleAction(restrictedUser, mockModule, 'read'), true);
assert.equal(isUserAuthorizedForModuleAction(restrictedUser, mockModule, 'create'), true);
assert.equal(isUserAuthorizedForModuleAction(restrictedUser, mockModule, 'delete'), false);
assert.equal(isUserAuthorizedForModuleAction(restrictedUser, mockModule, 'export'), false);
assert.equal(isUserAuthorizedForModuleAction(restrictedUser, { id: 'mod_secret', config: {} }, 'read'), false);

// 2. Row-Level Scoping (OWNED)
const ownedWhere = buildRowScopeWhere(restrictedUser, 'mod_permits');
assert.deepEqual(ownedWhere, { createdByMemberId: 'mem_worker_1' });
assert.equal(isRecordWithinRowScope(restrictedUser, { moduleId: 'mod_permits', createdByMemberId: 'mem_worker_1' }), true);
assert.equal(isRecordWithinRowScope(restrictedUser, { moduleId: 'mod_permits', createdByMemberId: 'mem_other' }), false);

// 3. Row-Level Scoping (TEAM)
const teamUser = structuredClone(restrictedUser);
teamUser.effectivePolicies.modulePolicies.mod_permits.rowScope = 'TEAM' as any;
assert.deepEqual(buildRowScopeWhere(teamUser, 'mod_permits'), { createdByMember: { teamId: 'team_inspections' } });
assert.equal(
  isRecordWithinRowScope(teamUser, { moduleId: 'mod_permits', createdByMemberId: 'mem_other', createdByMember: { teamId: 'team_inspections' } }),
  true
);
assert.equal(
  isRecordWithinRowScope(teamUser, { moduleId: 'mod_permits', createdByMemberId: 'mem_other', createdByMember: { teamId: 'team_finance' } }),
  false
);

// 4. SuperAdmin & Admin Bypass
const adminUser = { ...restrictedUser, isSuperAdmin: true };
assert.equal(isUserAuthorizedForModuleAction(adminUser, { id: 'mod_secret', config: {} }, 'delete'), true);
assert.deepEqual(buildRowScopeWhere(adminUser, 'mod_permits'), {});

// 5. Frontend Unified fieldSecurity.ts Resolver
assert.equal(uiIsUserAuthorizedForModule(restrictedUser, mockModule), true);
assert.equal(uiIsUserAuthorizedForModule(restrictedUser, { id: 'mod_secret', config: {} }), false);

assert.deepEqual(getFieldSecurityPermission('ssn', mockModule, restrictedUser), {
  read: false,
  write: false,
  masked: false,
  hidden: true,
});
assert.deepEqual(getFieldSecurityPermission('taxId', mockModule, restrictedUser), {
  read: true,
  write: false,
  masked: true,
  hidden: false,
});
assert.deepEqual(getFieldSecurityPermission('approvedAmount', mockModule, restrictedUser), {
  read: true,
  write: false,
  masked: false,
  hidden: false,
});
assert.deepEqual(getFieldSecurityPermission('title', mockModule, restrictedUser), {
  read: true,
  write: true,
  masked: false,
  hidden: false,
});

console.log('✅ ALL RBAC ENFORCEMENT & FIELD-SECURITY ASSERTIONS PASSED!');

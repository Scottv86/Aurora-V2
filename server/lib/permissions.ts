import { globalPrisma } from './prisma';

export type RowScope = 'ALL' | 'TEAM' | 'OWNED';
export type FieldVisibility = 'editable' | 'readonly' | 'masked' | 'hidden';
export type AIPolicyDecision = 'ALLOW' | 'DENY' | 'INHERIT';

export interface ResolvedModulePolicy {
  access: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  rowScope: RowScope;
  fields: Record<string, { visibility: FieldVisibility }>;
}

export interface ResolvedWorkflowPolicy {
  allowedQueueIds: string[];
  allowedWorkflowIds: string[];
  allowedTransitions: Record<string, string[]>;
  canApprove: boolean;
  maxApprovalAmount: number | null;
}

export interface EffectivePolicies {
  capabilities: string[];
  modulePolicies: Record<string, ResolvedModulePolicy>;
  workflowPolicies: ResolvedWorkflowPolicy;
  aiPolicies: Record<string, AIPolicyDecision>;
  hasExplicitModulePolicies: boolean;
}

const ROW_SCOPE_RANK: Record<RowScope, number> = {
  OWNED: 1,
  TEAM: 2,
  ALL: 3,
};

const FIELD_VISIBILITY_RANK: Record<FieldVisibility, number> = {
  hidden: 1,
  masked: 2,
  readonly: 3,
  editable: 4,
};

/**
 * Checks whether setting `candidateParentId` as the parent of `groupId` would form a cycle.
 */
export const hasCircularInheritance = async (
  groupId: string,
  candidateParentId: string | null | undefined,
  tenantId: string
): Promise<boolean> => {
  if (!candidateParentId) return false;
  if (candidateParentId === groupId) return true;

  const visited = new Set<string>([groupId]);
  let currentId: string | null | undefined = candidateParentId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    const parent = await globalPrisma.permissionGroup.findFirst({
      where: { id: currentId, tenantId },
      select: { parentGroupId: true },
    });
    currentId = parent?.parentGroupId;
  }

  return false;
};

/**
 * Fetches a single role's full inheritance chain ordered from root ancestor -> target role.
 */
export const fetchInheritanceChain = async (roleId: string, tenantId: string) => {
  const chain: any[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = roleId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const group = await globalPrisma.permissionGroup.findFirst({
      where: { id: currentId, tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        capabilities: true,
        modulePolicies: true,
        workflowPolicies: true,
        aiPolicies: true,
        parentGroupId: true,
      },
    });
    if (!group) break;
    chain.unshift(group); // root ancestor first, child last
    currentId = group.parentGroupId;
  }

  return chain;
};

/**
 * Recursively resolves all capabilities for a set of group IDs,
 * including those inherited from parent groups.
 */
export const resolveCapabilities = async (groupIds: string[], tenantId: string): Promise<string[]> => {
  if (!groupIds.length) return [];

  const capabilities = new Set<string>();
  const processedGroups = new Set<string>();
  let groupsToProcess = [...groupIds];

  while (groupsToProcess.length > 0) {
    const currentBatch = groupsToProcess.filter((id) => !processedGroups.has(id));
    if (currentBatch.length === 0) break;

    const groups = await globalPrisma.permissionGroup.findMany({
      where: {
        id: { in: currentBatch },
        tenantId,
      },
      select: {
        id: true,
        capabilities: true,
        parentGroupId: true,
      },
    });

    groups.forEach((g) => {
      processedGroups.add(g.id);
      const caps = (g.capabilities as string[]) || [];
      caps.forEach((c) => capabilities.add(c));
      if (g.parentGroupId && !processedGroups.has(g.parentGroupId)) {
        groupsToProcess.push(g.parentGroupId);
      }
    });

    groupsToProcess = groupsToProcess.filter((id) => !processedGroups.has(id));
  }

  return Array.from(capabilities);
};

/**
 * Merges effective capabilities, modulePolicies, workflowPolicies, and aiPolicies
 * across all assigned groups and their parent inheritance chains.
 * Within an inheritance chain: child overrides parent.
 * Across multiple sibling roles assigned to a member: union of grants (most permissive),
 * except explicit AI DENY takes precedence for safety.
 */
export const resolveEffectivePolicies = async (
  groupIds: string[],
  tenantId: string
): Promise<EffectivePolicies> => {
  const empty: EffectivePolicies = {
    capabilities: [],
    modulePolicies: {},
    workflowPolicies: {
      allowedQueueIds: [],
      allowedWorkflowIds: [],
      allowedTransitions: {},
      canApprove: false,
      maxApprovalAmount: null,
    },
    aiPolicies: {},
    hasExplicitModulePolicies: false,
  };

  if (!groupIds.length) return empty;

  const capSet = new Set<string>();
  const mergedModules: Record<string, ResolvedModulePolicy> = {};
  const queueIds = new Set<string>();
  const workflowIds = new Set<string>();
  const transitionsMap: Record<string, Set<string>> = {};
  let canApprove = false;
  let maxApprovalAmount: number | null = null;
  const mergedAI: Record<string, AIPolicyDecision> = {};
  let hasExplicitModulePolicies = false;

  for (const gid of groupIds) {
    const chain = await fetchInheritanceChain(gid, tenantId);
    if (!chain.length) continue;

    // 1. Resolve chain-level overrides (root -> child)
    const chainModules: Record<string, ResolvedModulePolicy> = {};
    const chainAI: Record<string, AIPolicyDecision> = {};

    for (const node of chain) {
      const caps = Array.isArray(node.capabilities) ? (node.capabilities as string[]) : [];
      caps.forEach((c) => capSet.add(c));

      const modPols = (node.modulePolicies && typeof node.modulePolicies === 'object'
        ? node.modulePolicies
        : {}) as Record<string, any>;

      for (const [modId, raw] of Object.entries(modPols)) {
        if (!raw || typeof raw !== 'object') continue;
        hasExplicitModulePolicies = true;
        const prev = chainModules[modId];
        chainModules[modId] = {
          access: raw.access !== undefined ? Boolean(raw.access) : prev?.access ?? true,
          create: raw.create !== undefined ? Boolean(raw.create) : prev?.create ?? false,
          read: raw.read !== undefined ? Boolean(raw.read) : prev?.read ?? true,
          update: raw.update !== undefined ? Boolean(raw.update) : prev?.update ?? false,
          delete: raw.delete !== undefined ? Boolean(raw.delete) : prev?.delete ?? false,
          export: raw.export !== undefined ? Boolean(raw.export) : prev?.export ?? false,
          rowScope: (raw.rowScope as RowScope) || prev?.rowScope || 'ALL',
          fields: {
            ...(prev?.fields || {}),
            ...(raw.fields && typeof raw.fields === 'object' ? raw.fields : {}),
          },
        };
      }

      const wfPol = (node.workflowPolicies && typeof node.workflowPolicies === 'object'
        ? node.workflowPolicies
        : {}) as any;
      if (Array.isArray(wfPol.allowedQueueIds)) {
        wfPol.allowedQueueIds.forEach((q: string) => queueIds.add(q));
      }
      if (Array.isArray(wfPol.allowedWorkflowIds)) {
        wfPol.allowedWorkflowIds.forEach((w: string) => workflowIds.add(w));
      }
      if (wfPol.allowedTransitions && typeof wfPol.allowedTransitions === 'object') {
        for (const [wfId, tList] of Object.entries<any>(wfPol.allowedTransitions)) {
          if (!Array.isArray(tList)) continue;
          if (!transitionsMap[wfId]) transitionsMap[wfId] = new Set();
          tList.forEach((t) => transitionsMap[wfId].add(t));
        }
      }
      if (wfPol.canApprove) canApprove = true;
      if (typeof wfPol.maxApprovalAmount === 'number') {
        maxApprovalAmount =
          maxApprovalAmount === null
            ? wfPol.maxApprovalAmount
            : Math.max(maxApprovalAmount, wfPol.maxApprovalAmount);
      }

      const aiPol = (node.aiPolicies && typeof node.aiPolicies === 'object'
        ? node.aiPolicies
        : {}) as Record<string, AIPolicyDecision>;
      for (const [featKey, decision] of Object.entries(aiPol)) {
        if (decision && decision !== 'INHERIT') {
          chainAI[featKey] = decision;
        }
      }
    }

    // 2. Union resolved chain policies into member's combined policies
    for (const [modId, pol] of Object.entries(chainModules)) {
      const existing = mergedModules[modId];
      if (!existing) {
        mergedModules[modId] = { ...pol, fields: { ...pol.fields } };
      } else {
        const mergedFields: Record<string, { visibility: FieldVisibility }> = { ...existing.fields };
        for (const [fId, fCfg] of Object.entries(pol.fields || {})) {
          const prevF = mergedFields[fId];
          if (!prevF) {
            mergedFields[fId] = fCfg;
          } else {
            const best =
              (FIELD_VISIBILITY_RANK[fCfg.visibility] || 0) >=
              (FIELD_VISIBILITY_RANK[prevF.visibility] || 0)
                ? fCfg
                : prevF;
            mergedFields[fId] = best;
          }
        }

        mergedModules[modId] = {
          access: existing.access || pol.access,
          create: existing.create || pol.create,
          read: existing.read || pol.read,
          update: existing.update || pol.update,
          delete: existing.delete || pol.delete,
          export: existing.export || pol.export,
          rowScope:
            (ROW_SCOPE_RANK[pol.rowScope] || 0) >= (ROW_SCOPE_RANK[existing.rowScope] || 0)
              ? pol.rowScope
              : existing.rowScope,
          fields: mergedFields,
        };
      }
    }

    for (const [featKey, decision] of Object.entries(chainAI)) {
      // Explicit DENY wins across sibling roles for AI guardrails
      if (mergedAI[featKey] === 'DENY') continue;
      mergedAI[featKey] = decision;
    }
  }

  const allowedTransitions: Record<string, string[]> = {};
  for (const [wfId, set] of Object.entries(transitionsMap)) {
    allowedTransitions[wfId] = Array.from(set);
  }

  return {
    capabilities: Array.from(capSet),
    modulePolicies: mergedModules,
    workflowPolicies: {
      allowedQueueIds: Array.from(queueIds),
      allowedWorkflowIds: Array.from(workflowIds),
      allowedTransitions,
      canApprove,
      maxApprovalAmount,
    },
    aiPolicies: mergedAI,
    hasExplicitModulePolicies,
  };
};

/**
 * Produces a detailed inheritance trace for the Role Builder Access Simulator.
 */
export const simulateRoleAccess = async (roleId: string, tenantId: string) => {
  const chain = await fetchInheritanceChain(roleId, tenantId);
  if (!chain.length) return null;

  const target = chain[chain.length - 1];
  const capMap = new Map<string, { key: string; sourceRoleId: string; sourceRoleName: string; inherited: boolean }>();
  const modMap: Record<string, ResolvedModulePolicy & { sourceRoleName: string; inherited: boolean }> = {};
  const aiMap: Record<string, { decision: AIPolicyDecision; sourceRoleName: string; inherited: boolean }> = {};
  const queueIds = new Set<string>();
  const workflowIds = new Set<string>();
  const transitions: Record<string, string[]> = {};
  let canApprove = false;
  let maxApprovalAmount: number | null = null;

  for (const node of chain) {
    const isInherited = node.id !== target.id;
    const caps = Array.isArray(node.capabilities) ? (node.capabilities as string[]) : [];
    for (const c of caps) {
      capMap.set(c, {
        key: c,
        sourceRoleId: node.id,
        sourceRoleName: node.name,
        inherited: isInherited,
      });
    }

    const modPols = (node.modulePolicies && typeof node.modulePolicies === 'object'
      ? node.modulePolicies
      : {}) as Record<string, any>;
    for (const [modId, raw] of Object.entries(modPols)) {
      if (!raw || typeof raw !== 'object') continue;
      const prev = modMap[modId];
      modMap[modId] = {
        access: raw.access !== undefined ? Boolean(raw.access) : prev?.access ?? true,
        create: raw.create !== undefined ? Boolean(raw.create) : prev?.create ?? false,
        read: raw.read !== undefined ? Boolean(raw.read) : prev?.read ?? true,
        update: raw.update !== undefined ? Boolean(raw.update) : prev?.update ?? false,
        delete: raw.delete !== undefined ? Boolean(raw.delete) : prev?.delete ?? false,
        export: raw.export !== undefined ? Boolean(raw.export) : prev?.export ?? false,
        rowScope: (raw.rowScope as RowScope) || prev?.rowScope || 'ALL',
        fields: {
          ...(prev?.fields || {}),
          ...(raw.fields && typeof raw.fields === 'object' ? raw.fields : {}),
        },
        sourceRoleName: node.name,
        inherited: isInherited,
      };
    }

    const wfPol = (node.workflowPolicies && typeof node.workflowPolicies === 'object'
      ? node.workflowPolicies
      : {}) as any;
    if (Array.isArray(wfPol.allowedQueueIds)) wfPol.allowedQueueIds.forEach((q: string) => queueIds.add(q));
    if (Array.isArray(wfPol.allowedWorkflowIds)) wfPol.allowedWorkflowIds.forEach((w: string) => workflowIds.add(w));
    if (wfPol.allowedTransitions && typeof wfPol.allowedTransitions === 'object') {
      Object.assign(transitions, wfPol.allowedTransitions);
    }
    if (wfPol.canApprove !== undefined) canApprove = Boolean(wfPol.canApprove);
    if (wfPol.maxApprovalAmount !== undefined) maxApprovalAmount = wfPol.maxApprovalAmount;

    const aiPol = (node.aiPolicies && typeof node.aiPolicies === 'object'
      ? node.aiPolicies
      : {}) as Record<string, AIPolicyDecision>;
    for (const [featKey, decision] of Object.entries(aiPol)) {
      if (decision && decision !== 'INHERIT') {
        aiMap[featKey] = {
          decision,
          sourceRoleName: node.name,
          inherited: isInherited,
        };
      }
    }
  }

  return {
    roleId: target.id,
    roleName: target.name,
    inheritanceChain: chain.map((n) => ({ id: n.id, name: n.name })),
    effectiveCapabilities: Array.from(capMap.values()),
    effectiveModulePolicies: modMap,
    effectiveWorkflowPolicies: {
      allowedQueueIds: Array.from(queueIds),
      allowedWorkflowIds: Array.from(workflowIds),
      allowedTransitions: transitions,
      canApprove,
      maxApprovalAmount,
    },
    effectiveAIPolicies: aiMap,
  };
};

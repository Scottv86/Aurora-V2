import { globalPrisma } from './prisma';
import { resolveCapabilities } from './permissions';

export type AIFeatureKey =
  | 'ai:antigravity_agent'
  | 'ai:subagent_delegation'
  | 'ai:scheduled_tasks'
  | 'ai:agent_builder'
  | 'ai:solution_builder'
  | 'ai:form_builder'
  | 'ai:page_builder'
  | 'ai:connector_architect'
  | 'ai:report_generator'
  | 'ai:formula_assistant'
  | 'ai:record_summary'
  | 'ai:document_template'
  | 'ai:ask_aurora_filter'
  | 'ai:workforce_onboarding'
  | 'ai:digital_twin'
  | 'ai:workflow_actions'
  | 'ai:smart_inbox'
  | 'ai:vector_embeddings'
  | 'ai:public_portal_chat';

export type AIPolicyState = 'ALLOW' | 'DENY' | 'INHERIT';

export interface AIFeatureAccessResult {
  allowed: boolean;
  reason: string;
  level: 'SUPERADMIN' | 'MEMBER' | 'TEAM' | 'PERMISSION_GROUP' | 'TENANT' | 'SYSTEM';
  featureKey: string;
}

const ALL_AI_FEATURES: AIFeatureKey[] = [
  'ai:antigravity_agent',
  'ai:subagent_delegation',
  'ai:scheduled_tasks',
  'ai:agent_builder',
  'ai:solution_builder',
  'ai:form_builder',
  'ai:page_builder',
  'ai:connector_architect',
  'ai:report_generator',
  'ai:formula_assistant',
  'ai:record_summary',
  'ai:document_template',
  'ai:ask_aurora_filter',
  'ai:workforce_onboarding',
  'ai:digital_twin',
  'ai:workflow_actions',
  'ai:smart_inbox',
  'ai:vector_embeddings',
  'ai:public_portal_chat'
];

/**
 * Resolves access to an AI feature across the 4-tier hierarchy:
 * 1. User Override (TenantMember.aiOverrides)
 * 2. Team Override (Team.aiOverrides)
 * 3. Permission Group Capabilities (PermissionGroup.capabilities via resolveCapabilities)
 * 4. Tenant Global Defaults (TenantAIMapping.featureDefaults)
 */
export async function resolveAIFeatureAccess(options: {
  tenantId: string;
  userId?: string;
  featureKey: string;
  db?: any;
}): Promise<AIFeatureAccessResult> {
  const { tenantId, userId, featureKey } = options;
  const db = options.db || globalPrisma;

  if (!userId || userId === 'system' || userId === 'superadmin') {
    return {
      allowed: true,
      reason: 'System/SuperAdmin bypass',
      level: 'SUPERADMIN',
      featureKey
    };
  }

  // Check if user is SuperAdmin in User model
  try {
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true }
    });
    if (userRecord?.isSuperAdmin) {
      return {
        allowed: true,
        reason: 'SuperAdmin privilege',
        level: 'SUPERADMIN',
        featureKey
      };
    }
  } catch (e) {
    // Non-fatal if user lookup fails
  }

  // Fetch Member with Team and Permission Groups
  let member: any = null;
  try {
    member = await db.tenantMember.findFirst({
      where: { tenantId, userId },
      include: {
        team: true,
        permissionGroups: true
      }
    });
  } catch (e) {
    console.warn('[AIPermissions] Error fetching member record:', e);
  }

  // 1. User / Member Override Check
  if (member?.aiOverrides && typeof member.aiOverrides === 'object') {
    const userOverride = (member.aiOverrides as Record<string, string>)[featureKey];
    if (userOverride === 'ALLOW') {
      return {
        allowed: true,
        reason: 'Explicit Member Level Override: ALLOW',
        level: 'MEMBER',
        featureKey
      };
    }
    if (userOverride === 'DENY') {
      return {
        allowed: false,
        reason: 'Explicit Member Level Override: DENY',
        level: 'MEMBER',
        featureKey
      };
    }
  }

  // 2. Team Override Check
  if (member?.team?.aiOverrides && typeof member.team.aiOverrides === 'object') {
    const teamOverride = (member.team.aiOverrides as Record<string, string>)[featureKey];
    if (teamOverride === 'ALLOW') {
      return {
        allowed: true,
        reason: `Explicit Team Override (${member.team.name}): ALLOW`,
        level: 'TEAM',
        featureKey
      };
    }
    if (teamOverride === 'DENY') {
      return {
        allowed: false,
        reason: `Explicit Team Override (${member.team.name}): DENY`,
        level: 'TEAM',
        featureKey
      };
    }
  }

  // 3. Permission Group Capabilities Check
  if (member) {
    const groupIds = (member.permissionGroups || []).map((mpg: any) => mpg.permissionGroupId);
    if (groupIds.length > 0) {
      try {
        const capabilities = await resolveCapabilities(groupIds, tenantId);
        const capsSet = new Set(capabilities);

        // Check explicit negation first (e.g. !ai:antigravity_agent)
        if (capsSet.has(`!${featureKey}`) || capsSet.has('!ai:*')) {
          return {
            allowed: false,
            reason: 'Permission Group explicit restriction',
            level: 'PERMISSION_GROUP',
            featureKey
          };
        }

        // Check direct capability, domain wildcard, or global wildcard
        if (capsSet.has(featureKey) || capsSet.has('ai:*') || capsSet.has('*:*')) {
          return {
            allowed: true,
            reason: 'Permission Group Capability granted',
            level: 'PERMISSION_GROUP',
            featureKey
          };
        }
      } catch (e) {
        console.warn('[AIPermissions] Error resolving capabilities:', e);
      }
    }
  }

  // 4. Tenant Global Defaults Check
  try {
    const mapping = await db.tenantAIMapping.findUnique({
      where: { tenantId }
    });

    if (mapping?.featureDefaults && typeof mapping.featureDefaults === 'object') {
      const defaults = mapping.featureDefaults as Record<string, boolean>;
      if (featureKey in defaults) {
        const isDefaultEnabled = Boolean(defaults[featureKey]);
        return {
          allowed: isDefaultEnabled,
          reason: isDefaultEnabled ? 'Tenant Global Default: Enabled' : 'Tenant Global Default: Disabled',
          level: 'TENANT',
          featureKey
        };
      }
    }
  } catch (e) {
    console.warn('[AIPermissions] Error reading tenantAIMapping featureDefaults:', e);
  }

  // 5. System Default Fallback (Enabled by default)
  return {
    allowed: true,
    reason: 'System Default Baseline: Enabled',
    level: 'SYSTEM',
    featureKey
  };
}

/**
 * Throws a standard 403 error if the user is not allowed to access the specified AI feature.
 */
export async function checkAIFeatureOrThrow(
  tenantId: string,
  userId: string | undefined,
  featureKey: string,
  db = globalPrisma
): Promise<AIFeatureAccessResult> {
  const result = await resolveAIFeatureAccess({ tenantId, userId, featureKey, db });
  if (!result.allowed) {
    const error: any = new Error(`AI Feature '${featureKey}' is disabled for your account (${result.reason}).`);
    error.status = 403;
    error.code = 'AI_FEATURE_DISABLED';
    error.featureKey = featureKey;
    error.reason = result.reason;
    throw error;
  }
  return result;
}

/**
 * Returns the effective access status for all 19 AI features for a specific user.
 */
export async function getAllUserEffectiveAIPolicies(
  tenantId: string,
  userId: string | undefined,
  db = globalPrisma
): Promise<Record<string, { allowed: boolean; reason: string; level: string }>> {
  const results: Record<string, { allowed: boolean; reason: string; level: string }> = {};

  await Promise.all(
    ALL_AI_FEATURES.map(async key => {
      const res = await resolveAIFeatureAccess({ tenantId, userId, featureKey: key, db });
      results[key] = {
        allowed: res.allowed,
        reason: res.reason,
        level: res.level
      };
    })
  );

  return results;
}

import { globalPrisma } from './prisma';
import { emitTenantUpdate } from '../socket';

export interface ActivityActor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  type?: 'USER' | 'SYSTEM' | 'AI_AGENT' | 'AUTOMATION' | 'PUBLIC_FORM';
  role?: string | null;
}

export interface ActivityFieldChange {
  fieldId: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  displayType?: string;
}

export interface ActivityMetadata {
  source?: 'FORM' | 'DIRECT_UI' | 'API' | 'BULK_PASTE' | 'WORKFLOW' | 'AUTOMATION' | 'DUPLICATE';
  formId?: string;
  formTitle?: string;
  workflowNode?: string;
  workflowTransitionReason?: string;
  ip?: string;
  userAgent?: string;
  comment?: string;
  description?: string;
  [key: string]: any;
}

export interface RecordActivityInput {
  tenantId: string;
  actorId?: string;
  actor?: ActivityActor;
  action: string; // e.g. 'RECORD_CREATED', 'FIELD_UPDATED', 'STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'DELETED', etc.
  category?: 'CREATION' | 'FIELD' | 'STATUS' | 'ASSIGNMENT' | 'WORKFLOW' | 'AUTOMATION' | 'COMMENT' | 'SECURITY';
  resourceId: string; // recordId
  moduleId?: string;
  moduleName?: string;
  resourceKey?: string; // e.g. 'LIC-9'
  resourceTitle?: string; // e.g. 'Alma Tavern Test'
  changes?: ActivityFieldChange[];
  oldValue?: any;
  newValue?: any;
  metadata?: ActivityMetadata;
  description?: string;
}

/**
 * Automatically compute human-readable field diffs between old data and new data.
 */
export function computeFieldDiff(
  oldData: Record<string, any> = {},
  newData: Record<string, any> = {},
  layoutFields: any[] = []
): ActivityFieldChange[] {
  const diffs: ActivityFieldChange[] = [];
  
  // Flatten layout fields for easy lookup
  const fieldMap = new Map<string, any>();
  const flatten = (fields: any[]) => {
    for (const f of fields) {
      if (f && f.id) {
        fieldMap.set(f.id, f);
        if (Array.isArray(f.fields)) {
          flatten(f.fields);
        }
      }
    }
  };
  flatten(layoutFields);

  // Combine unique keys from both objects, ignoring private metadata keys
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  const ignoredKeys = new Set(['_record_key', '_comments', '_path', '_formId', '_formName', '_submissionSource', 'status', 'workflowState']);

  for (const key of keys) {
    if (ignoredKeys.has(key)) continue;

    const oldVal = oldData ? oldData[key] : undefined;
    const newVal = newData ? newData[key] : undefined;

    // Deep equality check for primitives, arrays, objects
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const fieldDef = fieldMap.get(key);
      const label = fieldDef?.label || fieldDef?.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayType = fieldDef?.type || typeof (newVal !== undefined ? newVal : oldVal);

      diffs.push({
        fieldId: key,
        fieldLabel: label,
        oldValue: oldVal === undefined ? null : oldVal,
        newValue: newVal === undefined ? null : newVal,
        displayType
      });
    }
  }

  return diffs;
}

/**
 * Universal recordAudit supporting both legacy params and enriched audit logging.
 */
export async function recordAudit(
  firstArg: any,
  ...rest: any[]
) {
  try {
    // 1. Backward-compatible call: recordAudit(req, action, resourceType, resourceId, details)
    if (firstArg && (firstArg.tenantId || firstArg.db) && typeof rest[0] === 'string') {
      const req = firstArg;
      const action = rest[0];
      const resourceId = rest[2] || 'unknown';
      const details = rest[3] || {};
      const tenantId = req.tenantId || 'default';
      const actorId = req.user?.memberId || req.user?.id || req.user?.uid || 'system';

      return await globalPrisma.auditLog.create({
        data: {
          tenantId,
          actorId,
          action,
          resourceId,
          oldValue: details.oldValue || null,
          newValue: details.newValue || details || null,
        }
      });
    }

    // 2. Structured params call: recordAudit({ tenantId, actorId, action, resourceId, oldValue, newValue })
    if (firstArg && typeof firstArg === 'object') {
      const params = firstArg;
      return await globalPrisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actorId || 'system',
          action: params.action,
          resourceId: params.resourceId,
          oldValue: params.oldValue || null,
          newValue: params.newValue || null,
        }
      });
    }
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err);
  }
}

/**
 * High-level Enterprise Record Activity Logger.
 * Records the activity in `audit_logs` and emits a WebSocket broadcast.
 */
export async function logRecordActivity(params: RecordActivityInput) {
  try {
    const {
      tenantId,
      actorId = 'system',
      actor: providedActor,
      action,
      category = 'FIELD',
      resourceId,
      moduleId,
      moduleName,
      resourceKey,
      resourceTitle,
      changes = [],
      oldValue,
      newValue,
      metadata = {},
      description
    } = params;

    // Resolve actor if partial
    let actor: ActivityActor = providedActor || {
      id: actorId,
      name: 'System',
      email: '',
      type: actorId === 'system' ? 'SYSTEM' : 'USER'
    };

    if ((!providedActor || !providedActor.name || providedActor.name === 'System') && actorId && actorId !== 'system') {
      try {
        const member = await globalPrisma.tenantMember.findFirst({
          where: {
            OR: [
              { id: actorId },
              { userId: actorId }
            ],
            tenantId
          }
        });
        if (member) {
          actor = {
            id: member.id,
            name: `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.workEmail || 'Tenant Member',
            email: member.workEmail || member.personalEmail || '',
            avatarUrl: member.avatarUrl,
            role: member.roleId,
            type: member.isSynthetic ? 'AI_AGENT' : 'USER'
          };
        }
      } catch (err) {
        // Silently continue with fallback actor
      }
    }

    // Generate human-friendly summary if not passed
    let humanDescription = description;
    if (!humanDescription) {
      if (action === 'RECORD_CREATED') {
        const sourceLabel = metadata?.source === 'FORM' 
          ? `form "${metadata?.formTitle || metadata?.formId || 'Intake'}"` 
          : metadata?.source === 'BULK_PASTE' 
          ? 'bulk import' 
          : 'direct submission';
        humanDescription = `Record created via ${sourceLabel}`;
      } else if (action === 'STATUS_CHANGED') {
        humanDescription = `Status updated to "${newValue?.status || newValue || 'Updated'}"`;
      } else if (action === 'ASSIGNMENT_CHANGED') {
        humanDescription = newValue?.assigneeName 
          ? `Assigned to ${newValue.assigneeName}` 
          : `Assignee updated`;
      } else if (action === 'RECORD_SHARED') {
        humanDescription = `Record shared`;
      } else if (action === 'RECORD_STARRED') {
        humanDescription = newValue?.starred ? `Record starred` : `Record unstarred`;
      } else if (changes.length > 0) {
        if (changes.length === 1) {
          humanDescription = `Updated ${changes[0].fieldLabel}`;
        } else {
          humanDescription = `Updated ${changes.length} fields (${changes.map(c => c.fieldLabel).slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''})`;
        }
      } else {
        humanDescription = `Record updated`;
      }
    }

    const enrichedNewValue = {
      scope: 'RECORD',
      category,
      moduleId,
      moduleName,
      resourceKey,
      resourceTitle,
      actor,
      changes,
      metadata,
      description: humanDescription,
      payload: newValue || null
    };

    const auditEntry = await globalPrisma.auditLog.create({
      data: {
        tenantId,
        actorId: actor.id || actorId,
        action,
        resourceId,
        oldValue: oldValue ? { payload: oldValue } : null,
        newValue: enrichedNewValue as any,
      }
    });

    const broadcastPayload = {
      id: auditEntry.id,
      tenantId,
      timestamp: auditEntry.timestamp.toISOString(),
      action,
      category,
      resourceId,
      moduleId,
      moduleName,
      resourceKey,
      resourceTitle,
      actor,
      changes,
      metadata,
      description: humanDescription
    };

    // Broadcast in real-time to tenant channel
    emitTenantUpdate(tenantId, 'RECORD_ACTIVITY', broadcastPayload);
    emitTenantUpdate(tenantId, 'FEED_ACTIVITY', broadcastPayload);

    return auditEntry;
  } catch (err) {
    console.error('[AuditService] Failed to log record activity:', err);
  }
}

import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';

export interface StagedAiAction {
  id: string;
  agentName: string;
  actionType: string;
  title: string;
  rationale: string;
  confidence: number;
  targetRecordId?: string;
  targetModuleId?: string;
  patchData?: Record<string, any>;
  estimatedImpact?: number;
  stagedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export class AiActionStager {
  /**
   * Stages an action card for human approval if confidence is below threshold or financial impact exceeds limits.
   */
  public static async stageAction(tenantId: string, actionInput: {
    agentName?: string;
    actionType: string;
    title: string;
    rationale: string;
    confidence: number;
    targetRecordId?: string;
    targetModuleId?: string;
    patchData?: Record<string, any>;
    estimatedImpact?: number;
  }): Promise<{ staged: boolean; actionId?: string }> {
    const {
      agentName = 'Antigravity Copilot',
      actionType,
      title,
      rationale,
      confidence,
      targetRecordId,
      targetModuleId,
      patchData,
      estimatedImpact = 0
    } = actionInput;

    // Guardrail Thresholds:
    // Staged if confidence < 0.90 OR financial impact > $500
    const requiresHumanSignoff = confidence < 0.90 || estimatedImpact > 500;

    if (!requiresHumanSignoff) {
      return { staged: false };
    }

    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });

    const wsSettings = (tenant?.workspaceSettings as any) || {};
    const existingStaged: StagedAiAction[] = Array.isArray(wsSettings.stagedAiActions) ? wsSettings.stagedAiActions : [];

    const newAction: StagedAiAction = {
      id: `ai_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agentName,
      actionType,
      title,
      rationale,
      confidence,
      targetRecordId,
      targetModuleId,
      patchData,
      estimatedImpact,
      stagedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...wsSettings,
          stagedAiActions: [...existingStaged, newAction]
        }
      }
    });

    await recordAudit({
      tenantId,
      actorId: 'AI_AGENT',
      action: 'AI_ACTION_STAGED_FOR_APPROVAL',
      resourceId: newAction.id,
      newValue: { title, confidence, estimatedImpact }
    });

    return { staged: true, actionId: newAction.id };
  }
}

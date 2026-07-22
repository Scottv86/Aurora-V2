import { globalPrisma } from '../lib/prisma';
import { calculateEstimatedCost } from './aiProviderService';

export interface VibeChatLogEntry {
  sessionId: string;
  tenantId: string;
  userId: string;
  goalId?: string;
  artifactLinkId?: string;
  intentCategory: string;
  connectionTier: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  userPrompt: string;
  aiResponse?: string;
  toolCalls?: any;
}

/**
 * Enterprise Audit Logger for AI Chat Sessions ("Liability Trail")
 * Logs every execution grouped by goal_id, linking actions to deployed code via artifact_link_id.
 */
export class AuditLogService {
  /**
   * Writes a chat session execution entry to audit logs.
   */
  public static async logSessionEvent(entry: VibeChatLogEntry): Promise<void> {
    try {
      const estimatedCostUSD = calculateEstimatedCost(entry.model, entry.promptTokens, entry.completionTokens);

      console.log(`[LiabilityTrail Audit] Logged AI session for tenant ${entry.tenantId}: Goal [${entry.goalId || 'N/A'}] - ${entry.intentCategory} intent - $${estimatedCostUSD} USD`);

      // Database insertion when Prisma migration is applied
      const db = globalPrisma as any;
      if (db.vibeChatLog) {
        await db.vibeChatLog.create({
          data: {
            sessionId: entry.sessionId,
            tenantId: entry.tenantId,
            userId: entry.userId,
            goalId: entry.goalId || null,
            artifactLinkId: entry.artifactLinkId || null,
            intentCategory: entry.intentCategory,
            connectionTier: entry.connectionTier,
            provider: entry.provider,
            model: entry.model,
            promptTokens: entry.promptTokens,
            completionTokens: entry.completionTokens,
            estimatedCostUSD,
            latencyMs: entry.latencyMs,
            userPrompt: entry.userPrompt,
            aiResponse: entry.aiResponse || null,
            toolCalls: entry.toolCalls || null
          }
        });
      }
    } catch (err: any) {
      console.error('[AuditLogService] Failed to record vibe_chat_log event:', err.message);
    }
  }

  /**
   * Pre-launch cleanup command: Wipes messy sandbox data.
   */
  public static async truncateSandboxLogs(): Promise<{ success: boolean; message: string }> {
    try {
      const db = globalPrisma as any;
      if (db.vibeChatLog) {
        await db.$executeRawUnsafe('TRUNCATE TABLE vibe_chat_logs;');
      }
      return { success: true, message: 'Cleaned up sandbox chat logs table.' };
    } catch (err: any) {
      return { success: false, message: `Purge skipped: ${err.message}` };
    }
  }
}

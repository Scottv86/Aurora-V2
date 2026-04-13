import { globalPrisma } from './prisma';

export const recordAudit = async (params: {
  tenantId: string;
  actorId: string;
  action: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
}) => {
  try {
    await globalPrisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: params.action,
        resourceId: params.resourceId,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
      }
    });
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err);
    // We don't throw here to avoid failing the main operation if auditing fails
  }
};

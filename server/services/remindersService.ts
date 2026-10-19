import { globalPrisma } from '../lib/prisma';
import { emitTenantUpdate } from '../socket';

export interface CreateReminderInput {
  createdById?: string;
  createdByName?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToAvatar?: string;
  title: string;
  description?: string;
  dueAt: Date | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';
  recurrenceRule?: string;
  notifyChannels?: string[];
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
  originWorkflowId?: string;
  originAutomationId?: string;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  dueAt?: Date | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';
  assignedToId?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToAvatar?: string;
  notifyChannels?: string[];
}

export class RemindersService {
  /**
   * Fetch reminders with polymorphic filters, smart view categorisation, and search
   */
  static async getReminders(
    tenantId: string,
    params: {
      assignedToId?: string;
      moduleId?: string;
      recordId?: string;
      entityType?: string;
      entityId?: string;
      status?: string;
      view?: 'today' | 'scheduled' | 'overdue' | 'completed' | 'flagged' | 'all';
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: any = { tenantId };

    if (params.assignedToId) where.assignedToId = params.assignedToId;
    if (params.moduleId) where.moduleId = params.moduleId;
    if (params.recordId) where.recordId = params.recordId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.priority) where.priority = params.priority;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (params.view) {
      switch (params.view) {
        case 'today':
          where.status = { in: ['PENDING', 'SNOOZED'] };
          where.dueAt = { lte: endOfToday, gte: startOfToday };
          break;
        case 'scheduled':
          where.status = { in: ['PENDING', 'SNOOZED'] };
          where.dueAt = { gt: endOfToday };
          break;
        case 'overdue':
          where.status = { in: ['PENDING', 'SNOOZED'] };
          where.dueAt = { lt: startOfToday };
          break;
        case 'completed':
          where.status = 'COMPLETED';
          break;
        case 'flagged':
          where.status = { in: ['PENDING', 'SNOOZED'] };
          where.priority = { in: ['HIGH', 'URGENT'] };
          break;
        case 'all':
        default:
          if (params.status) where.status = params.status;
          break;
      }
    } else if (params.status) {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return (globalPrisma as any).universalReminder.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // PENDING first, then COMPLETED
        { dueAt: 'asc' },
      ],
      take: params.limit || 150,
      skip: params.offset || 0,
      include: {
        module: { select: { id: true, name: true, icon: true } },
        record: { select: { id: true, status: true, data: true } },
      },
    });
  }

  static async getReminderById(tenantId: string, id: string) {
    return (globalPrisma as any).universalReminder.findFirst({
      where: { id, tenantId },
      include: {
        module: { select: { id: true, name: true, icon: true } },
        record: { select: { id: true, status: true, data: true } },
      },
    });
  }

  static async createReminder(tenantId: string, input: CreateReminderInput) {
    const dueAtDate = new Date(input.dueAt);

    const reminder = await (globalPrisma as any).universalReminder.create({
      data: {
        tenantId,
        createdById: input.createdById || null,
        createdByName: input.createdByName || 'System',
        assignedToId: input.assignedToId,
        assignedToName: input.assignedToName || 'User',
        assignedToEmail: input.assignedToEmail,
        assignedToAvatar: input.assignedToAvatar,
        title: input.title,
        description: input.description || null,
        dueAt: dueAtDate,
        priority: input.priority || 'MEDIUM',
        status: input.status || 'PENDING',
        recurrenceRule: input.recurrenceRule || null,
        notifyChannels: input.notifyChannels || ['IN_APP'],
        moduleId: input.moduleId || null,
        recordId: input.recordId || null,
        entityType: input.entityType || (input.recordId ? 'RECORD' : null),
        entityId: input.entityId || input.recordId || null,
        originWorkflowId: input.originWorkflowId || null,
        originAutomationId: input.originAutomationId || null,
      },
      include: {
        module: { select: { id: true, name: true, icon: true } },
        record: { select: { id: true, status: true, data: true } },
      },
    });

    // Notify connected client over socket
    try {
      emitTenantUpdate(tenantId, 'REMINDER_CREATED', reminder);
    } catch (_) {}

    return reminder;
  }

  static async updateReminder(tenantId: string, id: string, input: UpdateReminderInput) {
    const data: any = { ...input };
    if (input.dueAt) data.dueAt = new Date(input.dueAt);

    await (globalPrisma as any).universalReminder.updateMany({
      where: { id, tenantId },
      data,
    });

    const updated = await this.getReminderById(tenantId, id);
    try {
      emitTenantUpdate(tenantId, 'REMINDER_UPDATED', updated);
    } catch (_) {}
    return updated;
  }

  static async toggleComplete(tenantId: string, id: string) {
    const existing = await this.getReminderById(tenantId, id);
    if (!existing) throw new Error('Reminder not found');

    const nextStatus = existing.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const completedAt = nextStatus === 'COMPLETED' ? new Date() : null;

    await (globalPrisma as any).universalReminder.update({
      where: { id },
      data: { status: nextStatus, completedAt },
    });

    const updated = await this.getReminderById(tenantId, id);
    try {
      emitTenantUpdate(tenantId, 'REMINDER_STATUS_CHANGED', updated);
    } catch (_) {}
    return updated;
  }

  static async snoozeReminder(tenantId: string, id: string, minutes: number = 15) {
    const existing = await this.getReminderById(tenantId, id);
    if (!existing) throw new Error('Reminder not found');

    const nextDue = new Date(Date.now() + minutes * 60 * 1000);

    await (globalPrisma as any).universalReminder.update({
      where: { id },
      data: {
        status: 'SNOOZED',
        dueAt: nextDue,
        snoozeCount: (existing.snoozeCount || 0) + 1,
        lastSnoozedAt: new Date(),
      },
    });

    const updated = await this.getReminderById(tenantId, id);
    try {
      emitTenantUpdate(tenantId, 'REMINDER_SNOOZED', updated);
    } catch (_) {}
    return updated;
  }

  static async deleteReminder(tenantId: string, id: string) {
    await (globalPrisma as any).universalReminder.deleteMany({
      where: { id, tenantId },
    });
    try {
      emitTenantUpdate(tenantId, 'REMINDER_DELETED', { id });
    } catch (_) {}
    return { success: true };
  }
}

export interface UniversalReminder {
  id: string;
  tenantId: string;
  createdById?: string;
  createdByName?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedToAvatar?: string;
  title: string;
  description?: string;
  dueAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';
  completedAt?: string;
  snoozeCount: number;
  lastSnoozedAt?: string;
  recurrenceRule?: string;
  notifyChannels: string[];
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
  originWorkflowId?: string;
  originAutomationId?: string;
  createdAt: string;
  updatedAt: string;
  module?: {
    id: string;
    name: string;
    icon?: string;
  };
  record?: {
    id: string;
    status?: string;
    data?: any;
  };
}

export interface CreateReminderPayload {
  title: string;
  description?: string;
  dueAt: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedToName?: string;
  notifyChannels?: string[];
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
}

export type ReminderSmartView = 'all' | 'today' | 'scheduled' | 'overdue' | 'flagged' | 'completed';

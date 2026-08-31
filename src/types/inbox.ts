export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'custom' | 'shared';
export type AccountType = 'PERSONAL' | 'SHARED';
export type InboxFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'snoozed' | 'archive' | 'trash' | 'spam';
export type SharedStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

export interface CustomFolder {
  id: string;
  tenantId?: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface AdvancedSearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  hasAttachments?: boolean;
  dateRange?: 'all' | '24h' | '7d' | '30d' | 'custom';
  status?: 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED';
  assignedTo?: string;
  hasLinkedRecord?: boolean;
}

export interface EmailServerConfig {
  email: string;
  name?: string;
  password?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  provider?: EmailProvider;
}

export interface EmailAccount {
  id: string;
  tenantId?: string;
  userId?: string;
  email: string;
  name: string;
  provider: EmailProvider;
  type: AccountType;
  color: string;
  config: EmailServerConfig;
  status: 'CONNECTED' | 'SYNCING' | 'ERROR';
  errorMessage?: string;
  lastSyncedAt?: string;
  unreadCount?: number;
  sharedMembers?: string[];
  createdAt: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  contentBase64?: string;
  driveItemId?: string;
}

export interface EmailMessage {
  id: string;
  uid?: number;
  messageId?: string;
  from: { name: string; address: string; avatarUrl?: string };
  to: { name: string; address: string; avatarUrl?: string }[];
  cc?: { name: string; address: string }[];
  bcc?: { name: string; address: string }[];
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  flags?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailInternalNote {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface LinkedModuleRecord {
  id: string;
  moduleId: string;
  moduleName?: string;
  recordKey?: string;
  title: string;
  createdAt: string;
}

export interface EmailThread {
  id: string;
  tenantId: string;
  accountId: string;
  subject: string;
  snippet: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  timestamp: string;
  folder: InboxFolder;
  isRead: boolean;
  isStarred: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  labels: string[];
  messages: EmailMessage[];
  linkedRecords?: LinkedModuleRecord[];
  internalNotes?: EmailInternalNote[];
  sharedStatus?: SharedStatus;
  assignedTo?: string;
  assignedToUser?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  collaborators?: {
    id: string;
    name: string;
    avatar?: string;
    status: 'viewing' | 'typing';
    updatedAt: string;
  }[];
  tracking?: {
    openedAt?: string;
    openCount: number;
    clickedLinks?: string[];
  };
  aiInsights?: {
    summary?: string;
    actionItems?: string[];
    sentiment?: 'positive' | 'neutral' | 'urgent' | 'negative';
    category?: 'support' | 'sales' | 'billing' | 'engineering' | 'general';
    urgencyScore?: number; // 1 - 5
  };
}

export interface EmailSnippet {
  id: string;
  tenantId?: string;
  title: string;
  shortcut: string; // e.g. "/intro" or "/pricing"
  category: string;
  content: string;
  contentHtml?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailSignature {
  id: string;
  tenantId?: string;
  accountId?: string; // empty means default for all accounts
  name: string;
  contentHtml: string;
  contentText: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ScheduledEmail {
  id: string;
  tenantId?: string;
  accountId: string;
  request: SendEmailRequest;
  sendAt: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED';
  createdAt: string;
}

export interface SendEmailRequest {
  accountId: string;
  fromName?: string;
  fromEmail?: string;
  fromAvatarUrl?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  threadId?: string;
  scheduledSendAt?: string;
  signatureId?: string;
  enableTracking?: boolean;
  attachments?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  }[];
}

export interface EmailRule {
  id: string;
  name: string;
  condition: {
    field: 'from' | 'subject' | 'body' | 'to';
    operator: 'contains' | 'equals' | 'starts_with' | 'ends_with';
    value: string;
  };
  actions: {
    applyLabel?: string;
    assignTo?: string;
    moveToFolder?: InboxFolder;
    triggerWorkflow?: boolean;
    workflowId?: string;
  };
  enabled: boolean;
}

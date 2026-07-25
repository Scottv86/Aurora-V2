export type DriveType = 'PERSONAL' | 'TENANT_SHARED';
export type ItemType = 'FOLDER' | 'FILE' | 'DOCUMENT';
export type DocumentClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export type DisposalAction = 'ARCHIVE' | 'DELETE' | 'SOFT_DELETE' | 'REVIEW';
export type ItemStatus = 'ACTIVE' | 'TRASHED' | 'ARCHIVED';

export interface RecordsMetadata {
  recordNumber: string; // e.g. REC-2026-00129
  classification: DocumentClassification;
  retentionScheduleId?: string;
  retentionScheduleName?: string;
  retentionExpiryDate?: string; // YYYY-MM-DD
  disposalAction?: DisposalAction;
  isLegalHold: boolean;
  legalHoldReason?: string;
  legalHoldAppliedBy?: string;
  legalHoldAppliedAt?: string;
  subjectTags?: string[];
  securityLevel?: string;
}

export interface FileVersion {
  id: string;
  versionNumber: number;
  updatedBy: string;
  updatedAt: string;
  sizeBytes: number;
  note?: string;
}

export interface DriveAuditLog {
  id: string;
  itemId: string;
  timestamp: string;
  actor: string;
  action: 'CREATE' | 'VIEW' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'MOVE' | 'RECORD_METADATA_UPDATE' | 'LEGAL_HOLD_APPLIED' | 'LEGAL_HOLD_REMOVED' | 'SAVE_DOCUMENT';
  details: string;
}

export interface DriveItem {
  id: string;
  name: string;
  type: ItemType;
  driveType: DriveType;
  parentId: string | null; // null means root of that driveType
  ownerId: string;
  ownerName: string;
  tenantId?: string;
  sizeBytes: number;
  mimeType?: string;
  content?: string; // for rich text documents or file content
  templateId?: string;
  isFavorite: boolean;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  recordsMetadata: RecordsMetadata;
  versions: FileVersion[];
  auditLogs: DriveAuditLog[];
}

export interface DisposalSchedule {
  id: string;
  name: string;
  moduleScope: string;
  retentionPeriodMonths: number;
  durationLabel: string;
  action: DisposalAction;
  description: string;
}

export interface MergeFieldToken {
  id: string;
  label: string;
  token: string; // e.g. {{party.firstName}}
  moduleSource: string; // e.g. 'People & Organisations', 'Workforce', 'Pricing Catalog', 'Custom Module'
  dataType: 'text' | 'number' | 'date' | 'currency' | 'email';
  sampleValue: string;
}

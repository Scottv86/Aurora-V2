export type DocumentClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export type DisposalAction = 'ARCHIVE' | 'SOFT_DELETE' | 'PERMANENT_PURGE' | 'REVIEW';
export type DocumentStatus = 'ACTIVE' | 'PENDING_DISPOSAL' | 'ARCHIVED' | 'PURGED' | 'TRASHED';

export interface UniversalDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storagePath: string;
  sizeBytes: number;
  sha256?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export interface UniversalDocumentLink {
  id: string;
  documentId: string;
  tenantId: string;
  sourceType: 'RECORD' | 'FORM' | 'DRIVE' | 'DOC_APP' | 'INBOX' | 'CHAT' | 'GENERAL';
  moduleId?: string;
  recordId?: string;
  fieldId?: string;
  folderId?: string;
  createdAt: string;
}

export interface UniversalDisposalSchedule {
  id: string;
  tenantId: string;
  name: string;
  moduleScope?: string;
  documentType?: string;
  retentionPeriodMonths: number;
  durationLabel: string;
  action: DisposalAction;
  requiresApproval: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversalDocumentAuditLog {
  id: string;
  documentId: string;
  tenantId: string;
  action: string;
  actor: string;
  actorId?: string;
  details: string;
  metadata?: any;
  createdAt: string;
}

export interface UniversalDocument {
  id: string;
  tenantId: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  storageProvider: string;
  storagePath: string;
  url?: string;
  classification: DocumentClassification;
  documentType: string;
  retentionScheduleId?: string;
  retentionExpiryDate?: string;
  disposalAction?: DisposalAction;
  isLegalHold: boolean;
  legalHoldReason?: string;
  legalHoldAppliedBy?: string;
  legalHoldAppliedAt?: string;
  isWormLocked: boolean;
  ocrText?: string;
  aiSummary?: string;
  aiMetadata?: {
    detectedPii?: string[];
    extractedFields?: Record<string, any>;
    confidence?: number;
    annotations?: DocumentAnnotation[];
    signatures?: DocumentSignature[];
    lastDiff?: VersionDiffResult;
    technicalMetadata?: FileTechnicalMetadata;
  };
  status: DocumentStatus;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
  versions?: UniversalDocumentVersion[];
  links?: UniversalDocumentLink[];
  retentionSchedule?: UniversalDisposalSchedule;
  auditLogs?: UniversalDocumentAuditLog[];
  linkId?: string;
  fieldId?: string;
}

export interface AiExtractionResult {
  extractedFields: Record<string, any>;
  detectedPii: string[];
  summary: string;
  suggestedClassification: DocumentClassification;
}

export interface DocumentAnnotationComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface DocumentAnnotation {
  id: string;
  xPercent: number; // 0 - 100% relative to document width
  yPercent: number; // 0 - 100% relative to document height
  pageNumber?: number;
  authorId?: string;
  authorName: string;
  comments: DocumentAnnotationComment[];
  isResolved: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentSignature {
  id: string;
  signatureType: 'DRAW' | 'TYPE' | 'STAMP';
  signerName: string;
  signerEmail: string;
  signatureDataUrl?: string; // Base64 png
  stampedAt: string;
  versionNumber: number;
  sha256Seal: string;
  ipAddress?: string;
  note?: string;
}

export interface VersionDiffResult {
  docA: { version: number; filename: string };
  docB: { version: number; filename: string };
  summary: string;
  changes: Array<{
    type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
    clauseOrLocation?: string;
    textBefore?: string;
    textAfter?: string;
    description: string;
    significance: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  analyzedAt: string;
}

export interface ContractObligation {
  id: string;
  title: string;
  description: string;
  category: 'DEADLINE' | 'DELIVERABLE' | 'PAYMENT' | 'RENEWAL' | 'COMPLIANCE';
  dueDate?: string;
  responsibleParty?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  sourceQuote?: string;
}

export interface LineItemRow {
  id: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  totalAmount: number;
}

export interface DocumentConversionDraft {
  targetType: 'PEOPLE_ORG' | 'MODULE';
  entityType?: 'PERSON' | 'ORGANIZATION';
  moduleId?: string;
  fields: Record<string, any>;
  fieldConfidences: Record<string, number>;
  sourceCitations?: Record<string, string>;
  lineItems?: LineItemRow[];
  dedupMatch?: {
    matchType: 'EXACT_TAX_ID' | 'EXACT_EMAIL' | 'SIMILAR_NAME';
    existingId: string;
    existingName: string;
    existingDetails: string;
  };
}

export interface FileTechnicalMetadata {
  dimensions?: {
    width: number;
    height: number;
    aspectRatio?: string;
    megapixels?: string;
  };
  exif?: {
    make?: string;
    model?: string;
    dateTimeOriginal?: string;
    software?: string;
    orientation?: number | string;
    iso?: number;
    fNumber?: number;
    exposureTime?: string;
    lensModel?: string;
  };
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    mapsUrl?: string;
  };
  pdfInfo?: {
    version?: string;
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount?: number;
  };
  textStats?: {
    linesCount?: number;
    wordsCount?: number;
    charactersCount?: number;
  };
  system?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
}


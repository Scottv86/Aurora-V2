import { DriveItem, DriveType, DisposalSchedule, MergeFieldToken, DocumentClassification } from '../types/drive';
import { API_BASE_URL } from '../config';

const STORAGE_KEY_ITEMS = 'aurora_drive_items_v1';

export async function sendToGlobalRecyclingBin(item: DriveItem, tenantId?: string, userEmail?: string, token?: string) {
  try {
    if (!tenantId) return;
    await fetch(`${API_BASE_URL}/api/trash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        itemType: 'DOCUMENT',
        itemId: item.id,
        title: item.name,
        subtitle: `Documents App • ${item.recordsMetadata.recordNumber}`,
        payload: item,
        deletedBy: userEmail || 'User'
      })
    });
  } catch (err) {
    console.warn('[DriveService] Send to global recycling bin notice:', err);
  }
}

export const DEFAULT_DISPOSAL_SCHEDULES: DisposalSchedule[] = [

  { id: 'ds-1', name: '7-Year Tax & Financial Records', moduleScope: 'Pricing Catalog / Finance', retentionPeriodMonths: 84, durationLabel: '7 Years', action: 'ARCHIVE', description: 'Mandatory tax retention for financial statements, invoices, and payment receipts.' },
  { id: 'ds-2', name: '3-Year Operational Records', moduleScope: 'Work Distribution / Operations', retentionPeriodMonths: 36, durationLabel: '3 Years', action: 'SOFT_DELETE', description: 'Standard operational work requests and internal task correspondence.' },
  { id: 'ds-3', name: 'Permanent Corporate Governance', moduleScope: 'Organization / Executive', retentionPeriodMonths: 1200, durationLabel: 'Permanent', action: 'REVIEW', description: 'Permanent retention for board resolutions, legal deeds, and charter documents.' },
  { id: 'ds-4', name: '1-Year Temporary Audits', moduleScope: 'System Logs', retentionPeriodMonths: 12, durationLabel: '1 Year', action: 'DELETE', description: 'Transient audit trails and temporary session records.' },
];

export const SYSTEM_MERGE_FIELDS: MergeFieldToken[] = [
  // People & Org
  { id: 'mf-1', label: 'First Name', token: '{{party.firstName}}', moduleSource: 'People & Organisations', dataType: 'text', sampleValue: 'Sarah' },
  { id: 'mf-2', label: 'Family Name', token: '{{party.familyName}}', moduleSource: 'People & Organisations', dataType: 'text', sampleValue: 'Jenkins' },
  { id: 'mf-3', label: 'Work Email', token: '{{party.workEmail}}', moduleSource: 'People & Organisations', dataType: 'email', sampleValue: 's.jenkins@acme.corp' },
  { id: 'mf-4', label: 'Organization Name', token: '{{party.organizationName}}', moduleSource: 'People & Organisations', dataType: 'text', sampleValue: 'Acme Global Holdings' },
  
  // Workforce
  { id: 'mf-5', label: 'Employee Position', token: '{{member.position}}', moduleSource: 'Workforce Management', dataType: 'text', sampleValue: 'Senior Financial Analyst' },
  { id: 'mf-6', label: 'Assigned Team', token: '{{member.team}}', moduleSource: 'Workforce Management', dataType: 'text', sampleValue: 'Global Operations' },
  
  // Pricing Catalog & Finance
  { id: 'mf-7', label: 'Item Code', token: '{{catalog.itemCode}}', moduleSource: 'Pricing Catalog', dataType: 'text', sampleValue: 'SKU-99481' },
  { id: 'mf-8', label: 'Unit Price', token: '{{catalog.unitPrice}}', moduleSource: 'Pricing Catalog', dataType: 'currency', sampleValue: '$4,850.00' },
  
  // Tenant & System Context
  { id: 'mf-9', label: 'Tenant Name', token: '{{tenant.name}}', moduleSource: 'Workspace Environment', dataType: 'text', sampleValue: 'Aurora Enterprise Workspace' },
  { id: 'mf-10', label: 'Current Date', token: '{{system.currentDate}}', moduleSource: 'Workspace Environment', dataType: 'date', sampleValue: '2026-07-25' },
  { id: 'mf-11', label: 'Record Number', token: '{{record.number}}', moduleSource: 'Records Management', dataType: 'text', sampleValue: 'REC-2026-00912' },
];

const INITIAL_ITEMS: DriveItem[] = [
  // Shared Tenant Root Folders
  {
    id: 'folder-tenant-finance',
    name: 'Finance & Compliance',
    type: 'FOLDER',
    driveType: 'TENANT_SHARED',
    parentId: null,
    ownerId: 'sys-admin',
    ownerName: 'System Admin',
    sizeBytes: 1540000,
    isFavorite: true,
    status: 'ACTIVE',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-07-20T14:30:00Z',
    recordsMetadata: {
      recordNumber: 'REC-2026-00010',
      classification: 'CONFIDENTIAL',
      retentionScheduleId: 'ds-1',
      retentionScheduleName: '7-Year Tax & Financial Records',
      retentionExpiryDate: '2033-06-01',
      disposalAction: 'ARCHIVE',
      isLegalHold: true,
      legalHoldReason: 'Q2 2026 SEC Audit Hold',
      legalHoldAppliedBy: 'Sarah Jenkins (Legal Lead)',
      legalHoldAppliedAt: '2026-06-15T10:00:00Z',
      subjectTags: ['Finance', 'Tax', 'SEC Audit'],
      securityLevel: 'High'
    },
    versions: [],
    auditLogs: [
      { id: 'log-1', itemId: 'folder-tenant-finance', timestamp: '2026-06-15T10:00:00Z', actor: 'Sarah Jenkins', action: 'LEGAL_HOLD_APPLIED', details: 'Applied legal hold: Q2 2026 SEC Audit Hold' }
    ]
  },
  {
    id: 'folder-tenant-hr',
    name: 'Human Resources & Policies',
    type: 'FOLDER',
    driveType: 'TENANT_SHARED',
    parentId: null,
    ownerId: 'sys-admin',
    ownerName: 'System Admin',
    sizeBytes: 890000,
    isFavorite: false,
    status: 'ACTIVE',
    createdAt: '2026-06-05T11:20:00Z',
    updatedAt: '2026-07-15T09:10:00Z',
    recordsMetadata: {
      recordNumber: 'REC-2026-00014',
      classification: 'INTERNAL',
      retentionScheduleId: 'ds-3',
      retentionScheduleName: 'Permanent Corporate Governance',
      retentionExpiryDate: '2076-06-05',
      disposalAction: 'REVIEW',
      isLegalHold: false,
      subjectTags: ['HR', 'Policies', 'Governance']
    },
    versions: [],
    auditLogs: []
  },
  {
    id: 'doc-tenant-tax-report',
    name: '2026 Tax Return Audit Briefing',
    type: 'DOCUMENT',
    driveType: 'TENANT_SHARED',
    parentId: 'folder-tenant-finance',
    ownerId: 'user-sarah',
    ownerName: 'Sarah Jenkins',
    sizeBytes: 45000,
    mimeType: 'application/vnd.aurora.doc',
    content: `<h1>2026 Tax Return Audit Briefing</h1><p><strong>Prepared for:</strong> {{tenant.name}}</p><p><strong>Lead Auditor:</strong> {{party.firstName}} {{party.familyName}} ({{party.workEmail}})</p><hr/><p>This document details the tax compliance status and financial reporting metrics for the current fiscal quarter. All figures presented herein are synchronized with {{catalog.itemCode}} pricing standards.</p><h2>1. Executive Summary</h2><p>Our operational evaluation confirms full compliance across internal revenue benchmarks.</p><blockquote><p>Status: Verified & Immutable under Legal Hold REC-2026-00912.</p></blockquote>`,
    isFavorite: true,
    status: 'ACTIVE',
    createdAt: '2026-07-10T14:00:00Z',
    updatedAt: '2026-07-24T16:45:00Z',
    recordsMetadata: {
      recordNumber: 'REC-2026-00912',
      classification: 'RESTRICTED',
      retentionScheduleId: 'ds-1',
      retentionScheduleName: '7-Year Tax & Financial Records',
      retentionExpiryDate: '2033-07-10',
      disposalAction: 'ARCHIVE',
      isLegalHold: true,
      legalHoldReason: 'SEC Regulatory Review 2026',
      legalHoldAppliedBy: 'David Vance (Legal Counsel)',
      legalHoldAppliedAt: '2026-07-11T09:30:00Z',
      subjectTags: ['Tax', 'SEC', 'Audit Brief']
    },
    versions: [
      { id: 'v1', versionNumber: 1, updatedBy: 'Sarah Jenkins', updatedAt: '2026-07-10T14:00:00Z', sizeBytes: 42000, note: 'Initial draft' },
      { id: 'v2', versionNumber: 2, updatedBy: 'Sarah Jenkins', updatedAt: '2026-07-24T16:45:00Z', sizeBytes: 45000, note: 'Added merge fields and audit quotes' }
    ],
    auditLogs: [
      { id: 'log-10', itemId: 'doc-tenant-tax-report', timestamp: '2026-07-10T14:00:00Z', actor: 'Sarah Jenkins', action: 'CREATE', details: 'Document created in Finance & Compliance' },
      { id: 'log-11', itemId: 'doc-tenant-tax-report', timestamp: '2026-07-11T09:30:00Z', actor: 'David Vance', action: 'LEGAL_HOLD_APPLIED', details: 'Applied legal hold: SEC Regulatory Review 2026' }
    ]
  },

  // Personal "My Drive" Folders & Files
  {
    id: 'folder-personal-projects',
    name: 'My Personal Research',
    type: 'FOLDER',
    driveType: 'PERSONAL',
    parentId: null,
    ownerId: 'current-user',
    ownerName: 'You',
    sizeBytes: 320000,
    isFavorite: true,
    status: 'ACTIVE',
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-22T11:15:00Z',
    recordsMetadata: {
      recordNumber: 'REC-2026-00401',
      classification: 'INTERNAL',
      isLegalHold: false
    },
    versions: [],
    auditLogs: []
  },
  {
    id: 'doc-personal-brief',
    name: 'Project Orion Strategy Notes',
    type: 'DOCUMENT',
    driveType: 'PERSONAL',
    parentId: 'folder-personal-projects',
    ownerId: 'current-user',
    ownerName: 'You',
    sizeBytes: 18500,
    mimeType: 'application/vnd.aurora.doc',
    content: `<h1>Project Orion Strategy Notes</h1><p><strong>Organization:</strong> {{tenant.name}}</p><p><strong>Target Contact:</strong> {{party.firstName}} {{party.familyName}}</p><p>Drafting key architecture milestones for the upcoming quarter. All deliverables must align with internal governance policies.</p>`,
    isFavorite: false,
    status: 'ACTIVE',
    createdAt: '2026-07-22T11:15:00Z',
    updatedAt: '2026-07-25T08:20:00Z',
    recordsMetadata: {
      recordNumber: 'REC-2026-00588',
      classification: 'INTERNAL',
      retentionScheduleId: 'ds-2',
      retentionScheduleName: '3-Year Operational Records',
      retentionExpiryDate: '2029-07-22',
      disposalAction: 'SOFT_DELETE',
      isLegalHold: false
    },
    versions: [
      { id: 'pv1', versionNumber: 1, updatedBy: 'You', updatedAt: '2026-07-22T11:15:00Z', sizeBytes: 18500, note: 'Initial creation' }
    ],
    auditLogs: [
      { id: 'plog-1', itemId: 'doc-personal-brief', timestamp: '2026-07-22T11:15:00Z', actor: 'You', action: 'CREATE', details: 'Document created in My Personal Research' }
    ]
  }
];

export class DriveService {
  private static getItems(): DriveItem[] {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ITEMS;
    }
  }

  private static saveItems(items: DriveItem[]) {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }

  static getAllItems(driveType?: DriveType): DriveItem[] {
    const items = this.getItems();
    if (!driveType) return items;
    return items.filter(item => item.driveType === driveType);
  }

  static getItemById(id: string): DriveItem | undefined {
    return this.getItems().find(item => item.id === id);
  }

  static getChildren(parentId: string | null, driveType: DriveType): DriveItem[] {
    return this.getItems().filter(item => 
      item.driveType === driveType && 
      item.parentId === parentId && 
      item.status === 'ACTIVE'
    );
  }

  static getFavorites(): DriveItem[] {
    return this.getItems().filter(item => item.isFavorite && item.status === 'ACTIVE');
  }

  static getRecent(): DriveItem[] {
    return this.getItems()
      .filter(item => item.status === 'ACTIVE')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  static getTrash(): DriveItem[] {
    return this.getItems().filter(item => item.status === 'TRASHED');
  }

  static getRecordsUnderGovernance(): DriveItem[] {
    return this.getItems().filter(item => 
      item.status === 'ACTIVE' && 
      (item.recordsMetadata.isLegalHold || item.recordsMetadata.retentionScheduleId)
    );
  }

  static createFolder(name: string, driveType: DriveType, parentId: string | null, ownerName: string = 'You'): DriveItem {
    const items = this.getItems();
    const newFolder: DriveItem = {
      id: `folder-${Date.now()}`,
      name,
      type: 'FOLDER',
      driveType,
      parentId,
      ownerId: 'current-user',
      ownerName,
      sizeBytes: 0,
      isFavorite: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordsMetadata: {
        recordNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        classification: 'INTERNAL',
        isLegalHold: false
      },
      versions: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          itemId: `folder-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: ownerName,
          action: 'CREATE',
          details: `Created folder "${name}"`
        }
      ]
    };

    items.push(newFolder);
    this.saveItems(items);
    return newFolder;
  }

  static saveDocument(
    id: string | null,
    name: string,
    content: string,
    driveType: DriveType,
    parentId: string | null,
    ownerName: string = 'You'
  ): DriveItem {
    const items = this.getItems();
    const now = new Date().toISOString();

    if (id) {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        const existing = items[index];
        const newVersionNumber = (existing.versions.length || 1) + 1;
        
        existing.name = name;
        existing.content = content;
        existing.driveType = driveType;
        existing.parentId = parentId;
        existing.updatedAt = now;
        existing.sizeBytes = content.length * 2;

        existing.versions.unshift({
          id: `v-${Date.now()}`,
          versionNumber: newVersionNumber,
          updatedBy: ownerName,
          updatedAt: now,
          sizeBytes: content.length * 2,
          note: `Version ${newVersionNumber} saved`
        });
        existing.auditLogs.unshift({
          id: `log-${Date.now()}`,
          itemId: existing.id,
          timestamp: now,
          actor: ownerName,
          action: 'SAVE_DOCUMENT',
          details: `Updated document "${name}" (Version ${newVersionNumber})`
        });

        this.saveItems(items);
        return existing;
      }
    }

    // New Document
    const newDoc: DriveItem = {
      id: `doc-${Date.now()}`,
      name,
      type: 'DOCUMENT',
      driveType,
      parentId,
      ownerId: 'current-user',
      ownerName,
      sizeBytes: content.length * 2,
      mimeType: 'application/vnd.aurora.doc',
      content,
      isFavorite: false,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      recordsMetadata: {
        recordNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        classification: 'INTERNAL',
        isLegalHold: false
      },
      versions: [
        {
          id: `v-1`,
          versionNumber: 1,
          updatedBy: ownerName,
          updatedAt: now,
          sizeBytes: content.length * 2,
          note: 'Initial version created'
        }
      ],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          itemId: `doc-${Date.now()}`,
          timestamp: now,
          actor: ownerName,
          action: 'CREATE',
          details: `Created new document "${name}"`
        }
      ]
    };

    items.push(newDoc);
    this.saveItems(items);
    return newDoc;
  }

  static uploadFile(
    file: File,
    driveType: DriveType,
    parentId: string | null,
    ownerName: string = 'You'
  ): DriveItem {
    const items = this.getItems();
    const now = new Date().toISOString();

    const newFile: DriveItem = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: 'FILE',
      driveType,
      parentId,
      ownerId: 'current-user',
      ownerName,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      isFavorite: false,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      recordsMetadata: {
        recordNumber: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        classification: 'INTERNAL',
        isLegalHold: false
      },
      versions: [
        {
          id: `v-1`,
          versionNumber: 1,
          updatedBy: ownerName,
          updatedAt: now,
          sizeBytes: file.size,
          note: 'Uploaded file'
        }
      ],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          itemId: `file-${Date.now()}`,
          timestamp: now,
          actor: ownerName,
          action: 'CREATE',
          details: `Uploaded file "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`
        }
      ]
    };

    items.push(newFile);
    this.saveItems(items);
    return newFile;
  }

  static toggleFavorite(id: string): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;
    item.isFavorite = !item.isFavorite;
    this.saveItems(items);
    return item;
  }

  static updateItemName(id: string, newName: string, actor: string = 'You'): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;
    
    if (item.recordsMetadata.isLegalHold) {
      throw new Error(`Cannot rename "${item.name}": Active legal hold prohibits modification.`);
    }

    const oldName = item.name;
    item.name = newName;
    item.updatedAt = new Date().toISOString();
    item.auditLogs.unshift({
      id: `log-${Date.now()}`,
      itemId: id,
      timestamp: new Date().toISOString(),
      actor,
      action: 'UPDATE',
      details: `Renamed item from "${oldName}" to "${newName}"`
    });

    this.saveItems(items);
    return item;
  }

  static moveItem(id: string, targetParentId: string | null, targetDriveType: DriveType, actor: string = 'You'): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;

    if (item.recordsMetadata.isLegalHold) {
      throw new Error(`Cannot move "${item.name}": Active legal hold prohibits item relocation.`);
    }

    item.parentId = targetParentId;
    item.driveType = targetDriveType;
    item.updatedAt = new Date().toISOString();
    item.auditLogs.unshift({
      id: `log-${Date.now()}`,
      itemId: id,
      timestamp: new Date().toISOString(),
      actor,
      action: 'MOVE',
      details: `Moved item to drive type ${targetDriveType} (Parent: ${targetParentId || 'Root'})`
    });

    this.saveItems(items);
    return item;
  }

  static softDeleteItem(id: string, actor: string = 'You'): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;

    if (item.recordsMetadata.isLegalHold) {
      throw new Error(`Cannot delete "${item.name}": Immutable Legal Hold is active.`);
    }

    item.status = 'TRASHED';
    item.updatedAt = new Date().toISOString();
    item.auditLogs.unshift({
      id: `log-${Date.now()}`,
      itemId: id,
      timestamp: new Date().toISOString(),
      actor,
      action: 'DELETE',
      details: `Moved item to Recycling Bin`
    });

    this.saveItems(items);
    return item;
  }

  static restoreItem(id: string, actor: string = 'You'): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;

    item.status = 'ACTIVE';
    item.updatedAt = new Date().toISOString();
    item.auditLogs.unshift({
      id: `log-${Date.now()}`,
      itemId: id,
      timestamp: new Date().toISOString(),
      actor,
      action: 'RESTORE',
      details: `Restored item from Recycling Bin`
    });

    this.saveItems(items);
    return item;
  }

  static toggleLegalHold(id: string, reason?: string, actor: string = 'You'): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;

    const isHold = !item.recordsMetadata.isLegalHold;
    item.recordsMetadata.isLegalHold = isHold;

    if (isHold) {
      item.recordsMetadata.legalHoldReason = reason || 'Regulatory compliance hold';
      item.recordsMetadata.legalHoldAppliedBy = actor;
      item.recordsMetadata.legalHoldAppliedAt = new Date().toISOString();
      item.auditLogs.unshift({
        id: `log-${Date.now()}`,
        itemId: id,
        timestamp: new Date().toISOString(),
        actor,
        action: 'LEGAL_HOLD_APPLIED',
        details: `Legal hold applied: ${item.recordsMetadata.legalHoldReason}`
      });
    } else {
      item.recordsMetadata.legalHoldReason = undefined;
      item.recordsMetadata.legalHoldAppliedBy = undefined;
      item.recordsMetadata.legalHoldAppliedAt = undefined;
      item.auditLogs.unshift({
        id: `log-${Date.now()}`,
        itemId: id,
        timestamp: new Date().toISOString(),
        actor,
        action: 'LEGAL_HOLD_REMOVED',
        details: `Legal hold released`
      });
    }

    this.saveItems(items);
    return item;
  }

  static updateRecordsMetadata(
    id: string,
    classification: DocumentClassification,
    scheduleId?: string,
    subjectTags?: string[],
    actor: string = 'You'
  ): DriveItem | undefined {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return undefined;

    item.recordsMetadata.classification = classification;
    if (subjectTags) {
      item.recordsMetadata.subjectTags = subjectTags;
    }

    if (scheduleId) {
      const schedule = DEFAULT_DISPOSAL_SCHEDULES.find(s => s.id === scheduleId);
      if (schedule) {
        item.recordsMetadata.retentionScheduleId = schedule.id;
        item.recordsMetadata.retentionScheduleName = schedule.name;
        item.recordsMetadata.disposalAction = schedule.action;

        // Compute expiry date
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + schedule.retentionPeriodMonths);
        item.recordsMetadata.retentionExpiryDate = expDate.toISOString().split('T')[0];
      }
    }

    item.auditLogs.unshift({
      id: `log-${Date.now()}`,
      itemId: id,
      timestamp: new Date().toISOString(),
      actor,
      action: 'RECORD_METADATA_UPDATE',
      details: `Updated compliance metadata (Classification: ${classification})`
    });

    this.saveItems(items);
    return item;
  }

  static evaluateMergeFields(text: string, customTokens: Record<string, string> = {}): string {
    let result = text;
    // System sample dictionary
    const mergedValues: Record<string, string> = {
      'party.firstName': 'Sarah',
      'party.familyName': 'Jenkins',
      'party.workEmail': 's.jenkins@acme.corp',
      'party.organizationName': 'Acme Global Holdings',
      'member.position': 'Senior Financial Analyst',
      'member.team': 'Global Operations',
      'catalog.itemCode': 'SKU-99481',
      'catalog.unitPrice': '$4,850.00',
      'tenant.name': 'Aurora Enterprise Workspace',
      'system.currentDate': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      'record.number': `REC-${new Date().getFullYear()}-00912`,
      ...customTokens
    };

    Object.entries(mergedValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }
}

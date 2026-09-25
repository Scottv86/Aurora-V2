import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { globalPrisma } from '../lib/prisma';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { emitTenantUpdate } from '../socket';
import { FileMetadataExtractor } from '../lib/fileMetadataExtractor';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.warn('[DocumentService] Failed to create uploads directory:', err);
  }
}

export interface UploadDocumentParams {
  tenantId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  uploadedBy?: string;
  classification?: string;
  documentType?: string;
  retentionScheduleId?: string;
  sourceType?: string;
  moduleId?: string;
  recordId?: string;
  fieldId?: string;
  folderId?: string;
  ocrText?: string;
  aiSummary?: string;
  aiMetadata?: any;
}

export interface StorageProviderResult {
  provider: 'local' | 'supabase';
  storagePath: string;
  url?: string;
}

export class DocumentStorageProvider {
  static async saveFile(
    tenantId: string,
    fileId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StorageProviderResult> {
    const ext = path.extname(filename) || '';
    const safeKey = `${tenantId}/${fileId}${ext}`;

    // 1. Try Supabase Storage if configured and available
    if (supabaseAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('documents')
          .upload(safeKey, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (!error && data) {
          const { data: publicData } = supabaseAdmin.storage.from('documents').getPublicUrl(safeKey);
          return {
            provider: 'supabase',
            storagePath: safeKey,
            url: publicData?.publicUrl || undefined
          };
        }
      } catch (err) {
        console.warn('[DocumentStorage] Supabase storage upload failed, falling back to local:', err);
      }
    }

    // 2. Local Disk Fallback
    const tenantDir = path.join(UPLOADS_DIR, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    const localFilePath = path.join(tenantDir, `${fileId}${ext}`);
    fs.writeFileSync(localFilePath, buffer);

    return {
      provider: 'local',
      storagePath: path.relative(process.cwd(), localFilePath).replace(/\\/g, '/'),
      url: `/api/documents/stream/${fileId}`
    };
  }

  static async readFile(storageProvider: string, storagePath: string): Promise<Buffer | null> {
    if (storageProvider === 'supabase' && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.storage.from('documents').download(storagePath);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.warn('[DocumentStorage] Supabase read failed:', err);
      }
    }

    // Local Disk
    const fullPath = path.resolve(process.cwd(), storagePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
    return null;
  }

  static async deleteFile(storageProvider: string, storagePath: string): Promise<boolean> {
    if (storageProvider === 'supabase' && supabaseAdmin) {
      try {
        await supabaseAdmin.storage.from('documents').remove([storagePath]);
        return true;
      } catch (err) {
        console.warn('[DocumentStorage] Supabase delete failed:', err);
      }
    }

    const fullPath = path.resolve(process.cwd(), storagePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        return true;
      } catch (err) {
        console.warn('[DocumentStorage] Local file unlink failed:', err);
      }
    }
    return false;
  }
}

export class DocumentService {
  /**
   * Calculate SHA-256 checksum
   */
  static calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Resolve Valid Tenant ID from database, preventing foreign key constraint errors
   */
  static async resolveValidTenantId(rawTenantId?: string, userTenantIds?: string[]): Promise<string> {
    if (rawTenantId && rawTenantId !== 'tenant_default' && rawTenantId !== 'default-tenant') {
      const direct = await globalPrisma.tenant.findUnique({ where: { id: rawTenantId }, select: { id: true } });
      if (direct) return direct.id;

      // Try by subdomain
      const bySubdomain = await globalPrisma.tenant.findUnique({ where: { subdomain: rawTenantId }, select: { id: true } });
      if (bySubdomain) return bySubdomain.id;
    }

    if (userTenantIds && userTenantIds.length > 0) {
      for (const uId of userTenantIds) {
        const userTenant = await globalPrisma.tenant.findUnique({ where: { id: uId }, select: { id: true } });
        if (userTenant) return userTenant.id;
      }
    }

    // Fallback to first available tenant in database
    const firstTenant = await globalPrisma.tenant.findFirst({ select: { id: true } });
    if (firstTenant) return firstTenant.id;

    throw new Error('No active tenant found in database');
  }

  /**
   * Seed default disposal schedules if not present for a tenant
   */
  static async ensureDefaultDisposalSchedules(tenantId: string) {
    const validTenantId = await this.resolveValidTenantId(tenantId);
    const existing = await globalPrisma.universalDisposalSchedule.count({ where: { tenantId: validTenantId } });
    if (existing > 0) return;

    const defaults = [
      {
        name: '7-Year Tax & Financial Records',
        moduleScope: 'Finance / Pricing Catalog',
        documentType: 'TAX_INVOICE',
        retentionPeriodMonths: 84,
        durationLabel: '7 Years',
        action: 'ARCHIVE',
        requiresApproval: true,
        description: 'Mandatory statutory retention for invoices, receipts, and financial audit files.'
      },
      {
        name: '3-Year Operational Records',
        moduleScope: 'Operations / Tasks',
        documentType: 'OPERATIONAL_DOC',
        retentionPeriodMonths: 36,
        durationLabel: '3 Years',
        action: 'SOFT_DELETE',
        requiresApproval: false,
        description: 'Routine operational documents and team correspondence.'
      },
      {
        name: 'Permanent Corporate Governance',
        moduleScope: 'Organization / Executive',
        documentType: 'GOVERNANCE',
        retentionPeriodMonths: 1200,
        durationLabel: 'Permanent',
        action: 'REVIEW',
        requiresApproval: true,
        description: 'Board resolutions, constitution, and key legal deeds.'
      },
      {
        name: '90-Day Temporary & Scratch Records',
        moduleScope: 'General / Forms',
        documentType: 'TEMPORARY',
        retentionPeriodMonths: 3,
        durationLabel: '90 Days',
        action: 'PERMANENT_PURGE',
        requiresApproval: false,
        description: 'Transient form uploads, verification checks, and temporary files.'
      }
    ];

    for (const d of defaults) {
      await globalPrisma.universalDisposalSchedule.create({
        data: {
          tenantId: validTenantId,
          ...d
        }
      });
    }
  }

  /**
   * Upload & Ingest Document
   */
  static async uploadDocument(params: UploadDocumentParams) {
    const {
      tenantId: rawTenantId,
      fileBuffer,
      originalFilename,
      mimeType,
      uploadedBy = 'System',
      classification = 'INTERNAL',
      documentType = 'GENERAL',
      retentionScheduleId,
      sourceType,
      moduleId,
      recordId,
      fieldId,
      folderId,
      ocrText,
      aiSummary,
      aiMetadata
    } = params;

    const tenantId = await this.resolveValidTenantId(rawTenantId);
    await this.ensureDefaultDisposalSchedules(tenantId);

    const sha256 = this.calculateSha256(fileBuffer);
    const fileId = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Physical storage
    const storageResult = await DocumentStorageProvider.saveFile(
      tenantId,
      fileId,
      originalFilename,
      fileBuffer,
      mimeType
    );

    // Calculate Retention Expiry
    let retentionExpiryDate: Date | null = null;
    let disposalAction = 'ARCHIVE';
    let schedule = null;

    if (retentionScheduleId) {
      schedule = await globalPrisma.universalDisposalSchedule.findUnique({
        where: { id: retentionScheduleId }
      });
    } else {
      // Auto-assign schedule matching documentType
      schedule = await globalPrisma.universalDisposalSchedule.findFirst({
        where: { tenantId, documentType }
      });
    }

    if (schedule) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + schedule.retentionPeriodMonths);
      retentionExpiryDate = exp;
      disposalAction = schedule.action;
    }

    // Extract technical file metadata (EXIF, GPS, dimensions, PDF info, hashes)
    const technicalMetadata = FileMetadataExtractor.extract(fileBuffer, originalFilename, mimeType);
    const finalMetadata = {
      ...(aiMetadata || {}),
      technicalMetadata
    };

    // Create Document record
    const document = await globalPrisma.universalDocument.create({
      data: {
        id: fileId,
        tenantId,
        name: originalFilename,
        originalFilename,
        mimeType,
        sizeBytes: fileBuffer.length,
        sha256,
        storageProvider: storageResult.provider,
        storagePath: storageResult.storagePath,
        url: storageResult.url,
        classification,
        documentType,
        retentionScheduleId: schedule?.id || null,
        retentionExpiryDate,
        disposalAction,
        isLegalHold: false,
        ocrText,
        aiSummary,
        aiMetadata: finalMetadata,
        uploadedBy,
        versions: {
          create: {
            versionNumber: 1,
            storagePath: storageResult.storagePath,
            sizeBytes: fileBuffer.length,
            sha256,
            note: 'Initial upload',
            createdBy: uploadedBy
          }
        },
        auditLogs: {
          create: {
            tenantId,
            action: 'UPLOAD',
            actor: uploadedBy,
            details: `Uploaded initial version of "${originalFilename}" (${(fileBuffer.length / 1024).toFixed(1)} KB)`
          }
        }
      },
      include: {
        versions: true,
        links: true,
        retentionSchedule: true
      }
    });

    // Create polymorphic link if context provided
    if (sourceType || recordId || moduleId || folderId) {
      await globalPrisma.universalDocumentLink.create({
        data: {
          documentId: document.id,
          tenantId,
          sourceType: sourceType || (recordId ? 'RECORD' : folderId ? 'DRIVE' : 'GENERAL'),
          moduleId: moduleId || null,
          recordId: recordId || null,
          fieldId: fieldId || null,
          folderId: folderId || null
        }
      });
    }

    return document;
  }

  /**
   * Upload New Version of Document
   */
  static async uploadNewVersion(
    documentId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    actor: string = 'User',
    note?: string
  ) {
    const document = await globalPrisma.universalDocument.findUnique({
      where: { id: documentId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (document.isLegalHold) {
      throw new Error(`Cannot modify "${document.name}": Active Legal Hold is enforced.`);
    }

    if (document.isWormLocked) {
      throw new Error(`Cannot modify "${document.name}": Cryptographic WORM retention lock is active.`);
    }

    const currentVersion = document.versions[0]?.versionNumber || 1;
    const nextVersionNumber = currentVersion + 1;
    const sha256 = this.calculateSha256(fileBuffer);
    const fileId = `${documentId}_v${nextVersionNumber}`;

    const storageResult = await DocumentStorageProvider.saveFile(
      document.tenantId,
      fileId,
      filename,
      fileBuffer,
      mimeType
    );

    // Create version & update root document
    const updated = await globalPrisma.$transaction([
      globalPrisma.universalDocumentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          storagePath: storageResult.storagePath,
          sizeBytes: fileBuffer.length,
          sha256,
          note: note || `Uploaded version ${nextVersionNumber}`,
          createdBy: actor
        }
      }),
      globalPrisma.universalDocument.update({
        where: { id: documentId },
        data: {
          sizeBytes: fileBuffer.length,
          storagePath: storageResult.storagePath,
          sha256,
          updatedAt: new Date()
        }
      }),
      globalPrisma.universalDocumentAuditLog.create({
        data: {
          documentId,
          tenantId: document.tenantId,
          action: 'VERSION_UPLOAD',
          actor,
          details: `Uploaded version ${nextVersionNumber} (${(fileBuffer.length / 1024).toFixed(1)} KB)`
        }
      })
    ]);

    return updated[1];
  }

  /**
   * Toggle Legal Hold
   */
  static async toggleLegalHold(documentId: string, actor: string, reason?: string) {
    const doc = await globalPrisma.universalDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    const nextHold = !doc.isLegalHold;
    const updated = await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: {
        isLegalHold: nextHold,
        legalHoldReason: nextHold ? (reason || 'Statutory/Audit Hold') : null,
        legalHoldAppliedBy: nextHold ? actor : null,
        legalHoldAppliedAt: nextHold ? new Date() : null
      }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        documentId,
        tenantId: doc.tenantId,
        action: nextHold ? 'LEGAL_HOLD_APPLIED' : 'LEGAL_HOLD_REMOVED',
        actor,
        details: nextHold
          ? `Legal hold applied: ${reason || 'Statutory hold'}`
          : 'Legal hold released'
      }
    });

    return updated;
  }

  /**
   * Update Classification
   */
  static async updateClassification(
    documentId: string,
    classification: string,
    retentionScheduleId?: string,
    actor: string = 'User'
  ) {
    const doc = await globalPrisma.universalDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (doc.isLegalHold) {
      throw new Error(`Cannot reclassify "${doc.name}": Active Legal Hold is enforced.`);
    }

    let retentionExpiryDate = doc.retentionExpiryDate;
    let disposalAction = doc.disposalAction;

    if (retentionScheduleId) {
      const schedule = await globalPrisma.universalDisposalSchedule.findUnique({
        where: { id: retentionScheduleId }
      });
      if (schedule) {
        const exp = new Date();
        exp.setMonth(exp.getMonth() + schedule.retentionPeriodMonths);
        retentionExpiryDate = exp;
        disposalAction = schedule.action;
      }
    }

    const updated = await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: {
        classification,
        retentionScheduleId: retentionScheduleId || doc.retentionScheduleId,
        retentionExpiryDate,
        disposalAction
      }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        documentId,
        tenantId: doc.tenantId,
        action: 'RECLASSIFY',
        actor,
        details: `Reclassified document to "${classification}"`
      }
    });

    return updated;
  }

  /**
   * Soft Delete or Purge
   */
  static async deleteDocument(documentId: string, actor: string = 'User', permanent: boolean = false) {
    const doc = await globalPrisma.universalDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (doc.isLegalHold) {
      throw new Error(`Cannot delete "${doc.name}": Active Legal Hold is enforced.`);
    }

    if (doc.isWormLocked) {
      throw new Error(`Cannot delete "${doc.name}": Cryptographic WORM retention lock is active.`);
    }

    if (!permanent) {
      const updated = await globalPrisma.universalDocument.update({
        where: { id: documentId },
        data: { status: 'TRASHED' }
      });

      // Synchronize with Aurora Central Recycling Bin (30-day retention before permanent shredding)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      try {
        const trashItem = await (globalPrisma as any).recyclingBinItem.create({
          data: {
            tenantId: doc.tenantId,
            itemType: 'DOCUMENT',
            itemId: doc.id,
            title: doc.originalFilename || doc.name,
            subtitle: `Classification: ${doc.classification} • Type: ${doc.documentType}`,
            payload: {
              documentId: doc.id,
              name: doc.name,
              originalFilename: doc.originalFilename,
              classification: doc.classification,
              documentType: doc.documentType,
              sha256: doc.sha256,
              storagePath: doc.storagePath,
              storageProvider: doc.storageProvider
            },
            deletedBy: actor,
            deletedAt: new Date(),
            expiresAt
          }
        });
        emitTenantUpdate(doc.tenantId, 'recycling_bin_updated', { action: 'add', item: trashItem });
      } catch (err: any) {
        console.warn('[DocumentService] Failed to create recycling bin item:', err?.message || err);
      }

      await globalPrisma.universalDocumentAuditLog.create({
        data: {
          documentId,
          tenantId: doc.tenantId,
          action: 'SOFT_DELETE',
          actor,
          details: 'Moved document to Recycling Bin (30-day recovery grace period)'
        }
      });
      return updated;
    }

    // Permanent Purge: Remove from storage and record formal Certificate of Destruction
    await DocumentStorageProvider.deleteFile(doc.storageProvider, doc.storagePath);

    // Clean up any corresponding recycling bin entry
    try {
      await (globalPrisma as any).recyclingBinItem.deleteMany({
        where: {
          tenantId: doc.tenantId,
          itemId: documentId
        }
      });
      emitTenantUpdate(doc.tenantId, 'recycling_bin_updated', { action: 'delete', itemId: documentId });
    } catch {}

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        documentId,
        tenantId: doc.tenantId,
        action: 'DISPOSAL_PURGED',
        actor,
        details: `Permanently destroyed document. SHA-256 fingerprint: ${doc.sha256}`
      }
    });

    return globalPrisma.universalDocument.delete({
      where: { id: documentId }
    });
  }

  /**
   * Get Documents for Record
   */
  static async getDocumentsForRecord(rawTenantId: string, recordId: string) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const links = await globalPrisma.universalDocumentLink.findMany({
      where: { tenantId, recordId },
      include: {
        document: {
          include: {
            versions: { orderBy: { versionNumber: 'desc' } },
            retentionSchedule: true,
            auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
          }
        }
      }
    });
    return links.map(l => ({ ...l.document, linkId: l.id, fieldId: l.fieldId }));
  }

  /**
   * Get Documents under Governance (Legal Hold or Expiring)
   */
  static async getGovernanceQueue(rawTenantId: string) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const now = new Date();
    const [holds, expiring, pendingDisposal] = await Promise.all([
      globalPrisma.universalDocument.findMany({
        where: { tenantId, isLegalHold: true },
        include: { retentionSchedule: true }
      }),
      globalPrisma.universalDocument.findMany({
        where: {
          tenantId,
          retentionExpiryDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          status: 'ACTIVE'
        },
        include: { retentionSchedule: true }
      }),
      globalPrisma.universalDocument.findMany({
        where: {
          tenantId,
          retentionExpiryDate: { lte: now },
          isLegalHold: false
        },
        include: { retentionSchedule: true }
      })
    ]);

    return {
      activeLegalHolds: holds,
      expiringWithin30Days: expiring,
      pendingDisposal
    };
  }

  /**
   * eDiscovery Cross-Platform Search
   */
  static async searchDocuments(rawTenantId: string, query: string, filters: any = {}) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const { classification, documentType, isLegalHold, moduleId, status } = filters;
    const where: any = { tenantId };

    if (classification) where.classification = classification;
    if (documentType) where.documentType = documentType;
    if (isLegalHold !== undefined) where.isLegalHold = isLegalHold === 'true' || isLegalHold === true;
    if (status) where.status = status;

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { ocrText: { contains: query, mode: 'insensitive' } },
        { aiSummary: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (moduleId) {
      where.links = {
        some: { moduleId }
      };
    }

    return globalPrisma.universalDocument.findMany({
      where,
      include: {
        links: true,
        retentionSchedule: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
  }

  /**
   * Add In-Viewer Pin Annotation
   */
  static async addAnnotation(
    rawTenantId: string,
    documentId: string,
    annotation: {
      xPercent: number;
      yPercent: number;
      pageNumber?: number;
      comment: string;
      authorName: string;
      authorAvatar?: string;
    },
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: documentId, tenantId }
    });
    if (!doc) throw new Error('Document not found');

    const metadata: any = (doc.aiMetadata as any) || {};
    const existingAnnotations: any[] = Array.isArray(metadata.annotations) ? metadata.annotations : [];

    const newAnnotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      xPercent: annotation.xPercent,
      yPercent: annotation.yPercent,
      pageNumber: annotation.pageNumber || 1,
      authorId: actorUser?.id,
      authorName: annotation.authorName || actorUser?.name || 'User',
      comments: [
        {
          id: `comm_${Date.now()}`,
          authorId: actorUser?.id,
          authorName: annotation.authorName || actorUser?.name || 'User',
          authorAvatar: annotation.authorAvatar || actorUser?.avatar,
          content: annotation.comment,
          createdAt: new Date().toISOString()
        }
      ],
      isResolved: false,
      createdAt: new Date().toISOString()
    };

    metadata.annotations = [...existingAnnotations, newAnnotation];

    const updated = await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: { aiMetadata: metadata }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: 'ANNOTATED',
        actor: actorUser?.name || 'User',
        actorId: actorUser?.id,
        details: `Added pin annotation at (${annotation.xPercent.toFixed(1)}%, ${annotation.yPercent.toFixed(1)}%): "${annotation.comment.slice(0, 60)}"`,
        metadata: { annotationId: newAnnotation.id }
      }
    });

    emitTenantUpdate(tenantId, 'documents', { documentId, action: 'ANNOTATED' });
    return newAnnotation;
  }

  /**
   * Resolve / Re-open Annotation
   */
  static async resolveAnnotation(
    rawTenantId: string,
    documentId: string,
    annotationId: string,
    isResolved: boolean = true,
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: documentId, tenantId }
    });
    if (!doc) throw new Error('Document not found');

    const metadata: any = (doc.aiMetadata as any) || {};
    const existingAnnotations: any[] = Array.isArray(metadata.annotations) ? metadata.annotations : [];

    metadata.annotations = existingAnnotations.map(ann => {
      if (ann.id === annotationId) {
        return { ...ann, isResolved, updatedAt: new Date().toISOString() };
      }
      return ann;
    });

    await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: { aiMetadata: metadata }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: 'ANNOTATION_RESOLVED',
        actor: actorUser?.name || 'User',
        actorId: actorUser?.id,
        details: `${isResolved ? 'Resolved' : 'Reopened'} pin annotation ${annotationId}`,
        metadata: { annotationId, isResolved }
      }
    });

    emitTenantUpdate(tenantId, 'documents', { documentId, action: 'ANNOTATION_RESOLVED' });
    return { success: true, isResolved };
  }

  /**
   * Formal In-Drawer Sign-off & E-Signature Stamp
   */
  static async signDocument(
    rawTenantId: string,
    documentId: string,
    signatureData: {
      signatureType: 'DRAW' | 'TYPE' | 'STAMP';
      signerName: string;
      signerEmail: string;
      signatureDataUrl?: string;
      note?: string;
      ipAddress?: string;
    },
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });
    if (!doc) throw new Error('Document not found');

    const latestVersion = doc.versions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    // Generate cryptographic SHA-256 seal of the signature event
    const timestamp = new Date().toISOString();
    const sealData = `${tenantId}:${documentId}:v${nextVersion}:${signatureData.signerName}:${signatureData.signerEmail}:${timestamp}:${doc.sha256 || ''}`;
    const sha256Seal = crypto.createHash('sha256').update(sealData).digest('hex');

    const newSignature = {
      id: `sig_${Date.now()}`,
      signatureType: signatureData.signatureType,
      signerName: signatureData.signerName || actorUser?.name || 'Signer',
      signerEmail: signatureData.signerEmail || actorUser?.email || '',
      signatureDataUrl: signatureData.signatureDataUrl,
      stampedAt: timestamp,
      versionNumber: nextVersion,
      sha256Seal,
      ipAddress: signatureData.ipAddress || '127.0.0.1',
      note: signatureData.note || 'Digitally signed and approved in Aurora Files Workstation'
    };

    const metadata: any = (doc.aiMetadata as any) || {};
    const existingSigs: any[] = Array.isArray(metadata.signatures) ? metadata.signatures : [];
    metadata.signatures = [...existingSigs, newSignature];

    // Create a new version representing the signed state
    await globalPrisma.universalDocumentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersion,
        storagePath: doc.storagePath,
        sizeBytes: doc.sizeBytes,
        sha256: sha256Seal,
        note: `Digital Signature Stamp applied by ${newSignature.signerName} (${newSignature.signatureType})`,
        createdBy: actorUser?.id
      }
    });

    // Update document metadata
    const updated = await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: {
        aiMetadata: metadata,
        updatedAt: new Date()
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        retentionSchedule: true,
        links: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
      }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: 'SIGNED',
        actor: newSignature.signerName,
        actorId: actorUser?.id,
        details: `Applied formal ${signatureData.signatureType} signature stamp creating v${nextVersion}. SHA-256 Seal: ${sha256Seal.slice(0, 16)}...`,
        metadata: newSignature
      }
    });

    emitTenantUpdate(tenantId, 'documents', { documentId, action: 'SIGNED' });
    return updated;
  }

  /**
   * AI PII Redaction & Sanitiser
   */
  static async redactDocument(
    rawTenantId: string,
    documentId: string,
    redactedEntities: string[],
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: documentId, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });
    if (!doc) throw new Error('Document not found');

    const latestVersion = doc.versions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    // Mask detected PII occurrences in OCR text
    let sanitizedText = doc.ocrText || '';
    redactedEntities.forEach(entity => {
      if (entity && entity.trim()) {
        const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        sanitizedText = sanitizedText.replace(regex, '████████');
      }
    });

    // Standard pattern masks for common PII
    sanitizedText = sanitizedText
      .replace(/\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b/g, '███-███-████')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '████-████-████-████');

    const metadata: any = (doc.aiMetadata as any) || {};
    metadata.lastRedaction = {
      redactedAt: new Date().toISOString(),
      entitiesCount: redactedEntities.length,
      redactedBy: actorUser?.name || 'Compliance Officer'
    };

    // Create a new sanitized version
    await globalPrisma.universalDocumentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersion,
        storagePath: doc.storagePath,
        sizeBytes: doc.sizeBytes,
        sha256: crypto.createHash('sha256').update(sanitizedText).digest('hex'),
        note: `AI PII Sanitisation applied: ${redactedEntities.length} sensitive entities redacted`,
        createdBy: actorUser?.id
      }
    });

    const updated = await globalPrisma.universalDocument.update({
      where: { id: documentId },
      data: {
        ocrText: sanitizedText,
        aiMetadata: metadata,
        updatedAt: new Date()
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        retentionSchedule: true,
        links: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 15 }
      }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: 'REDACTED',
        actor: actorUser?.name || 'Compliance Officer',
        actorId: actorUser?.id,
        details: `Redacted ${redactedEntities.length} sensitive entities, creating sanitized version v${nextVersion}`,
        metadata: { redactedEntities }
      }
    });

    emitTenantUpdate(tenantId, 'documents', { documentId, action: 'REDACTED' });
    return updated;
  }

  /**
   * Bulk Operations on Multiple Documents
   */
  static async bulkActions(
    rawTenantId: string,
    documentIds: string[],
    action: 'LEGAL_HOLD_ON' | 'LEGAL_HOLD_OFF' | 'ASSIGN_RDS' | 'TRASH',
    payload?: any,
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    if (!documentIds || documentIds.length === 0) return { affected: 0 };

    let affected = 0;

    for (const docId of documentIds) {
      try {
        if (action === 'LEGAL_HOLD_ON') {
          await globalPrisma.universalDocument.update({
            where: { id: docId },
            data: {
              isLegalHold: true,
              legalHoldReason: payload?.reason || 'Bulk Legal Hold applied',
              legalHoldAppliedBy: actorUser?.name || 'Admin',
              legalHoldAppliedAt: new Date()
            }
          });
          await globalPrisma.universalDocumentAuditLog.create({
            data: {
              documentId: docId,
              tenantId,
              action: 'LEGAL_HOLD_APPLIED',
              actor: actorUser?.name || 'Admin',
              actorId: actorUser?.id,
              details: `Bulk legal hold applied: ${payload?.reason || 'Bulk hold'}`
            }
          });
          affected++;
        } else if (action === 'LEGAL_HOLD_OFF') {
          await globalPrisma.universalDocument.update({
            where: { id: docId },
            data: {
              isLegalHold: false,
              legalHoldReason: null,
              legalHoldAppliedBy: null,
              legalHoldAppliedAt: null
            }
          });
          await globalPrisma.universalDocumentAuditLog.create({
            data: {
              documentId: docId,
              tenantId,
              action: 'LEGAL_HOLD_REMOVED',
              actor: actorUser?.name || 'Admin',
              actorId: actorUser?.id,
              details: 'Bulk legal hold released'
            }
          });
          affected++;
        } else if (action === 'ASSIGN_RDS') {
          if (payload?.retentionScheduleId) {
            await this.assignRetentionSchedule(tenantId, docId, payload.retentionScheduleId, actorUser?.id);
            affected++;
          }
        } else if (action === 'TRASH') {
          await this.deleteDocument(tenantId, docId, false, actorUser?.id);
          affected++;
        }
      } catch (err) {
        console.warn(`[BulkActions] Failed action ${action} on doc ${docId}:`, err);
      }
    }

    emitTenantUpdate(tenantId, 'documents', { action: 'BULK_UPDATE', affected });
    return { affected, success: true };
  }

  /**
   * Merge Multiple Documents into a Unified Master Document Binder
   */
  static async mergeDocuments(
    rawTenantId: string,
    documentIds: string[],
    binderName: string,
    targetContext?: { moduleId?: string; recordId?: string },
    actorUser?: any
  ) {
    const tenantId = await this.resolveValidTenantId(rawTenantId);
    const docs = await globalPrisma.universalDocument.findMany({
      where: { id: { in: documentIds }, tenantId }
    });
    if (docs.length === 0) throw new Error('No valid documents found to merge');

    // Aggregate text and summaries
    const combinedOcr = docs
      .map((d, i) => `=== DOCUMENT ${i + 1}: ${d.name} (${d.documentType}) ===\n${d.ocrText || 'No transcript'}\n`)
      .join('\n\n');

    const totalBytes = docs.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
    const combinedSummary = `Master Document Binder containing ${docs.length} files: ${docs.map(d => d.name).join(', ')}.`;

    // Create a new merged document record
    const mergedDoc = await this.uploadDocument({
      tenantId,
      fileBuffer: Buffer.from(combinedOcr, 'utf-8'),
      originalFilename: `${binderName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Binder.txt`,
      mimeType: 'text/plain',
      uploadedBy: actorUser?.id,
      classification: docs.some(d => d.classification === 'RESTRICTED') ? 'RESTRICTED' : docs.some(d => d.classification === 'CONFIDENTIAL') ? 'CONFIDENTIAL' : 'INTERNAL',
      documentType: 'GENERAL',
      sourceType: targetContext?.recordId ? 'RECORD' : 'GENERAL',
      moduleId: targetContext?.moduleId,
      recordId: targetContext?.recordId,
      ocrText: combinedOcr,
      aiSummary: combinedSummary,
      aiMetadata: {
        isMergedBinder: true,
        sourceDocIds: documentIds,
        mergedAt: new Date().toISOString(),
        mergedBy: actorUser?.name || 'User'
      }
    });

    await globalPrisma.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId: mergedDoc.id,
        action: 'MERGED_BINDER_CREATED',
        actor: actorUser?.name || 'User',
        actorId: actorUser?.id,
        details: `Created merged binder from ${docs.length} documents: ${docs.map(d => d.name).join(', ')}`,
        metadata: { sourceDocIds: documentIds }
      }
    });

    return mergedDoc;
  }
}


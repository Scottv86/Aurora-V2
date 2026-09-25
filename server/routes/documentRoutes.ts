import { Router } from 'express';
import { DocumentService, DocumentStorageProvider } from '../services/documentService';
import { DocumentAiService } from '../services/documentAiService';
import { FileMetadataExtractor } from '../lib/fileMetadataExtractor';
import { globalPrisma } from '../lib/prisma';
import { authenticate } from '../middleware/authMiddleware';
import { checkAIFeatureOrThrow, resolveAIFeatureAccess } from '../lib/aiPermissions';

const router = Router();

/**
 * GET /api/documents/stream/:id
 * Direct file streaming endpoint for browser preview, embed (iframe/img), and download
 * Does not require x-tenant-id header (direct browser navigation friendly)
 */
router.get('/stream/:id', async (req: any, res) => {
  try {
    const doc = await globalPrisma.universalDocument.findUnique({
      where: { id: req.params.id }
    });

    if (!doc) return res.status(404).send('Document not found');

    let storageProvider = doc.storageProvider;
    let storagePath = doc.storagePath;
    let mimeType = doc.mimeType;
    let filename = doc.originalFilename || doc.name;

    // Support version streaming via ?v=X or ?version=X
    const requestedVersion = req.query.v || req.query.version;
    if (requestedVersion) {
      const versionNumber = parseInt(requestedVersion as string, 10);
      const ver = await globalPrisma.universalDocumentVersion.findFirst({
        where: { documentId: doc.id, versionNumber }
      });
      if (ver) {
        storageProvider = ver.storageProvider;
        storagePath = ver.storagePath;
        mimeType = ver.mimeType;
      }
    }

    const buffer = await DocumentStorageProvider.readFile(storageProvider, storagePath);
    if (!buffer) return res.status(404).send('File blob not found on storage');

    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`
    );
    res.send(buffer);
  } catch (err: any) {
    console.error('[documentRoutes] Error streaming document:', err);
    res.status(500).send(err.message);
  }
});

// All document management routes below require authentication
router.use(authenticate);

/**
 * POST /api/documents/upload
 * Ingests a new document with storage, RDS schedule, and optional AI analysis
 */
router.post('/upload', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    const {
      filename,
      mimeType,
      contentBase64,
      classification,
      documentType,
      retentionScheduleId,
      sourceType,
      moduleId,
      recordId,
      fieldId,
      folderId,
      analyzeWithAi = true,
      targetFields = []
    } = req.body;

    if (!filename || !contentBase64) {
      return res.status(400).json({ error: 'filename and contentBase64 are required' });
    }

    const fileBuffer = Buffer.from(contentBase64, 'base64');
    const safeMimeType = mimeType || 'application/octet-stream';
    const actor = req.user?.name || req.user?.email || 'User';

    // 1. Optional AI Analysis
    let aiResult = null;
    const isTextFile = safeMimeType.startsWith('text/') || 
                       filename.endsWith('.txt') || 
                       filename.endsWith('.csv') || 
                       filename.endsWith('.md') || 
                       filename.endsWith('.json') ||
                       filename.endsWith('.xml') ||
                       filename.endsWith('.log');

    // Check AI Governance permission for Multimodal OCR
    const ocrAccess = await resolveAIFeatureAccess({
      tenantId,
      userId: req.user?.uid,
      featureKey: 'ai:document_ocr',
      db: req.db || globalPrisma
    });

    if (analyzeWithAi && ocrAccess.allowed && (safeMimeType.startsWith('image/') || safeMimeType === 'application/pdf' || isTextFile)) {
      try {
        aiResult = await DocumentAiService.analyzeDocument(fileBuffer, safeMimeType, filename, targetFields);
      } catch (aiErr) {
        console.warn('[documentRoutes] AI analysis skipped/failed:', aiErr);
      }
    }

    const resolvedOcrText = aiResult?.ocrText || (isTextFile ? fileBuffer.toString('utf-8') : undefined);

    // Check AI Governance for PII / Auto-Classification
    const piiAccess = await resolveAIFeatureAccess({
      tenantId,
      userId: req.user?.uid,
      featureKey: 'ai:document_classification_pii',
      db: req.db || globalPrisma
    });

    const finalClassification = (piiAccess.allowed && aiResult?.suggestedClassification) || classification || 'INTERNAL';

    // 2. Upload Document via DocumentService
    const doc = await DocumentService.uploadDocument({
      tenantId,
      fileBuffer,
      originalFilename: filename,
      mimeType: safeMimeType,
      uploadedBy: actor,
      classification: finalClassification,
      documentType: aiResult?.documentType || documentType || 'GENERAL',
      retentionScheduleId,
      sourceType,
      moduleId,
      recordId,
      fieldId,
      folderId,
      ocrText: resolvedOcrText,
      aiSummary: aiResult?.summary,
      aiMetadata: aiResult ? {
        detectedPii: piiAccess.allowed ? aiResult.detectedPii : undefined,
        extractedFields: aiResult.extractedFields,
        confidence: aiResult.confidence
      } : undefined
    });

    res.json({
      success: true,
      document: doc,
      aiExtraction: aiResult ? {
        extractedFields: aiResult.extractedFields,
        detectedPii: aiResult.detectedPii,
        summary: aiResult.summary,
        suggestedClassification: aiResult.suggestedClassification
      } : null
    });
  } catch (err: any) {
    console.error('[documentRoutes] Upload failed:', err);
    res.status(500).json({ error: err.message || 'Failed to upload document' });
  }
});

/**
 * POST /api/documents/process-ai-direct
 * Run OCR and extract fields on a file buffer without saving immediately
 */
router.post('/process-ai-direct', async (req: any, res) => {
  try {
    const { filename, mimeType, contentBase64, targetFields = [] } = req.body;
    if (!contentBase64) return res.status(400).json({ error: 'contentBase64 required' });

    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_magic_populate', req.db || globalPrisma);

    const fileBuffer = Buffer.from(contentBase64, 'base64');
    const result = await DocumentAiService.analyzeDocument(
      fileBuffer,
      mimeType || 'application/pdf',
      filename || 'document.pdf',
      targetFields
    );

    res.json({ success: true, analysis: result });
  } catch (err: any) {
    console.error('[documentRoutes] Direct AI analysis failed:', err);
    res.status(500).json({ error: err.message || 'AI analysis failed' });
  }
});

/**
 * GET /api/documents
 * List documents with search & filter
 */
router.get('/', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    const query = req.query.query as string || '';
    const docs = await DocumentService.searchDocuments(tenantId, query, req.query);
    res.json({ success: true, documents: docs });
  } catch (err: any) {
    console.error('[documentRoutes] Search failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/record/:recordId
 * Get all documents linked to a specific record
 */
router.get('/record/:recordId', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    const docs = await DocumentService.getDocumentsForRecord(tenantId, req.params.recordId);
    res.json({ success: true, documents: docs });
  } catch (err: any) {
    console.error('[documentRoutes] Failed to fetch record documents:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/governance/queue
 * Get RDS governance queues (Legal Holds, Expiring, Pending Disposal)
 */
router.get('/governance/queue', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    const queue = await DocumentService.getGovernanceQueue(tenantId);
    res.json({ success: true, ...queue });
  } catch (err: any) {
    console.error('[documentRoutes] Failed to fetch governance queue:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/schedules
 * Get tenant disposal schedules
 */
router.get('/schedules', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    await DocumentService.ensureDefaultDisposalSchedules(tenantId);
    const schedules = await globalPrisma.universalDisposalSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/schedules
 * Create or update a disposal schedule
 */
router.post('/schedules', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);

    const { id, name, moduleScope, documentType, retentionPeriodMonths, durationLabel, action, description } = req.body;

    if (id) {
      const updated = await globalPrisma.universalDisposalSchedule.update({
        where: { id },
        data: {
          name,
          moduleScope,
          documentType,
          retentionPeriodMonths: Number(retentionPeriodMonths) || 84,
          durationLabel: durationLabel || `${Math.round((Number(retentionPeriodMonths) || 84) / 12)} Years`,
          action: action || 'ARCHIVE',
          description
        }
      });
      return res.json({ success: true, schedule: updated });
    }

    const created = await globalPrisma.universalDisposalSchedule.create({
      data: {
        tenantId,
        name,
        moduleScope: moduleScope || 'ALL',
        documentType: documentType || 'GENERAL',
        retentionPeriodMonths: Number(retentionPeriodMonths) || 84,
        durationLabel: durationLabel || `${Math.round((Number(retentionPeriodMonths) || 84) / 12)} Years`,
        action: action || 'ARCHIVE',
        description
      }
    });

    res.json({ success: true, schedule: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/:id
 * Get single document with versions and audit logs
 */
router.get('/:id', async (req: any, res) => {
  try {
    const doc = await globalPrisma.universalDocument.findUnique({
      where: { id: req.params.id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        links: true,
        retentionSchedule: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 25 }
      }
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * POST /api/documents/:id/version
 * Upload new version
 */
router.post('/:id/version', async (req: any, res) => {
  try {
    const { filename, mimeType, contentBase64, note } = req.body;
    if (!contentBase64) return res.status(400).json({ error: 'contentBase64 required' });

    const actor = req.user?.name || req.user?.email || 'User';
    const fileBuffer = Buffer.from(contentBase64, 'base64');

    const updated = await DocumentService.uploadNewVersion(
      req.params.id,
      fileBuffer,
      filename || 'version_update',
      mimeType || 'application/octet-stream',
      actor,
      note
    );

    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/legal-hold
 * Toggle Legal Hold
 */
router.post('/:id/legal-hold', async (req: any, res) => {
  try {
    const actor = req.user?.name || req.user?.email || 'User';
    const { reason } = req.body;
    const updated = await DocumentService.toggleLegalHold(req.params.id, actor, reason);
    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/documents/:id/classification
 * Update classification & recalculate retention
 */
router.patch('/:id/classification', async (req: any, res) => {
  try {
    const actor = req.user?.name || req.user?.email || 'User';
    const { classification, retentionScheduleId } = req.body;
    const updated = await DocumentService.updateClassification(
      req.params.id,
      classification,
      retentionScheduleId,
      actor
    );
    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete (Soft delete or permanent purge)
 */
router.delete('/:id', async (req: any, res) => {
  try {
    const actor = req.user?.name || req.user?.email || 'User';
    const permanent = req.query.permanent === 'true';
    const result = await DocumentService.deleteDocument(req.params.id, actor, permanent);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/documents/:id/metadata
 * Returns technical metadata (EXIF, GPS coordinates, dimensions, PDF info, hashes)
 */
router.get('/:id/metadata', async (req: any, res) => {
  try {
    const doc = await globalPrisma.universalDocument.findUnique({
      where: { id: req.params.id }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const metadata: any = (doc.aiMetadata as any) || {};
    if (metadata.technicalMetadata) {
      return res.json({ success: true, metadata: metadata.technicalMetadata });
    }

    // Extract on demand from storage blob
    const buffer = await DocumentStorageProvider.readFile(doc.storageProvider, doc.storagePath);
    if (!buffer) return res.json({ success: true, metadata: null });

    const extracted = FileMetadataExtractor.extract(buffer, doc.originalFilename || doc.name, doc.mimeType);
    metadata.technicalMetadata = extracted;

    await globalPrisma.universalDocument.update({
      where: { id: doc.id },
      data: { aiMetadata: metadata }
    }).catch(() => {});

    res.json({ success: true, metadata: extracted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/query-copilot
 * Ask this Document chat
 */
router.post('/:id/query-copilot', async (req: any, res) => {
  try {
    const doc = await globalPrisma.universalDocument.findUnique({
      where: { id: req.params.id }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Check AI Governance permission for File Copilot
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId || doc.tenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_copilot', req.db || globalPrisma);

    const { query, history } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    let documentText = doc.ocrText || '';
    let fileBuffer: Buffer | null = null;

    // If ocrText is missing, empty, or was previously set to just the filename:
    const isTextEmptyOrName = !documentText || 
                              documentText.trim() === '' || 
                              documentText.trim() === doc.name || 
                              documentText.trim() === doc.originalFilename;

    if (isTextEmptyOrName) {
      try {
        fileBuffer = await DocumentStorageProvider.readFile(doc.storageProvider, doc.storagePath);
        if (fileBuffer) {
          const isText = (doc.mimeType && doc.mimeType.startsWith('text/')) || 
                         doc.name?.endsWith('.txt') || 
                         doc.name?.endsWith('.csv') || 
                         doc.name?.endsWith('.md') || 
                         doc.name?.endsWith('.json') ||
                         doc.name?.endsWith('.xml') ||
                         doc.name?.endsWith('.log');

          if (isText) {
            documentText = fileBuffer.toString('utf-8');
          } else {
            // Run on-demand OCR / analysis via Gemini
            const analysis = await DocumentAiService.analyzeDocument(
              fileBuffer, 
              doc.mimeType || 'application/pdf', 
              doc.originalFilename || doc.name
            );
            documentText = analysis.ocrText || analysis.summary;
          }

          // Cache documentText in database so future queries don't need re-processing
          if (documentText) {
            await globalPrisma.universalDocument.update({
              where: { id: doc.id },
              data: { ocrText: documentText }
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        console.warn('[query-copilot] Storage file read notice:', err?.message || err);
      }
    }

    if (!documentText) {
      documentText = `Document: ${doc.originalFilename || doc.name}\nType: ${doc.documentType}\nClassification: ${doc.classification}`;
    }

    const answer = await DocumentAiService.queryDocument(
      documentText, 
      query, 
      history, 
      fileBuffer || undefined, 
      doc.mimeType || undefined
    );
    res.json({ success: true, answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/compare-versions
 * Compares two document versions with text/clause diff and AI summary
 */
router.post('/:id/compare-versions', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_version_diff', req.db || globalPrisma);

    const { versionA = 1, versionB } = req.body;
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: req.params.id, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const latestVersion = doc.versions[0]?.versionNumber || 1;
    const targetVerB = versionB || latestVersion;

    const docA = {
      name: `${doc.name} (v${versionA})`,
      text: doc.ocrText || `Document content for version ${versionA}`,
      version: versionA
    };
    const docB = {
      name: `${doc.name} (v${targetVerB})`,
      text: doc.ocrText || `Document content for version ${targetVerB}`,
      version: targetVerB
    };

    const diffResult = await DocumentAiService.compareVersions(docA, docB);
    res.json({ success: true, diff: diffResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/convert-to-record
 * Extracts structured fields for People & Org OR custom modules with optional record execution
 */
router.post('/:id/convert-to-record', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_record_converter', req.db || globalPrisma);

    const { targetType = 'PEOPLE_ORG', targetSchema, executeCreate = false, payload } = req.body;
    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: req.params.id, tenantId }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Step 1: If preview extraction requested
    if (!executeCreate) {
      let documentText = doc.ocrText || doc.aiSummary || '';

      // If ocrText is empty, read the file content directly from storage
      if (!documentText || documentText.trim().length === 0) {
        try {
          const fileBuf = await DocumentStorageProvider.readFile(doc.storageProvider, doc.storagePath);
          if (fileBuf) {
            const isText = (doc.mimeType && (doc.mimeType.startsWith('text/') || doc.mimeType.includes('json') || doc.mimeType.includes('csv'))) || doc.name.endsWith('.txt');
            if (isText) {
              documentText = fileBuf.toString('utf-8');
            } else if (doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) {
              const aiAnalysis = await DocumentAiService.analyzeDocument(fileBuf, doc.mimeType, doc.name);
              if (aiAnalysis?.ocrText) {
                documentText = aiAnalysis.ocrText;
                await globalPrisma.universalDocument.update({
                  where: { id: doc.id },
                  data: { ocrText: aiAnalysis.ocrText, aiSummary: aiAnalysis.summary }
                });
              }
            }
          }
        } catch (storageErr) {
          console.warn('[documentRoutes] Could not read file content from storage:', storageErr);
        }
      }

      if (!documentText) {
        documentText = doc.name;
      }

      // If targetType is MODULE, ensure we have the module's real schema
      let resolvedSchema = targetSchema || {};
      if (targetType === 'MODULE' && targetSchema?.moduleId) {
        let fields = targetSchema.fields || [];
        if (!fields || fields.length === 0) {
          const dbMod = await (req.db || globalPrisma).module.findFirst({
            where: { id: targetSchema.moduleId, tenantId }
          });
          if (dbMod && dbMod.config) {
            const cfg = typeof dbMod.config === 'string' ? JSON.parse(dbMod.config) : dbMod.config;
            const rawFields = (Array.isArray(dbMod.fields) ? dbMod.fields : null)
              || (Array.isArray(cfg.fields) ? cfg.fields : null) 
              || (Array.isArray(cfg.sections) ? cfg.sections.flatMap((s: any) => s.fields || []) : null)
              || (Array.isArray(dbMod.tabs) ? dbMod.tabs.flatMap((t: any) => t.fields || []) : null)
              || [];
            fields = rawFields.map((f: any) => ({
              id: f.id || f.key || f.name,
              label: f.label || f.name || f.id,
              type: f.type || 'text'
            }));
          }
        }
        resolvedSchema = {
          ...targetSchema,
          fields
        };
      }

      const extraction = await DocumentAiService.extractForRecord(documentText, targetType, resolvedSchema);

      // Perform deduplication check for People & Org
      let dedupMatch = null;
      if (targetType === 'PEOPLE_ORG') {
        const { taxIdentifier, email, legalName } = extraction.fields || {};
        if (taxIdentifier) {
          const match = await (req.db || globalPrisma).party.findFirst({
            where: {
              tenantId,
              organization: { taxIdentifier }
            },
            include: { organization: true }
          });
          if (match) {
            dedupMatch = {
              matchType: 'EXACT_TAX_ID',
              existingId: match.id,
              existingName: match.organization?.legalName || 'Existing Organisation',
              existingDetails: `Matches Tax Identifier / ABN: ${taxIdentifier}`
            };
          }
        }

        if (!dedupMatch && legalName) {
          const match = await (req.db || globalPrisma).party.findFirst({
            where: {
              tenantId,
              organization: { legalName }
            },
            include: { organization: true }
          });
          if (match) {
            dedupMatch = {
              matchType: 'EXACT_NAME',
              existingId: match.id,
              existingName: match.organization?.legalName || 'Existing Organisation',
              existingDetails: `Matches Organisation Legal Name: ${legalName}`
            };
          }
        }

        const { firstName, lastName } = extraction.fields || {};
        if (!dedupMatch && firstName && lastName) {
          const match = await (req.db || globalPrisma).party.findFirst({
            where: {
              tenantId,
              person: { firstName, lastName }
            },
            include: { person: true }
          });
          if (match) {
            dedupMatch = {
              matchType: 'EXACT_NAME',
              existingId: match.id,
              existingName: `${match.person?.firstName} ${match.person?.lastName}`,
              existingDetails: `Matches Person: ${firstName} ${lastName}`
            };
          }
        }
      }

      return res.json({
        success: true,
        draft: {
          ...extraction,
          dedupMatch
        }
      });
    }

    // Step 2: Execute actual record creation
    const db = req.db || globalPrisma;
    let createdRecordId = '';
    let createdRecordType = targetType;
    let createdRecordName = '';

    if (targetType === 'PEOPLE_ORG') {
      const { entityType = 'ORGANIZATION', fields = {} } = payload;
      const party = await db.party.create({
        data: {
          tenantId,
          partyType: entityType,
          status: 'ACTIVE',
          creationContextLog: JSON.stringify({
            source: 'AI Convert Engine',
            documentName: doc.name,
            documentId: doc.id,
            email: fields.email,
            phone: fields.phone,
            address: fields.address
          }),
          ...(entityType === 'PERSON' ? {
            person: {
              create: {
                firstName: fields.firstName || 'Unknown',
                lastName: fields.lastName || 'Person',
                isHumanInLoop: true
              }
            }
          } : {
            organization: {
              create: {
                legalName: fields.legalName || 'New Organisation',
                orgStructureType: fields.orgType || 'PTE_LTD',
                taxIdentifier: fields.taxIdentifier
              }
            }
          })
        },
        include: { person: true, organization: true }
      });

      createdRecordId = party.id;
      createdRecordName = party.partyType === 'PERSON' 
        ? `${party.person?.firstName} ${party.person?.lastName}`
        : (party.organization?.legalName || 'Organisation');
    } else {
      // Custom Module record
      const { moduleId, fields = {} } = payload;
      if (!moduleId) return res.status(400).json({ error: 'moduleId is required for custom module record' });

      const mod = await db.module.findFirst({ where: { id: moduleId, tenantId } });
      const record = await db.record.create({
        data: {
          tenantId,
          moduleId,
          data: fields,
          status: 'ACTIVE'
        }
      });
      createdRecordId = record.id;
      createdRecordName = `${mod?.name || 'Record'} #${record.id.slice(-6)}`;
    }

    // Link document directly to the newly created record
    await db.universalDocumentLink.create({
      data: {
        tenantId,
        documentId: doc.id,
        sourceType: targetType === 'PEOPLE_ORG' ? 'RECORD' : 'RECORD',
        recordId: createdRecordId,
        moduleId: payload?.moduleId
      }
    });

    // Record audit entry
    await db.universalDocumentAuditLog.create({
      data: {
        tenantId,
        documentId: doc.id,
        action: 'CONVERTED_TO_RECORD',
        actor: req.user?.name || req.user?.email || 'User',
        actorId: req.user?.uid,
        details: `Converted document to ${targetType} record: "${createdRecordName}" (${createdRecordId})`,
        metadata: { targetType, recordId: createdRecordId, recordName: createdRecordName }
      }
    });

    res.json({
      success: true,
      message: `Successfully created ${createdRecordName}`,
      recordId: createdRecordId,
      recordName: createdRecordName,
      targetType
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/extract-line-items
 * Extracts tabular line items from document
 */
router.post('/:id/extract-line-items', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_record_converter', req.db || globalPrisma);

    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: req.params.id, tenantId }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const items = await DocumentAiService.extractLineItems(doc.ocrText || doc.aiSummary || doc.name);
    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/extract-obligations
 * Extracts operative obligations and contract deadlines
 */
router.post('/:id/extract-obligations', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_obligation_extractor', req.db || globalPrisma);

    const doc = await globalPrisma.universalDocument.findFirst({
      where: { id: req.params.id, tenantId }
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const obligations = await DocumentAiService.extractObligations(doc.ocrText || doc.aiSummary || doc.name);
    res.json({ success: true, obligations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/annotations
 * Adds an in-viewer pin annotation
 */
router.post('/:id/annotations', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    const { xPercent, yPercent, pageNumber, comment, authorName, authorAvatar } = req.body;

    if (xPercent === undefined || yPercent === undefined || !comment) {
      return res.status(400).json({ error: 'xPercent, yPercent, and comment are required' });
    }

    const annotation = await DocumentService.addAnnotation(
      tenantId,
      req.params.id,
      { xPercent, yPercent, pageNumber, comment, authorName, authorAvatar },
      req.user
    );

    res.json({ success: true, annotation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/documents/:id/annotations/:annotationId/resolve
 * Resolves or reopens an in-viewer pin annotation
 */
router.patch('/:id/annotations/:annotationId/resolve', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    const { isResolved = true } = req.body;

    const result = await DocumentService.resolveAnnotation(
      tenantId,
      req.params.id,
      req.params.annotationId,
      isResolved,
      req.user
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/sign
 * Applies formal E-Signature / Approval Stamp and creates immutable signed version
 */
router.post('/:id/sign', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    const { signatureType = 'DRAW', signerName, signerEmail, signatureDataUrl, note } = req.body;

    const updated = await DocumentService.signDocument(
      tenantId,
      req.params.id,
      {
        signatureType,
        signerName: signerName || req.user?.name || 'Signer',
        signerEmail: signerEmail || req.user?.email || '',
        signatureDataUrl,
        note,
        ipAddress: req.ip || req.connection?.remoteAddress
      },
      req.user
    );

    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/redact
 * Generates sanitized version masking selected PII entities
 */
router.post('/:id/redact', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    await checkAIFeatureOrThrow(tenantId, req.user?.uid, 'ai:document_redaction', req.db || globalPrisma);

    const { redactedEntities = [] } = req.body;
    const updated = await DocumentService.redactDocument(
      tenantId,
      req.params.id,
      redactedEntities,
      req.user
    );

    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/batch/actions
 * Performs batch operations across multiple documents
 */
router.post('/batch/actions', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    const { documentIds, action, payload } = req.body;

    if (!documentIds || !action) {
      return res.status(400).json({ error: 'documentIds and action are required' });
    }

    const result = await DocumentService.bulkActions(
      tenantId,
      documentIds,
      action,
      payload,
      req.user
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/batch/merge
 * Combines multiple documents into a single consolidated master document binder
 */
router.post('/batch/merge', async (req: any, res) => {
  try {
    const rawTenantId = req.headers['x-tenant-id'] as string;
    const tenantId = await DocumentService.resolveValidTenantId(rawTenantId, req.user?.tenantIds);
    const { documentIds, binderName = 'Merged_Document', targetContext } = req.body;

    if (!documentIds || documentIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 documents are required to merge' });
    }

    const merged = await DocumentService.mergeDocuments(
      tenantId,
      documentIds,
      binderName,
      targetContext,
      req.user
    );

    res.json({ success: true, document: merged });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


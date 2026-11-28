import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { orchestrateSolutionReuseFirst, buildEcosystemManifest } from '../services/solutionOrchestratorService';
import { auditAndRepairSolutionDraft } from '../services/solutionCriticService';
import { DocumentAiService } from '../services/documentAiService';
import { FileMetadataExtractor } from '../lib/fileMetadataExtractor';
import { safeFetchWebPage } from '../lib/safeWebFetch';
import { extractPdfTextLocally } from '../lib/localPdfExtract';
import {
  COMPLIANCE_FRAMEWORKS,
  getTenantComplianceProfile,
  saveTenantComplianceProfile,
  evaluateSolutionCompliance,
} from '../services/complianceEngineService';

const router = express.Router();

const getSolutionModel = (db: any) => db?.solutionBlueprint || db?.SolutionBlueprint || globalPrisma.solutionBlueprint;

// POST /api/solutions/ingest-source - Multimodal PDF/DOCX/CSV/Image extraction for Solution Sources
router.post('/ingest-source', async (req: TenantRequest, res) => {
  try {
    const { filename = 'document.txt', mimeType = 'text/plain', base64Data, textContent } = req.body || {};

    if (!base64Data && !textContent) {
      return res.status(400).json({ error: 'File content (base64Data or textContent) is required.' });
    }

    const buffer = base64Data
      ? Buffer.from(String(base64Data).replace(/^data:[^;]+;base64,/, ''), 'base64')
      : Buffer.from(String(textContent), 'utf-8');

    const metadata = FileMetadataExtractor.extract(buffer, filename, mimeType);
    const lowerName = String(filename).toLowerCase();

    // Fast path for structured CSV/JSON/Markdown/TXT
    if (lowerName.endsWith('.csv')) {
      const raw = buffer.toString('utf-8');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const headers = lines[0]?.split(',').map((h) => h.trim().replace(/^"|"$/g, '')) || [];
      const sampleRows = lines.slice(1, 16).join('\n');
      return res.json({
        status: 'PROCESSED',
        contentSummary: `Spreadsheet (${lines.length - 1} rows, ${headers.length} columns: ${headers.slice(0, 8).join(', ')})`,
        rawText: `CSV COLUMNS: ${headers.join(', ')}\n\nSAMPLE ROWS:\n${sampleRows}`,
        detectedPii: [],
        extractedFields: { columns: headers, rowCount: Math.max(0, lines.length - 1) },
        metadata,
      });
    }

    if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json')) {
      const raw = buffer.toString('utf-8').slice(0, 25000);
      return res.json({
        status: 'PROCESSED',
        contentSummary: `Text specification (${metadata.textStats?.wordsCount || raw.split(/\s+/).length} words)`,
        rawText: raw,
        detectedPii: [],
        extractedFields: {},
        metadata,
      });
    }

    // Fast local text extraction for text-based PDFs (avoids slow Gemini OCR on large docs)
    if (lowerName.endsWith('.pdf') || String(mimeType).toLowerCase().includes('application/pdf')) {
      const localPdf = extractPdfTextLocally(buffer, 25000);
      if (localPdf.ok) {
        return res.json({
          status: 'PROCESSED',
          contentSummary: `PDF document (${localPdf.pageEstimate} page${localPdf.pageEstimate === 1 ? '' : 's'}, ${localPdf.wordCount.toLocaleString()} words extracted)`,
          rawText: localPdf.text,
          detectedPii: [],
          extractedFields: { pageCount: localPdf.pageEstimate, wordCount: localPdf.wordCount },
          metadata,
        });
      }
    }

    // Multimodal AI extraction for scanned PDFs, DOCX, Images, Wireframes
    const analysis = await DocumentAiService.analyzeDocument(buffer, mimeType, filename);

    res.json({
      status: 'PROCESSED',
      contentSummary: analysis.summary || `Extracted ${analysis.documentType} (${filename})`,
      rawText: (analysis.ocrText || analysis.summary || '').slice(0, 25000),
      detectedPii: analysis.detectedPii || [],
      extractedFields: analysis.extractedFields || {},
      documentType: analysis.documentType,
      classification: analysis.suggestedClassification,
      metadata,
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /ingest-source Error:', err);
    res.status(500).json({ error: err.message || 'Failed to ingest source document.' });
  }
});

// POST /api/solutions/ingest-url - SSRF-protected server-side web page extraction for Solution Sources
router.post('/ingest-url', async (req: TenantRequest, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'A valid http(s) URL is required.' });
    }

    const result = await safeFetchWebPage(url);

    // If the URL points directly to a PDF, try fast local extraction first, then fall back to DocumentAiService
    if (result.pdfBuffer) {
      const filename = result.filename || 'document.pdf';
      const localPdf = extractPdfTextLocally(result.pdfBuffer, 25000);
      if (localPdf.ok) {
        return res.json({
          status: 'PROCESSED',
          url: result.finalUrl,
          title: result.title,
          contentSummary: `PDF (${localPdf.pageEstimate} page${localPdf.pageEstimate === 1 ? '' : 's'}, ${localPdf.wordCount.toLocaleString()} words) from ${new URL(result.finalUrl).hostname}`,
          rawText: `Source URL: ${result.finalUrl}\nDocument: ${filename}\n\n${localPdf.text}`,
          wordCount: localPdf.wordCount,
          contentType: 'application/pdf',
          size: `PDF · ${localPdf.wordCount.toLocaleString()} words`,
        });
      }

      const analysis = await DocumentAiService.analyzeDocument(result.pdfBuffer, 'application/pdf', filename);
      const extractedBody = (analysis.ocrText || analysis.summary || '').slice(0, 25000);
      const wordCount = extractedBody.split(/\s+/).filter(Boolean).length;
      return res.json({
        status: 'PROCESSED',
        url: result.finalUrl,
        title: result.title,
        contentSummary: analysis.summary || result.contentSummary,
        rawText: `Source URL: ${result.finalUrl}\nDocument: ${filename}\n\n${extractedBody}`,
        wordCount,
        contentType: 'application/pdf',
        size: wordCount > 0 ? `PDF · ${wordCount.toLocaleString()} words` : `PDF · ${Math.round(result.byteLength / 1024)} KB`,
      });
    }

    return res.json({
      status: 'PROCESSED',
      url: result.finalUrl,
      title: result.title,
      contentSummary: result.contentSummary,
      rawText: result.rawText,
      wordCount: result.wordCount,
      contentType: result.contentType,
      size: `${result.wordCount.toLocaleString()} words`,
    });
  } catch (err: any) {
    const message = err?.message || 'Failed to fetch webpage content.';
    const isClientOrBlocked = /blocked|invalid|only http|unsupported|could not resolve|no readable text|timed out|http 4/i.test(message);
    console.warn('[SolutionRoutes] POST /ingest-url rejected:', message);
    return res.status(isClientOrBlocked ? 400 : 502).json({ error: message });
  }
});

// GET /api/solutions/workspace-context - Preload & warm tenant config + Knowledge Base SOPs on Studio launch
router.get('/workspace-context', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const manifest = await buildEcosystemManifest(tenantId, { forceRefresh: true });
    res.json({
      ready: true,
      tenantName: manifest.tenantProfile?.name || 'Workspace',
      planTier: manifest.tenantProfile?.planTier || 'standard',
      moduleCount: (manifest.existingModules || []).length,
      roleCount: (manifest.systemRoles || []).length,
      connectorCount: (manifest.activeConnectors || []).length,
      kbCount: (manifest.knowledgeBase || []).length,
      driveSopCount: (manifest.driveSops || []).length,
      kbTitles: (manifest.knowledgeBase || []).slice(0, 8).map((a: any) => a.title),
      driveSopNames: (manifest.driveSops || []).slice(0, 8).map((d: any) => d.name),
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /workspace-context Error:', err);
    res.status(500).json({ error: err.message || 'Failed to preload workspace context.' });
  }
});

// POST /api/solutions/orchestrate - Reuse-First AI Solution Orchestrator (supports NDJSON live status stream)
router.post('/orchestrate', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const {
      prompt,
      solutionName,
      contextSources = [],
      existingArtifacts = [],
      chatHistory = [],
      pinnedContext = null,
      modelTier = 'fast',
      stream = false,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }
      const writeEvent = (obj: Record<string, any>) => {
        if (!res.writableEnded) {
          res.write(`${JSON.stringify(obj)}\n`);
        }
      };
      try {
        const result = await orchestrateSolutionReuseFirst({
          tenantId,
          prompt,
          solutionName,
          contextSources,
          existingArtifacts,
          chatHistory,
          pinnedContext,
          modelTier,
          onProgress: (label) => writeEvent({ type: 'status', label }),
          onToolEvent: (ev) => writeEvent(ev),
        });
        writeEvent({ type: 'result', data: result });
      } catch (err: any) {
        console.error('[SolutionRoutes] POST /orchestrate (stream) Error:', err);
        writeEvent({ type: 'error', error: err.message || 'Failed to orchestrate solution.' });
      } finally {
        if (!res.writableEnded) res.end();
      }
      return;
    }

    const result = await orchestrateSolutionReuseFirst({
      tenantId,
      prompt,
      solutionName,
      contextSources,
      existingArtifacts,
      chatHistory,
      pinnedContext,
      modelTier,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /orchestrate Error:', err);
    res.status(500).json({ error: err.message || 'Failed to orchestrate solution.' });
  }
});

// GET /api/solutions/sandbox-seed/:moduleId - Anonymized live record samples for Preview Sandbox
router.get('/sandbox-seed/:moduleId', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const rawKey = String(req.params.moduleId || '').trim();
    if (!rawKey) return res.json({ seededFromLive: false, records: [] });

    const modules: any[] =
      (await (globalPrisma as any).module
        ?.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        })
        .catch(() => [])) || [];

    const keyLower = rawKey.toLowerCase();
    const matchedMod =
      modules.find((m) => m.id === rawKey || String(m.name || '').toLowerCase() === keyLower) ||
      modules.find((m) => String(m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === keyLower);

    if (!matchedMod) {
      return res.json({ seededFromLive: false, records: [] });
    }

    const liveRows = await globalPrisma.record
      .findMany({
        where: { tenantId, moduleId: matchedMod.id },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: { id: true, status: true, data: true, createdAt: true, updatedAt: true },
      })
      .catch(() => []);

    if (!liveRows || liveRows.length === 0) {
      return res.json({ seededFromLive: false, records: [] });
    }

    const redactValue = (fieldKey: string, value: any, idx: number): any => {
      if (value === null || value === undefined) return value;
      const k = fieldKey.toLowerCase();
      if (typeof value === 'string') {
        if (k.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `sample.${idx + 1}@example.com`;
        }
        if (k.includes('phone') || k.includes('mobile') || k.includes('tel')) {
          return `0400 000 ${String(101 + idx).padStart(3, '0')}`;
        }
        if (/(tfn|ssn|tax|abn|bank|bsb|card|iban|passport|license_no|licence_no|secret|password|token)/i.test(k)) {
          return `•••-•••-${101 + idx}`;
        }
        if (k.includes('address') || k.includes('street')) {
          return `${10 + idx * 4} Sample St, Demo City`;
        }
      }
      return value;
    };

    const prefix = (matchedMod.name || 'REC').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'REC';
    const records = liveRows.map((row, idx) => {
      const rawData = row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? (row.data as Record<string, any>)
        : {};
      const safeData: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawData)) {
        safeData[k] = redactValue(k, v, idx);
      }
      const key = safeData._record_key || `${prefix}-${101 + idx}`;
      return {
        ...safeData,
        id: `sb_live_${row.id}`,
        _record_key: key,
        status: row.status || safeData.status || 'Active',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        _seededFromLive: true,
        data: { ...safeData, _record_key: key },
      };
    });

    res.json({ seededFromLive: true, moduleName: matchedMod.name, records });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /sandbox-seed/:moduleId Error:', err);
    res.json({ seededFromLive: false, records: [] });
  }
});

// GET /api/solutions - List all solution blueprints for active tenant
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    let solutions = [];
    if (model) {
      const rawSolutions = await model.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' }
      });
      solutions = rawSolutions.map((sol: any) => {
        const modules = Array.isArray(sol.connectedModules) ? sol.connectedModules : [];
        const artifacts = Array.isArray(sol.artifacts) ? sol.artifacts : [];
        const chat = Array.isArray(sol.chatMessages) ? sol.chatMessages : Array.isArray(sol.chatHistory) ? sol.chatHistory : [];

        let description = sol.description;
        if (!description || description.includes('linked data modules') || description.includes('Solution Blueprint combining')) {
          const specArt = artifacts.find((a: any) => a.type === 'PAGE' || (a.id && a.id.startsWith('art_spec_')));
          description = specArt?.description || (specArt?.content as any)?.title || (sol.name ? `Enterprise solution blueprint for ${sol.name}` : 'Enterprise Solution Blueprint');
        }

        const meta = (sol.metadata && typeof sol.metadata === 'object') ? sol.metadata : {};
        const versions = Array.isArray(meta.versions) ? meta.versions : [];

        return {
          ...sol,
          description,
          chatHistory: chat,
          chatMessages: chat,
          versions,
          modulesCount: sol.modulesCount ?? modules.length,
          workflowsCount: sol.workflowsCount ?? artifacts.filter((a: any) => a.type === 'WORKFLOW').length,
          formsCount: sol.formsCount ?? artifacts.filter((a: any) => a.type === 'FORM').length,
          artifactsCount: sol.artifactsCount ?? artifacts.length,
          metricsCount: sol.metricsCount ?? artifacts.filter((a: any) => a.type === 'METRIC' || a.type === 'KPI').length,
          brandsCount: sol.brandsCount ?? artifacts.filter((a: any) => a.type === 'BRAND').length,
          searchesCount: sol.searchesCount ?? artifacts.filter((a: any) => a.type === 'SEARCH').length
        };
      });
    }

    res.json({ solutions });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET / Error:', err);
    res.status(500).json({ error: 'Failed to load solution blueprints.' });
  }
});

// GET /api/solutions/:id - Get specific solution blueprint detail
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const sol = await model.findFirst({
      where: { id, tenantId }
    });

    if (!sol) {
      return res.status(404).json({ error: 'Solution blueprint not found' });
    }

    const chat = Array.isArray(sol.chatMessages) ? sol.chatMessages : Array.isArray(sol.chatHistory) ? sol.chatHistory : [];
    const meta = (sol.metadata && typeof sol.metadata === 'object') ? sol.metadata : {};
    const versions = Array.isArray(meta.versions) ? meta.versions : [];
    res.json({
      ...sol,
      chatHistory: chat,
      chatMessages: chat,
      versions
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /:id Error:', err);
    res.status(500).json({ error: 'Failed to fetch solution blueprint details' });
  }
});

// POST /api/solutions - Create or update a solution blueprint in database
router.post('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);
    const body = req.body;

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const solutionId = body.id || `sol_${Date.now()}`;
    const mergedMetadata = {
      ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      ...(Array.isArray(body.versions) ? { versions: body.versions.slice(0, 30) } : {})
    };

    const upserted = await model.upsert({
      where: { id: solutionId },
      update: {
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || body.chatHistory || [],
        metadata: mergedMetadata
      },
      create: {
        id: solutionId,
        tenantId,
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || body.chatHistory || [],
        metadata: mergedMetadata
      }
    });

    res.status(201).json({
      ...upserted,
      versions: Array.isArray((upserted.metadata as any)?.versions) ? (upserted.metadata as any).versions : []
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save solution blueprint' });
  }
});

// DELETE /api/solutions/:id - Delete solution blueprint from database
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (model) {
      await model.deleteMany({
        where: { id, tenantId }
      });
    }

    res.json({ success: true, message: `Solution blueprint ${id} removed.` });
  } catch (err: any) {
    console.error('[SolutionRoutes] DELETE /:id Error:', err);
    res.status(500).json({ error: 'Failed to delete solution blueprint' });
  }
});

// POST /api/solutions/:id/rollback - Restore a previous draft version snapshot
router.post('/:id/rollback', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body || {};
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const blueprint = await model.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found' });
    }

    const meta = (blueprint.metadata && typeof blueprint.metadata === 'object') ? (blueprint.metadata as any) : {};
    const versions: any[] = Array.isArray(meta.versions) ? meta.versions : [];
    const target = versions.find((v: any) => v.id === versionId);
    if (!target) {
      return res.status(404).json({ error: 'Version snapshot not found' });
    }

    const restored = await model.update({
      where: { id },
      data: {
        artifacts: target.artifacts || [],
        connectedModules: target.connectedModules || [],
        version: target.versionTag || blueprint.version,
        metadata: {
          ...meta,
          lastRollbackFrom: blueprint.version,
          lastRollbackAt: new Date().toISOString()
        }
      }
    });

    res.json({
      success: true,
      solution: {
        ...restored,
        versions
      }
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/rollback Error:', err);
    res.status(500).json({ error: 'Failed to rollback solution blueprint' });
  }
});

// GET /api/solutions/compliance-profile - Fetch tenant's Compliance-as-Code profile & catalog
router.get('/compliance-profile', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const profile = await getTenantComplianceProfile(tenantId);
    res.json({ profile, frameworks: COMPLIANCE_FRAMEWORKS });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /compliance-profile Error:', err);
    res.status(500).json({ error: err.message || 'Failed to load compliance profile.' });
  }
});

// PUT /api/solutions/compliance-profile - Update tenant's Compliance-as-Code profile
router.put('/compliance-profile', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const profile = await saveTenantComplianceProfile(tenantId, req.body || {});
    res.json({ profile, frameworks: COMPLIANCE_FRAMEWORKS });
  } catch (err: any) {
    console.error('[SolutionRoutes] PUT /compliance-profile Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save compliance profile.' });
  }
});

// POST /api/solutions/:id/audit - Run interactive Critic & Compliance-as-Code Auto-Repair check on a draft
router.post('/:id/audit', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    let artifacts: any[] = Array.isArray(req.body?.artifacts) ? req.body.artifacts : [];
    if (artifacts.length === 0 && id && id !== 'draft') {
      const blueprint = await model?.findFirst({ where: { id, tenantId } });
      if (blueprint && Array.isArray(blueprint.artifacts)) {
        artifacts = blueprint.artifacts as any[];
      }
    }

    const report = auditAndRepairSolutionDraft(artifacts);
    const complianceProfile = await getTenantComplianceProfile(tenantId);
    const complianceEval = evaluateSolutionCompliance(report.repairedArtifacts, complianceProfile, { autoFix: true });

    const mergedFindings = [
      ...report.findings,
      ...complianceEval.findings
        .filter((cf) => cf.code !== 'COMPLIANCE_VERIFIED')
        .map((cf) => ({
          severity: cf.severity === 'ERROR' ? 'ERROR' : cf.severity === 'WARNING' ? 'WARNING' : 'INFO',
          code: cf.code,
          artifactId: cf.artifactId,
          artifactName: cf.artifactName,
          message: `[${cf.framework}] ${cf.message}`,
          autoFixable: cf.autoFixable,
        })),
    ];

    res.json({
      ...report,
      findings: mergedFindings,
      autoFixCount: report.autoFixCount + complianceEval.autoFixCount,
      repairedArtifacts: complianceEval.repairedArtifacts,
      compliance: {
        frameworks: complianceProfile.frameworks,
        score: complianceEval.score,
        autoFixCount: complianceEval.autoFixCount,
      },
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/audit Error:', err);
    res.status(500).json({ error: err.message || 'Failed to audit solution draft.' });
  }
});

// POST /api/solutions/:id/publish-template - Save Solution Blueprint to workspace Template Catalog
router.post('/:id/publish-template', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    const blueprint = await model?.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found.' });
    }

    const tmplModel: any = (globalPrisma as any).templateCatalog;
    if (!tmplModel) {
      return res.status(501).json({ error: 'TemplateCatalog model is not available.' });
    }

    const templateName = String(req.body?.name || blueprint.name || 'Solution Template').trim();
    const category = String(req.body?.category || blueprint.category || 'Operations');
    const description = String(req.body?.description || blueprint.description || `Reusable solution blueprint (${templateName}).`);

    const created = await tmplModel.create({
      data: {
        name: templateName,
        builderType: 'SOLUTION',
        category,
        description,
        isSystem: false,
        config: {
          version: blueprint.version || '1.0.0',
          artifacts: blueprint.artifacts || [],
          connectedModules: blueprint.connectedModules || [],
        },
      },
    });

    res.status(201).json({ success: true, template: created });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/publish-template Error:', err);
    res.status(500).json({ error: err.message || 'Failed to publish solution template.' });
  }
});

// POST /api/solutions/:id/preflight - Validate cross-references, Core impacts & collisions before deploy
router.post('/:id/preflight', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    const blueprint = await model?.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found for pre-flight check.' });
    }

    const artifacts: any[] = Array.isArray(blueprint.artifacts) ? blueprint.artifacts : [];
    const checks: Array<{ id: string; severity: 'pass' | 'warning' | 'blocker'; title: string; detail: string }> = [];
    const coreImpacts: Array<{ id: string; name: string; type: string; detail: string }> = [];
    const componentsToProvision: Array<{ id: string; name: string; type: string; origin: string }> = [];

    if (artifacts.length === 0) {
      checks.push({
        id: 'chk_empty',
        severity: 'blocker',
        title: 'No components in Solution',
        detail: 'Add or generate at least one component before deploying.'
      });
    } else {
      checks.push({
        id: 'chk_bundle',
        severity: 'pass',
        title: `${artifacts.length} components ready in draft bundle`,
        detail: 'All component definitions are well-formed and staged in isolated draft state.'
      });
    }

    const moduleIds = new Set(artifacts.filter((a) => a.type === 'MODULE').map((a) => a.id));

    for (const art of artifacts) {
      if (art.isSharedCore || art.origin === 'CORE') {
        coreImpacts.push({
          id: art.id,
          name: art.name,
          type: art.type,
          detail: 'Linked as extension-only (Core baseline protected)'
        });
      } else {
        componentsToProvision.push({
          id: art.id,
          name: art.name,
          type: art.type,
          origin: art.origin || 'AI_GEN'
        });
      }

      if (art.linkedModuleId && !moduleIds.has(art.linkedModuleId)) {
        checks.push({
          id: `chk_ref_${art.id}`,
          severity: 'warning',
          title: `Unresolved module link on "${art.name}"`,
          detail: `References module "${art.linkedModuleId}" which is not in this draft. It will deploy standalone.`
        });
      }
    }

    // Check existing live assets to compute a real Re-Deploy Diff (new vs modified vs unchanged)
    const diffItems: Array<{
      id: string;
      name: string;
      type: string;
      changeType: 'NEW' | 'MODIFIED' | 'CORE_EXTENSION';
      summary: string;
    }> = [];

    try {
      const [existingModules, existingForms, existingWorkflows, existingRoles] = await Promise.all([
        (db as any).module?.findMany({ where: { tenantId }, select: { id: true, name: true, config: true } }).catch(() => []) || [],
        (db as any).form?.findMany({ where: { tenantId }, select: { id: true, name: true } }).catch(() => []) || [],
        (db as any).workflow?.findMany({ where: { tenantId }, select: { id: true, name: true, nodes: true } }).catch(() => []) || [],
        (db as any).permissionGroup?.findMany({ where: { tenantId }, select: { id: true, name: true } }).catch(() => []) || [],
      ]);

      const modByName = new Map<string, any>((existingModules || []).map((m: any) => [String(m.name || '').toLowerCase(), m]));
      const formNames = new Set((existingForms || []).map((f: any) => String(f.name || '').toLowerCase()));
      const wfByName = new Map<string, any>((existingWorkflows || []).map((w: any) => [String(w.name || '').toLowerCase(), w]));
      const roleNames = new Set((existingRoles || []).map((r: any) => String(r.name || '').toLowerCase()));

      for (const art of artifacts) {
        const lower = String(art.name || '').toLowerCase();
        if (art.isSharedCore || art.origin === 'CORE') {
          const extFieldCount = Array.isArray(art.content?.layout) ? art.content.layout.length : 0;
          diffItems.push({
            id: art.id,
            name: art.name,
            type: art.type,
            changeType: 'CORE_EXTENSION',
            summary: `Extension-only link (${extFieldCount} fields staged; Core baseline protected)`,
          });
          continue;
        }

        if (art.type === 'MODULE' && modByName.has(lower)) {
          const liveMod = modByName.get(lower);
          const liveFields = Array.isArray(liveMod?.config?.layout) ? liveMod.config.layout : [];
          const draftFields = Array.isArray(art.content?.layout) ? art.content.layout : [];
          const liveIds = new Set(liveFields.map((f: any) => f.id));
          const addedCount = draftFields.filter((f: any) => !liveIds.has(f.id)).length;
          checks.push({
            id: `chk_col_${art.id}`,
            severity: 'warning',
            title: `Existing module "${art.name}" will be updated`,
            detail: addedCount > 0
              ? `Merges ${addedCount} new field(s) into your existing "${art.name}" module.`
              : `Updates configuration on your existing "${art.name}" module.`,
          });
          diffItems.push({
            id: art.id,
            name: art.name,
            type: art.type,
            changeType: 'MODIFIED',
            summary: addedCount > 0 ? `+${addedCount} new field(s) merged into live module` : 'Merges updates into live module',
          });
        } else if (art.type === 'WORKFLOW' && wfByName.has(lower)) {
          const liveWf = wfByName.get(lower);
          const liveCount = Array.isArray(liveWf?.nodes) ? liveWf.nodes.length : 0;
          const draftCount = Array.isArray(art.content?.nodes) ? art.content.nodes.length : 0;
          diffItems.push({
            id: art.id,
            name: art.name,
            type: art.type,
            changeType: 'MODIFIED',
            summary: `Updates live workflow (${liveCount} → ${draftCount} stages)`,
          });
        } else if ((art.type === 'FORM' && formNames.has(lower)) || (art.type === 'PERMISSION' && roleNames.has(lower))) {
          diffItems.push({
            id: art.id,
            name: art.name,
            type: art.type,
            changeType: 'MODIFIED',
            summary: `Updates existing live ${art.type.toLowerCase()}`,
          });
        } else {
          diffItems.push({
            id: art.id,
            name: art.name,
            type: art.type,
            changeType: 'NEW',
            summary: `Creates new ${art.type.toLowerCase()} in workspace`,
          });
        }
      }
    } catch (_) {}

    if (coreImpacts.length > 0) {
      checks.push({
        id: 'chk_core',
        severity: 'pass',
        title: `${coreImpacts.length} shared Platform Core asset(s) protected`,
        detail: 'Core baselines will not be overwritten; only additive Solution extensions apply.'
      });
    }

    const hasBlocker = checks.some((c) => c.severity === 'blocker');

    // Blast Radius Dependency Scanner (compares MODIFIED modules & workflows against live & draft dependencies)
    const blastRadius: Array<{
      id: string;
      sourceArtifactId: string;
      sourceArtifactName: string;
      changeKind: 'FIELD_REMOVED' | 'FIELD_TYPE_CHANGED' | 'STAGE_REMOVED';
      targetKey: string;
      targetLabel: string;
      affectedAssetType: string;
      affectedAssetName: string;
      scope: 'LIVE_WORKSPACE' | 'DRAFT_SOLUTION';
      severity: 'high' | 'medium';
      detail: string;
      suggestedFix: string;
    }> = [];

    try {
      const flattenFields = (list: any[]): any[] => {
        const out: any[] = [];
        if (!Array.isArray(list)) return out;
        for (const f of list) {
          if (!f || typeof f !== 'object') continue;
          out.push(f);
          if (Array.isArray(f.fields)) out.push(...flattenFields(f.fields));
        }
        return out;
      };

      const [liveMods, liveWfs, liveAutomations, liveTemplates, liveViews, liveKpis] = await Promise.all([
        (db as any).module?.findMany?.({ where: { tenantId }, select: { id: true, name: true, config: true } }).catch(() => []) ?? [],
        (db as any).workflow?.findMany?.({ where: { tenantId }, select: { id: true, name: true, moduleId: true, nodes: true } }).catch(() => []) ?? [],
        (db as any).automation?.findMany?.({ where: { tenantId }, select: { id: true, name: true, moduleId: true, triggers: true, actions: true, conditions: true } }).catch(() => []) ?? [],
        (db as any).documentTemplate?.findMany?.({ where: { tenantId }, select: { id: true, name: true, moduleId: true, content: true, blocks: true } }).catch(() => []) ?? [],
        (db as any).savedView?.findMany?.({ where: { tenantId }, select: { id: true, name: true, scopeId: true, filterState: true } }).catch(() => []) ?? [],
        (db as any).kpiDefinition?.findMany?.({ where: { tenantId }, select: { id: true, name: true, sourceConfig: true } }).catch(() => []) ?? [],
      ]);

      const liveModMap = new Map<string, any>();
      for (const m of liveMods || []) liveModMap.set(String(m.name || '').toLowerCase(), m);
      const liveWfMap = new Map<string, any>();
      for (const w of liveWfs || []) liveWfMap.set(String(w.name || '').toLowerCase(), w);

      const scanReferences = (
        sourceArt: any,
        changeKind: 'FIELD_REMOVED' | 'FIELD_TYPE_CHANGED' | 'STAGE_REMOVED',
        token: string,
        label: string
      ) => {
        const tokenLower = token.toLowerCase();
        if (!tokenLower || tokenLower.length < 2) return;
        const regex = new RegExp(`\\b${tokenLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

        // Scan live automations
        for (const auto of liveAutomations || []) {
          const blob = JSON.stringify({ t: auto.triggers, a: auto.actions, c: auto.conditions });
          if (regex.test(blob)) {
            blastRadius.push({
              id: `br_live_auto_${sourceArt.id}_${token}_${auto.id}`,
              sourceArtifactId: sourceArt.id,
              sourceArtifactName: sourceArt.name,
              changeKind,
              targetKey: token,
              targetLabel: label,
              affectedAssetType: 'AUTOMATION',
              affectedAssetName: auto.name || 'Live Automation',
              scope: 'LIVE_WORKSPACE',
              severity: 'high',
              detail: `Live automation "${auto.name}" references "${label}" (${token}).`,
              suggestedFix: `Update "${auto.name}" triggers/actions to remap or remove "${token}".`,
            });
          }
        }

        // Scan live document templates
        for (const tmpl of liveTemplates || []) {
          const blob = JSON.stringify({ c: tmpl.content, b: tmpl.blocks });
          if (regex.test(blob)) {
            blastRadius.push({
              id: `br_live_tmpl_${sourceArt.id}_${token}_${tmpl.id}`,
              sourceArtifactId: sourceArt.id,
              sourceArtifactName: sourceArt.name,
              changeKind,
              targetKey: token,
              targetLabel: label,
              affectedAssetType: 'TEMPLATE',
              affectedAssetName: tmpl.name || 'Document Template',
              scope: 'LIVE_WORKSPACE',
              severity: 'medium',
              detail: `Document template "${tmpl.name}" merges "${label}" (${token}).`,
              suggestedFix: `Update merge tags in "${tmpl.name}" to match the new schema.`,
            });
          }
        }

        // Scan live views & KPIs
        for (const view of liveViews || []) {
          if (regex.test(JSON.stringify(view.filterState || {}))) {
            blastRadius.push({
              id: `br_live_view_${sourceArt.id}_${token}_${view.id}`,
              sourceArtifactId: sourceArt.id,
              sourceArtifactName: sourceArt.name,
              changeKind,
              targetKey: token,
              targetLabel: label,
              affectedAssetType: 'VIEW',
              affectedAssetName: view.name || 'Saved View',
              scope: 'LIVE_WORKSPACE',
              severity: 'medium',
              detail: `Saved view "${view.name}" filters or sorts on "${label}" (${token}).`,
              suggestedFix: `Adjust filter/column bindings in "${view.name}".`,
            });
          }
        }

        for (const kpi of liveKpis || []) {
          if (regex.test(JSON.stringify(kpi.sourceConfig || {}))) {
            blastRadius.push({
              id: `br_live_kpi_${sourceArt.id}_${token}_${kpi.id}`,
              sourceArtifactId: sourceArt.id,
              sourceArtifactName: sourceArt.name,
              changeKind,
              targetKey: token,
              targetLabel: label,
              affectedAssetType: 'KPI',
              affectedAssetName: kpi.name || 'KPI Metric',
              scope: 'LIVE_WORKSPACE',
              severity: 'high',
              detail: `KPI "${kpi.name}" aggregates or filters by "${label}" (${token}).`,
              suggestedFix: `Update KPI "${kpi.name}" field/filter reference.`,
            });
          }
        }

        // Scan other draft artifacts in the current solution
        for (const other of artifacts) {
          if (other.id === sourceArt.id) continue;
          if (!['FORM', 'VALIDATION', 'AUTOMATION', 'REPORT', 'QUEUE', 'KPI', 'CONTENT', 'VIEW'].includes(other.type)) {
            continue;
          }
          if (regex.test(JSON.stringify(other.content || {}))) {
            blastRadius.push({
              id: `br_draft_${sourceArt.id}_${token}_${other.id}`,
              sourceArtifactId: sourceArt.id,
              sourceArtifactName: sourceArt.name,
              changeKind,
              targetKey: token,
              targetLabel: label,
              affectedAssetType: other.type,
              affectedAssetName: other.name || other.type,
              scope: 'DRAFT_SOLUTION',
              severity: 'high',
              detail: `Draft ${other.type.toLowerCase()} "${other.name}" references "${label}" (${token}).`,
              suggestedFix: `Repair "${other.name}" so it no longer references removed/changed "${token}".`,
            });
          }
        }
      };

      for (const art of artifacts) {
        if (art.isSharedCore || art.origin === 'CORE') continue;
        const lower = String(art.name || '').toLowerCase();

        if (art.type === 'MODULE' && liveModMap.has(lower)) {
          const liveMod = liveModMap.get(lower);
          const liveFields = flattenFields(liveMod?.config?.layout || []);
          const draftFields = flattenFields(art.content?.layout || []);
          const draftById = new Map<string, any>(draftFields.map((f: any) => [f.id, f]));

          for (const lf of liveFields) {
            if (!lf.id || ['heading', 'divider', 'spacer', 'alert'].includes(lf.type)) continue;
            const df = draftById.get(lf.id);
            if (!df) {
              scanReferences(art, 'FIELD_REMOVED', lf.id, lf.label || lf.id);
            } else if (df.type && lf.type && df.type !== lf.type) {
              scanReferences(art, 'FIELD_TYPE_CHANGED', lf.id, `${lf.label || lf.id} (${lf.type} → ${df.type})`);
            }
          }
        }

        if (art.type === 'WORKFLOW' && liveWfMap.has(lower)) {
          const liveWf = liveWfMap.get(lower);
          const liveStages = (Array.isArray(liveWf?.nodes) ? liveWf.nodes : [])
            .map((n: any) => String(n.name || n.label || '').trim())
            .filter(Boolean);
          const draftStageSet = new Set(
            (Array.isArray(art.content?.nodes) ? art.content.nodes : [])
              .map((n: any) => String(n.name || n.label || '').trim().toLowerCase())
              .filter(Boolean)
          );
          for (const st of liveStages) {
            if (!draftStageSet.has(st.toLowerCase())) {
              scanReferences(art, 'STAGE_REMOVED', st, st);
            }
          }
        }
      }
    } catch (_) {}

    if (blastRadius.length > 0) {
      checks.push({
        id: 'chk_blast_radius',
        severity: 'warning',
        title: `${blastRadius.length} downstream dependency impact(s) detected`,
        detail: 'Review the Blast Radius section below or click "Generate Fix Patches" before deploying.',
      });
    }

    // Run Compliance-as-Code Evaluation against Tenant's active regulatory profile
    const complianceProfile = await getTenantComplianceProfile(tenantId);
    const complianceEval = evaluateSolutionCompliance(artifacts, complianceProfile, { autoFix: false });
    for (const cf of complianceEval.findings) {
      if (cf.severity === 'PASS' && cf.code !== 'COMPLIANCE_VERIFIED') continue;
      checks.push({
        id: cf.id,
        severity: cf.severity === 'ERROR' ? 'warning' : cf.severity === 'WARNING' ? 'warning' : 'pass',
        title: `[${cf.framework}] ${cf.title}`,
        detail: cf.message,
      });
    }

    res.json({
      canDeploy: !hasBlocker,
      totalComponents: artifacts.length,
      coreExtensionsCount: coreImpacts.length,
      netNewCount: componentsToProvision.length,
      checks,
      coreImpacts,
      componentsToProvision,
      diffItems,
      blastRadius: blastRadius.slice(0, 30),
      compliance: {
        frameworks: complianceProfile.frameworks,
        score: complianceEval.score,
        fixableCount: complianceEval.findings.filter((f) => f.autoFixable && f.severity !== 'PASS').length,
      },
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/preflight Error:', err);
    res.status(500).json({ error: err.message || 'Failed to run pre-flight check.' });
  }
});

// POST /api/solutions/:id/deploy - Real Workspace End-to-End Solution Provisioner Runner (All 19 Types)
router.post('/:id/deploy', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    const blueprint = await model?.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found for deployment.' });
    }

    const artifacts = Array.isArray(blueprint.artifacts) ? blueprint.artifacts : [];
    const provisionedResources: string[] = [];
    const draftToLiveId = new Map<string, string>();

    // Resolve default workspaceId for Module/Page provisioning
    let defaultWorkspaceId = 'default';
    try {
      const ws = await (db as any).workspace?.findFirst({ where: { tenantId }, select: { id: true } });
      if (ws?.id) defaultWorkspaceId = ws.id;
    } catch (_) {}

    // 0. Provision Custom Modules (respecting Extension-Only for Shared Core)
    const moduleArtifacts = artifacts.filter((a: any) => a.type === 'MODULE');
    for (const mArt of moduleArtifacts) {
      try {
        if (mArt.isSharedCore || mArt.origin === 'CORE') {
          const coreId = mArt.sourceTemplateId || mArt.slug || mArt.id;
          draftToLiveId.set(mArt.id, coreId);
          // Persist additive extension fields safely without mutating Core baseline
          const extFields = Array.isArray(mArt.content?.layout)
            ? mArt.content.layout.filter((f: any) => !f.isCoreBaseline)
            : [];
          if (extFields.length > 0) {
            try {
              const tRow = await globalPrisma.tenant.findUnique({ where: { id: tenantId }, select: { workspaceSettings: true } });
              const curWs = (tRow?.workspaceSettings as any) || {};
              const coreExts = { ...(curWs.coreModuleExtensions || {}) };
              coreExts[coreId] = {
                ...(coreExts[coreId] || {}),
                solutionId: id,
                fields: extFields,
                updatedAt: new Date().toISOString(),
              };
              await globalPrisma.tenant.update({
                where: { id: tenantId },
                data: { workspaceSettings: { ...curWs, coreModuleExtensions: coreExts } },
              });
            } catch {}
          }
          provisionedResources.push(`Linked Platform Core (Extension-Only): ${mArt.name}`);
          continue;
        }
        const liveModId = `mod_${mArt.id}`;
        draftToLiveId.set(mArt.id, liveModId);
        const mc = mArt.content || {};
        if ((db as any).module) {
          await (db as any).module.upsert({
            where: { id: liveModId },
            update: {
              name: mArt.name,
              description: mArt.description || mc.description || '',
              config: {
                ...(mc || {}),
                solutionId: id,
                layout: mc.layout || mc.fields || [],
              },
              status: 'ACTIVE',
              enabled: true
            },
            create: {
              id: liveModId,
              tenantId,
              workspaceId: defaultWorkspaceId,
              name: mArt.name,
              description: mArt.description || mc.description || '',
              category: mc.category || blueprint.name || 'Solution',
              iconName: mc.iconName || 'Layers',
              type: mc.type || 'REGISTRY',
              status: 'ACTIVE',
              enabled: true,
              config: {
                ...(mc || {}),
                solutionId: id,
                layout: mc.layout || mc.fields || [],
              }
            }
          });
          provisionedResources.push(`Data Module: ${mArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Module error for ${mArt.name}:`, e);
      }
    }

    // 0b. Provision Validation Rulesets (ValidationRuleset Table)
    const validationArtifacts = artifacts.filter((a: any) => a.type === 'VALIDATION');
    for (const vArt of validationArtifacts) {
      try {
        const vc = vArt.content || {};
        const resolvedModId = vArt.linkedModuleId ? (draftToLiveId.get(vArt.linkedModuleId) || vArt.linkedModuleId) : null;
        if ((db as any).validationRuleset) {
          await (db as any).validationRuleset.upsert({
            where: { id: `val_${vArt.id}` },
            update: {
              name: vArt.name,
              description: vArt.description || vc.description || '',
              moduleId: resolvedModId,
              scope: resolvedModId ? 'MODULE' : 'GLOBAL',
              rules: vc.rules || []
            },
            create: {
              id: `val_${vArt.id}`,
              tenantId,
              moduleId: resolvedModId,
              scope: resolvedModId ? 'MODULE' : 'GLOBAL',
              name: vArt.name,
              description: vArt.description || vc.description || '',
              rules: vc.rules || []
            }
          });
          provisionedResources.push(`Validation Ruleset: ${vArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Validation error for ${vArt.name}:`, e);
      }
    }

    // 0c. Provision Roles & Permission Policies (PermissionGroup Table)
    const roleArtifacts = artifacts.filter((a: any) => a.type === 'PERMISSION');
    for (const rArt of roleArtifacts) {
      try {
        const rc = rArt.content || {};
        const remappedModulePolicies: Record<string, any> = {};
        if (rc.modulePolicies && typeof rc.modulePolicies === 'object') {
          for (const [k, v] of Object.entries(rc.modulePolicies)) {
            remappedModulePolicies[draftToLiveId.get(k) || k] = v;
          }
        }
        if ((db as any).permissionGroup) {
          await (db as any).permissionGroup.upsert({
            where: { id: `role_${rArt.id}` },
            update: {
              name: rArt.name,
              description: rArt.description || rc.description || '',
              type: rc.type || 'SOLUTION',
              status: 'ACTIVE',
              capabilities: rc.capabilities || [],
              modulePolicies: remappedModulePolicies,
              workflowPolicies: rc.workflowPolicies || {},
              aiPolicies: rc.aiPolicies || {},
              solutionId: id
            },
            create: {
              id: `role_${rArt.id}`,
              tenantId,
              name: rArt.name,
              slug: rc.slug || rArt.slug || `role-${rArt.id}`,
              description: rArt.description || rc.description || '',
              type: rc.type || 'SOLUTION',
              status: 'ACTIVE',
              capabilities: rc.capabilities || [],
              modulePolicies: remappedModulePolicies,
              workflowPolicies: rc.workflowPolicies || {},
              aiPolicies: rc.aiPolicies || {},
              solutionId: id
            }
          });
          provisionedResources.push(`Role Policy: ${rArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Role error for ${rArt.name}:`, e);
      }
    }

    // 0d. Provision Workspace Pages (Module table with type='PAGE')
    const pageArtifacts = artifacts.filter((a: any) => a.type === 'PAGE' && !String(a.id).startsWith('art_spec_'));
    for (const pgArt of pageArtifacts) {
      try {
        const pc = pgArt.content || {};
        if ((db as any).module) {
          await (db as any).module.upsert({
            where: { id: `page_${pgArt.id}` },
            update: {
              name: pgArt.name,
              config: { ...(pc || {}), widgets: pc.widgets || [], solutionId: id }
            },
            create: {
              id: `page_${pgArt.id}`,
              tenantId,
              workspaceId: defaultWorkspaceId,
              name: pgArt.name,
              category: 'Workspace Pages',
              iconName: pc.iconName || 'Layout',
              type: 'PAGE',
              status: 'ACTIVE',
              enabled: true,
              config: { ...(pc || {}), widgets: pc.widgets || [], solutionId: id }
            }
          });
          provisionedResources.push(`Workspace Page: ${pgArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Page error for ${pgArt.name}:`, e);
      }
    }

    // 1. Provision Global Picklists (GlobalList Table)
    const picklistArtifacts = artifacts.filter((a: any) => a.type === 'GLOBAL_LIST');
    for (const pArt of picklistArtifacts) {
      try {
        const options = pArt.content?.options || ['Standard Support', 'Enterprise SLA'];
        if (db.globalList) {
          await db.globalList.upsert({
            where: { id: `glist_${pArt.id}` },
            update: { name: pArt.name, values: options },
            create: { id: `glist_${pArt.id}`, tenantId, name: pArt.name, category: 'General', values: options }
          });
          provisionedResources.push(`Global Picklist: ${pArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Picklist error for ${pArt.name}:`, e);
      }
    }

    // 2. Provision Forms (Form Table — with remapped live moduleId)
    const formArtifacts = artifacts.filter((a: any) => a.type === 'FORM');
    for (const fArt of formArtifacts) {
      try {
        const resolvedModId = fArt.linkedModuleId
          ? (draftToLiveId.get(fArt.linkedModuleId) || fArt.linkedModuleId)
          : null;
        if (db.form) {
          await db.form.upsert({
            where: { id: `form_${fArt.id}` },
            update: {
              name: fArt.name,
              moduleId: resolvedModId,
              isGlobal: !resolvedModId,
              schema: { ...(fArt.content || {}), solutionId: id }
            },
            create: {
              id: `form_${fArt.id}`,
              tenantId,
              moduleId: resolvedModId,
              isGlobal: !resolvedModId,
              name: fArt.name,
              status: 'PUBLISHED',
              schema: { ...(fArt.content || {}), solutionId: id }
            }
          });
          provisionedResources.push(`Interactive Form: ${fArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Form error for ${fArt.name}:`, e);
      }
    }

    // 3. Provision Workflows (Workflow Table — using canonical nodes & edges fields)
    const flowArtifacts = artifacts.filter((a: any) => a.type === 'WORKFLOW');
    for (const wArt of flowArtifacts) {
      try {
        const wc = wArt.content || {};
        const resolvedModId = wArt.linkedModuleId ? (draftToLiveId.get(wArt.linkedModuleId) || wArt.linkedModuleId) : null;
        if (db.workflow) {
          await db.workflow.upsert({
            where: { id: `flow_${wArt.id}` },
            update: {
              name: wArt.name,
              description: wArt.description || wc.description || '',
              moduleId: resolvedModId,
              isGlobal: !resolvedModId,
              nodes: wc.nodes || [],
              edges: wc.edges || [],
              status: 'PUBLISHED'
            },
            create: {
              id: `flow_${wArt.id}`,
              tenantId,
              moduleId: resolvedModId,
              isGlobal: !resolvedModId,
              name: wArt.name,
              description: wArt.description || wc.description || '',
              triggerType: wc.triggerType || 'RECORD_EVENT',
              nodes: wc.nodes || [],
              edges: wc.edges || [],
              status: 'PUBLISHED',
              version: 1
            }
          });
          provisionedResources.push(`Process Workflow: ${wArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Workflow error for ${wArt.name}:`, e);
      }
    }

    // 4. Provision Autonomous AI Agents (Digital Coworkers — idempotent upsert)
    const agentArtifacts = artifacts.filter((a: any) => a.type === 'AGENT');
    for (const aArt of agentArtifacts) {
      try {
        const agentConfig = { ...(aArt.content || {}), solutionId: id };
        const agentName = aArt.name || agentConfig.name || 'Autonomous Solution Copilot';
        const role = agentConfig.roleTitle || agentConfig.workforceMapping?.role || 'Digital Coworker';
        const modelType = agentConfig.modelConfig?.model || 'gemini-2.5-flash';
        const liveAgentId = `agent_${aArt.id}`;

        let agentRecord: any = null;
        if (db.agent) {
          agentRecord = await db.agent.upsert({
            where: { id: liveAgentId },
            update: { name: agentName, modelType, config: agentConfig },
            create: { id: liveAgentId, tenantId, name: agentName, modelType, config: agentConfig }
          });
        }

        if (db.tenantMember) {
          const existingMember = await db.tenantMember.findFirst({
            where: { tenantId, agentId: agentRecord?.id || liveAgentId }
          });
          if (existingMember) {
            await db.tenantMember.update({
              where: { id: existingMember.id },
              data: {
                firstName: agentName.split(' ')[0] || 'AI',
                familyName: agentName.split(' ').slice(1).join(' ') || 'Copilot',
                roleId: role,
                agentConfig
              }
            });
          } else {
            await db.tenantMember.create({
              data: {
                tenantId,
                agentId: agentRecord?.id || liveAgentId,
                firstName: agentName.split(' ')[0] || 'AI',
                familyName: agentName.split(' ').slice(1).join(' ') || 'Copilot',
                roleId: role,
                status: 'Active',
                isSynthetic: true,
                licenceType: agentConfig.workforceMapping?.licenceType || 'AI Agent Seat',
                avatarUrl: agentConfig.avatarUrl || null,
                agentConfig
              }
            });
          }
        }
        provisionedResources.push(`AI Digital Coworker: ${agentName}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Agent error for ${aArt.name}:`, e);
      }
    }
    // 5. Provision Semantic Metrics & KPIs (KpiDefinition Table — remapping moduleId)
    const metricArtifacts = artifacts.filter((a: any) => a.type === 'METRIC' || a.type === 'KPI');
    for (const mArt of metricArtifacts) {
      try {
        const mConfig = mArt.content || {};
        const rawSourceCfg = (mConfig.sourceConfig && typeof mConfig.sourceConfig === 'object') ? { ...mConfig.sourceConfig } : {};
        const rawModId = rawSourceCfg.moduleId || mArt.linkedModuleId;
        if (rawModId) {
          rawSourceCfg.moduleId = draftToLiveId.get(rawModId) || rawModId;
        }
        if (db.kpiDefinition) {
          await db.kpiDefinition.upsert({
            where: { id: `kpi_${mArt.id}` },
            update: {
              name: mArt.name,
              category: mConfig.category || 'Operations',
              sourceType: mConfig.sourceType || 'module_record',
              sourceConfig: rawSourceCfg,
              format: mConfig.format || 'percentage',
              targetValue: typeof mConfig.targetValue === 'number' ? mConfig.targetValue : null,
              thresholds: mConfig.thresholds || [],
              status: 'ACTIVE'
            },
            create: {
              id: `kpi_${mArt.id}`,
              tenantId,
              name: mArt.name,
              slug: mConfig.slug || mArt.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              description: mArt.description || mConfig.description || '',
              category: mConfig.category || 'Operations',
              tags: mConfig.tags || ['solution', 'kpi'],
              iconName: mConfig.iconName || 'Target',
              sourceType: mConfig.sourceType || 'module_record',
              sourceConfig: rawSourceCfg,
              format: mConfig.format || 'percentage',
              formatOptions: mConfig.formatOptions || {},
              trendDirection: mConfig.trendDirection || 'higher_is_better',
              targetValue: typeof mConfig.targetValue === 'number' ? mConfig.targetValue : null,
              thresholds: mConfig.thresholds || [],
              timeHorizon: mConfig.timeHorizon || 'trailing_30d',
              isGlobal: false,
              status: 'ACTIVE',
              cacheTtlSeconds: 300
            }
          });
        }
        provisionedResources.push(`Semantic Metric: ${mArt.name}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Metric error for ${mArt.name}:`, e);
      }
    }

    // 6. Provision Content & Document Templates (DocumentTemplate Table — remapping moduleId)
    const contentArtifacts = artifacts.filter((a: any) => a.type === 'CONTENT' || a.type === 'TEMPLATE');
    for (const cArt of contentArtifacts) {
      try {
        const cContent = cArt.content || {};
        const rawModId = cContent.moduleId || cArt.linkedModuleId;
        const resolvedModId = rawModId ? (draftToLiveId.get(rawModId) || rawModId) : null;
        if (db.documentTemplate) {
          await db.documentTemplate.upsert({
            where: { id: `tmpl_${cArt.id}` },
            update: {
              name: cArt.name,
              type: cContent.type || 'letter',
              moduleId: resolvedModId,
              description: cArt.description || '',
              content: typeof cContent === 'string' ? cContent : (cContent.content || ''),
              blocks: cContent.blocks || [],
              metadata: cContent.metadata || {},
              status: 'Published'
            },
            create: {
              id: `tmpl_${cArt.id}`,
              tenantId,
              moduleId: resolvedModId,
              name: cArt.name,
              type: cContent.type || 'letter',
              description: cArt.description || '',
              content: typeof cContent === 'string' ? cContent : (cContent.content || ''),
              blocks: cContent.blocks || [],
              metadata: cContent.metadata || {},
              status: 'Published',
              createdBy: 'SolutionDeployer'
            }
          });
        }
        provisionedResources.push(`Content Template: ${cArt.name}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] Content error for ${cArt.name}:`, e);
      }
    }

    // 7. Provision Brand Identities (BrandKit Table)
    const brandArtifacts = artifacts.filter((a: any) => a.type === 'BRAND');
    for (const bArt of brandArtifacts) {
      try {
        const bContent = bArt.content || {};
        const brandKitModel: any = (db as any).brandKit || globalPrisma.brandKit;
        if (brandKitModel) {
          const brandSlug = bContent.slug || bArt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `brand-${bArt.id}`;
          const brandData = {
            name: bArt.name || bContent.name || 'Brand Identity',
            slug: brandSlug,
            description: bArt.description || bContent.description || 'Enterprise Brand Kit provisioned by Solution Builder',
            isDefault: Boolean(bContent.isDefault),
            assets: bContent.assets || {},
            colors: bContent.colors || {
              primary: '#6366f1',
              secondary: '#4f46e5',
              accent: '#ec4899',
              background: '#ffffff',
              surface: '#f8fafc',
              text: '#0f172a',
              muted: '#64748b',
              border: '#e2e8f0',
              chartPalette: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
            },
            typography: bContent.typography || {
              headingFont: 'Plus Jakarta Sans',
              bodyFont: 'Inter',
              monoFont: 'JetBrains Mono',
              fontSizeScale: 'medium'
            },
            styling: bContent.styling || {
              borderRadius: '12px',
              buttonStyle: 'rounded',
              elevation: 'subtle',
              headerLayout: 'top_right',
              navLinkStyle: 'underline'
            },
            voiceAndTone: bContent.voiceAndTone || {
              tone: 'Professional & Modern',
              boilerplate: `${bArt.name} delivers modern workflows and platform excellence.`,
              tagline: 'Modern Platform Excellence',
              prohibitedWords: ['synergy', 'disruptive'],
              audiencePersona: 'Enterprise operators and stakeholders'
            },
            emailDefaults: bContent.emailDefaults || {
              signatureTemplate: 'standard',
              disclaimer: 'This email is confidential and intended solely for the recipient.',
              socialLinks: {}
            },
            metadata: {
              ...(bContent.metadata || {}),
              provisionedBySolution: id,
              artifactId: bArt.id
            }
          };

          const existing = await brandKitModel.findFirst({
            where: { tenantId, OR: [{ id: `brand_${bArt.id}` }, { slug: brandSlug }] }
          });

          if (existing) {
            await brandKitModel.update({
              where: { id: existing.id },
              data: brandData
            });
          } else {
            await brandKitModel.create({
              data: {
                id: `brand_${bArt.id}`,
                tenantId,
                ...brandData
              }
            });
          }
          provisionedResources.push(`Brand Kit: ${bArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Brand Kit error for ${bArt.name}:`, e);
      }
    }

    // 8. Provision Federated Searches (SavedQuery Table with isSearchEnabled = true)
    const searchArtifacts = artifacts.filter((a: any) => a.type === 'SEARCH');
    for (const sArt of searchArtifacts) {
      try {
        const sContent = sArt.content || {};
        const queryModel: any = (db as any).savedQuery || globalPrisma.savedQuery;
        if (queryModel) {
          const searchSlug = sContent.slug || sArt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `search-${sArt.id}`;
          const searchData = {
            name: sArt.name || sContent.name || 'Federated Search',
            slug: searchSlug,
            description: sArt.description || sContent.description || 'Federated cross-module search provisioned by Solution Builder',
            category: sContent.category || 'Operations',
            tags: Array.isArray(sContent.tags) ? sContent.tags : ['solution', 'search'],
            iconName: sContent.iconName || 'Search',
            isSearchEnabled: true,
            scopeType: sContent.scopeType || 'MULTI_MODULE',
            targetModuleIds: Array.isArray(sContent.targetModuleIds)
              ? sContent.targetModuleIds.map((mid: string) => draftToLiveId.get(mid) || mid)
              : [],
            searchConfig: sContent.searchConfig || {},
            allowedRoleIds: Array.isArray(sContent.allowedRoleIds) ? sContent.allowedRoleIds : [],
            sql: sContent.sql || '',
            parameters: Array.isArray(sContent.parameters) ? sContent.parameters : [],
            columnsConfig: Array.isArray(sContent.columnsConfig) ? sContent.columnsConfig : [],
            status: sContent.status || 'PUBLISHED',
            cacheTtlSeconds: typeof sContent.cacheTtlSeconds === 'number' ? sContent.cacheTtlSeconds : 0
          };

          const existing = await queryModel.findFirst({
            where: { tenantId, OR: [{ id: `search_${sArt.id}` }, { slug: searchSlug }] }
          });

          if (existing) {
            await queryModel.update({
              where: { id: existing.id },
              data: {
                ...searchData,
                updatedAt: new Date()
              }
            });
          } else {
            await queryModel.create({
              data: {
                id: `search_${sArt.id}`,
                tenantId,
                ...searchData
              }
            });
          }
          provisionedResources.push(`Federated Search: ${sArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Saved Search error for ${sArt.name}:`, e);
      }
    }

    // 9. Provision Saved Queries (SavedQuery Table with isSearchEnabled = false)
    const queryArtifacts = artifacts.filter((a: any) => a.type === 'QUERY');
    for (const qArt of queryArtifacts) {
      try {
        const qContent = qArt.content || {};
        const queryModel: any = (db as any).savedQuery || globalPrisma.savedQuery;
        if (queryModel) {
          const querySlug = (qArt.name || `query-${qArt.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const queryData = {
            name: qArt.name,
            slug: querySlug,
            description: qArt.description || qContent.description || 'Saved SQL query provisioned by Solution Builder',
            category: qContent.category || 'Analytics',
            tags: Array.isArray(qContent.tags) ? qContent.tags : ['solution', 'query'],
            iconName: qContent.iconName || 'Database',
            isSearchEnabled: false,
            scopeType: qContent.scopeType || 'MULTI_MODULE',
            sql: qContent.sql || `SELECT id, status, data, created_at FROM "Record" WHERE tenant_id = '${tenantId}' LIMIT 50;`,
            status: 'PUBLISHED',
            parameters: qContent.parameters || [],
            columnsConfig: qContent.columnsConfig || []
          };

          const existing = await queryModel.findFirst({
            where: { tenantId, OR: [{ id: `query_${qArt.id}` }, { slug: querySlug }] }
          });

          if (existing) {
            await queryModel.update({
              where: { id: existing.id },
              data: { ...queryData, updatedAt: new Date() }
            });
          } else {
            await queryModel.create({
              data: { id: `query_${qArt.id}`, tenantId, ...queryData }
            });
          }
          provisionedResources.push(`Saved Query: ${qArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Saved Query error for ${qArt.name}:`, e);
      }
    }

    // 10. Provision Automations (Automation Table — with remapped live moduleId)
    const automationArtifacts = artifacts.filter((a: any) => a.type === 'AUTOMATION');
    for (const autArt of automationArtifacts) {
      try {
        const autContent = autArt.content || {};
        const resolvedModId = autArt.linkedModuleId
          ? (draftToLiveId.get(autArt.linkedModuleId) || autArt.linkedModuleId)
          : null;
        const autModel: any = (db as any).automation || globalPrisma.automation;
        if (autModel) {
          await autModel.upsert({
            where: { id: `aut_${autArt.id}` },
            update: {
              name: autArt.name,
              moduleId: resolvedModId,
              description: autArt.description || autContent.description,
              actions: autContent.actions || [],
              triggers: autContent.triggers || [],
              isActive: true,
              status: 'PUBLISHED'
            },
            create: {
              id: `aut_${autArt.id}`,
              tenantId,
              moduleId: resolvedModId,
              name: autArt.name,
              description: autArt.description || autContent.description || 'Automation pipeline provisioned by Solution Builder',
              actions: autContent.actions || [],
              triggers: autContent.triggers || [],
              isActive: true,
              status: 'PUBLISHED'
            }
          });
          provisionedResources.push(`Automation Pipeline: ${autArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Automation error for ${autArt.name}:`, e);
      }
    }

    // 11. Provision BI Reports (Report Table — remapping module IDs)
    const reportArtifacts = artifacts.filter((a: any) => a.type === 'REPORT');
    for (const rArt of reportArtifacts) {
      try {
        const rContent = rArt.content || {};
        const reportModel: any = (db as any).report || globalPrisma.report;
        if (reportModel) {
          const baseCfg = rContent.config || rContent || {};
          const rawModId = baseCfg.sourceModuleId || rArt.linkedModuleId;
          const resolvedModId = rawModId ? (draftToLiveId.get(rawModId) || rawModId) : undefined;
          const rawTables = Array.isArray(baseCfg.dataSource?.tables) ? baseCfg.dataSource.tables : (resolvedModId ? [resolvedModId] : ['Record']);
          const remappedTables = rawTables.map((t: string) => draftToLiveId.get(t) || t);
          const reportConfig = {
            ...baseCfg,
            ...(resolvedModId ? { sourceModuleId: resolvedModId } : {}),
            dataSource: {
              ...(baseCfg.dataSource || { type: 'local' }),
              tables: remappedTables,
            },
            widgets: Array.isArray(baseCfg.widgets) ? baseCfg.widgets : [],
          };
          await reportModel.upsert({
            where: { id: `rep_${rArt.id}` },
            update: {
              name: rArt.name,
              description: rArt.description || rContent.description,
              config: reportConfig,
              status: 'Published'
            },
            create: {
              id: `rep_${rArt.id}`,
              tenantId,
              name: rArt.name,
              description: rArt.description || rContent.description || 'BI Report provisioned by Solution Builder',
              config: reportConfig,
              status: 'Published'
            }
          });
          provisionedResources.push(`BI Report: ${rArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Report error for ${rArt.name}:`, e);
      }
    }

    // 12. Provision Sites & Portals (Site Table — persisting theme, pages, navigation, chatConfig & linkedFormId)
    const siteArtifacts = artifacts.filter((a: any) => a.type === 'SITE');
    for (const sArt of siteArtifacts) {
      try {
        const sContent = sArt.content || {};
        const siteModel: any = (db as any).site || globalPrisma.site;
        if (siteModel) {
          const siteDomain = (sContent.domain || `${(sArt.name || 'portal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.aurora.app`);
          const resolvedFormId = sContent.linkedFormId ? `form_${sContent.linkedFormId}` : undefined;
          const fullSiteBranding = {
            ...(sContent.branding || {}),
            ...(sContent.theme ? { theme: sContent.theme } : {}),
            ...(Array.isArray(sContent.pages) ? { pages: sContent.pages } : {}),
            ...(Array.isArray(sContent.navigation) ? { navigation: sContent.navigation } : {}),
            ...(sContent.chatConfig ? { chatConfig: sContent.chatConfig } : {}),
            ...(resolvedFormId ? { linkedFormId: resolvedFormId } : {}),
            solutionId: id,
          };
          await siteModel.upsert({
            where: { id: `site_${sArt.id}` },
            update: {
              name: sArt.name,
              description: sArt.description || sContent.description,
              domain: siteDomain,
              category: sContent.category || 'internal',
              type: sContent.type || 'Customer Portal',
              status: 'active',
              access: sContent.access || 'Public',
              branding: fullSiteBranding
            },
            create: {
              id: `site_${sArt.id}`,
              tenantId,
              name: sArt.name,
              description: sArt.description || sContent.description || 'Portal provisioned by Solution Builder',
              domain: siteDomain,
              category: sContent.category || 'internal',
              type: sContent.type || 'Customer Portal',
              status: 'active',
              access: sContent.access || 'Public',
              branding: fullSiteBranding
            }
          });
          provisionedResources.push(`Site / Portal: ${sArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Site error for ${sArt.name}:`, e);
      }
    }

    // 13. Provision Work Queues (Tenant Workspace Queues — remapping moduleId & moduleIds)
    const queueArtifacts = artifacts.filter((a: any) => a.type === 'QUEUE');
    if (queueArtifacts.length > 0) {
      try {
        const tenantRecord = await globalPrisma.tenant.findUnique({
          where: { id: tenantId },
          select: { workspaceSettings: true }
        });
        const currentSettings = (tenantRecord?.workspaceSettings as any) || {};
        const existingQueues: any[] = Array.isArray(currentSettings.queues) ? [...currentSettings.queues] : [];

        for (const qArt of queueArtifacts) {
          const qContent = qArt.content || {};
          const rawModId = qContent.moduleId || qArt.linkedModuleId || '';
          const resolvedModId = rawModId ? (draftToLiveId.get(rawModId) || rawModId) : '';
          const resolvedModIds = Array.isArray(qContent.moduleIds)
            ? qContent.moduleIds.map((mid: string) => draftToLiveId.get(mid) || mid)
            : (resolvedModId ? [resolvedModId] : []);
          const newQueue = {
            id: `queue_${qArt.id}`,
            name: qArt.name,
            description: qArt.description || qContent.description || 'Work queue provisioned by Solution Builder',
            moduleId: resolvedModId,
            moduleIds: resolvedModIds,
            isUnifiedQueue: Boolean(qContent.isUnifiedQueue),
            queueConfig: qContent.queueConfig || {},
            columns: qContent.queueConfig?.columns || qContent.columns || [],
            conditions: qContent.queueConfig?.conditions || qContent.conditions || { rules: [] },
            slaConfig: qContent.slaConfig || (qContent.queueConfig?.slaMinutes ? { slaMinutes: qContent.queueConfig.slaMinutes } : null),
            createdAt: new Date().toISOString()
          };

          const qIndex = existingQueues.findIndex(q => q.id === newQueue.id);
          if (qIndex >= 0) {
            existingQueues[qIndex] = { ...existingQueues[qIndex], ...newQueue };
          } else {
            existingQueues.push(newQueue);
          }
          provisionedResources.push(`Work Queue: ${qArt.name}`);
        }

        await globalPrisma.tenant.update({
          where: { id: tenantId },
          data: {
            workspaceSettings: {
              ...currentSettings,
              queues: existingQueues
            }
          }
        });
      } catch (e) {
        console.warn(`[SolutionDeployer] Queue provisioning error:`, e);
      }
    }

    // 13b. Provision Navigation Menus (Tenant menuConfig) & Integrations (Tenant workspaceSettings)
    const navArtifacts = artifacts.filter((a: any) => a.type === 'NAVIGATION');
    const integrationArtifacts = artifacts.filter((a: any) => a.type === 'INTEGRATION' || a.type === 'API');
    if (navArtifacts.length > 0 || integrationArtifacts.length > 0) {
      try {
        const tenantRecord = await globalPrisma.tenant.findUnique({
          where: { id: tenantId },
          select: { menuConfig: true, workspaceSettings: true }
        });
        const currentMenu: any = (tenantRecord?.menuConfig && typeof tenantRecord.menuConfig === 'object')
          ? { ...(tenantRecord.menuConfig as any) }
          : {};
        const currentSettings: any = (tenantRecord?.workspaceSettings && typeof tenantRecord.workspaceSettings === 'object')
          ? { ...(tenantRecord.workspaceSettings as any) }
          : {};

        if (navArtifacts.length > 0) {
          const solutionMenus: any[] = Array.isArray(currentMenu.solutionMenus) ? [...currentMenu.solutionMenus] : [];
          for (const nArt of navArtifacts) {
            const nc = nArt.content || {};
            const remappedItems = (Array.isArray(nc.items) ? nc.items : []).map((it: any) => ({
              ...it,
              targetId: draftToLiveId.get(it.targetId) || it.targetId
            }));
            const entry = {
              id: `nav_${nArt.id}`,
              solutionId: id,
              name: nArt.name,
              layoutStyle: nc.layoutStyle || 'sidebar',
              items: remappedItems,
              updatedAt: new Date().toISOString()
            };
            const idx = solutionMenus.findIndex((m) => m.id === entry.id);
            if (idx >= 0) solutionMenus[idx] = entry;
            else solutionMenus.push(entry);
            provisionedResources.push(`Navigation Menu: ${nArt.name}`);
          }
          currentMenu.solutionMenus = solutionMenus;
          // Also merge non-home solution items into live menuConfig.items so they appear in the workspace sidebar
          if (Array.isArray(currentMenu.items)) {
            const existingIds = new Set(currentMenu.items.map((it: any) => it.id));
            for (const m of solutionMenus) {
              for (const it of m.items || []) {
                if (it.targetId && it.targetId !== '__home__' && !existingIds.has(it.targetId)) {
                  currentMenu.items.push({ id: it.targetId, label: it.label, type: 'module', solutionId: id });
                  existingIds.add(it.targetId);
                }
              }
            }
          }
        }

        if (integrationArtifacts.length > 0) {
          const solutionIntegrations: any[] = Array.isArray(currentSettings.solutionIntegrations)
            ? [...currentSettings.solutionIntegrations]
            : [];
          for (const iArt of integrationArtifacts) {
            const ic = iArt.content || {};
            const resolvedTarget = ic.targetEntity ? (draftToLiveId.get(ic.targetEntity) || ic.targetEntity) : (iArt.linkedModuleId ? (draftToLiveId.get(iArt.linkedModuleId) || iArt.linkedModuleId) : null);
            // If linked to a real active TenantConnector and connectorMapping table exists, upsert real mapping
            if (ic.connectorId && (db as any).connectorMapping) {
              try {
                await (db as any).connectorMapping.upsert({
                  where: { id: `cmap_${iArt.id}` },
                  update: {
                    connectorId: ic.connectorId,
                    moduleId: resolvedTarget,
                    sourceEntity: ic.sourceEntity || iArt.name,
                    targetEntity: resolvedTarget || '',
                    fieldMappings: ic.fieldMappings || {},
                  },
                  create: {
                    id: `cmap_${iArt.id}`,
                    tenantId,
                    connectorId: ic.connectorId,
                    moduleId: resolvedTarget,
                    sourceEntity: ic.sourceEntity || iArt.name,
                    targetEntity: resolvedTarget || '',
                    fieldMappings: ic.fieldMappings || {},
                  },
                });
              } catch {}
            }
            const entry = {
              id: `int_${iArt.id}`,
              solutionId: id,
              name: iArt.name,
              isSharedCore: Boolean(iArt.isSharedCore),
              config: { ...ic, targetEntity: resolvedTarget || ic.targetEntity },
              updatedAt: new Date().toISOString()
            };
            const idx = solutionIntegrations.findIndex((x) => x.id === entry.id);
            if (idx >= 0) solutionIntegrations[idx] = entry;
            else solutionIntegrations.push(entry);
            provisionedResources.push(`Integration: ${iArt.name}`);
          }
          currentSettings.solutionIntegrations = solutionIntegrations;
        }

        await globalPrisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(navArtifacts.length > 0 ? { menuConfig: currentMenu } : {}),
            ...(integrationArtifacts.length > 0 ? { workspaceSettings: currentSettings } : {})
          }
        });
      } catch (e) {
        console.warn(`[SolutionDeployer] Menu/Integration provisioning error:`, e);
      }
    }

    // 13c. Provision Saved Views (SavedView Table — remapping scopeId)
    const viewArtifacts = artifacts.filter((a: any) => a.type === 'VIEW');
    for (const vwArt of viewArtifacts) {
      try {
        const vc = vwArt.content || {};
        const rawScope = vc.scopeId || vwArt.linkedModuleId || '';
        const resolvedScope = rawScope ? (draftToLiveId.get(rawScope) || rawScope) : 'workspace';
        await globalPrisma.savedView.upsert({
          where: { id: `view_${vwArt.id}` },
          update: {
            name: vwArt.name,
            description: vwArt.description || vc.description || '',
            scopeType: vc.scopeType || 'MODULE',
            scopeId: resolvedScope,
            icon: vc.icon || 'Bookmark',
            filterState: vc.filterState || {},
            isShared: vc.isShared !== false,
            isDefault: Boolean(vc.isDefault),
          },
          create: {
            id: `view_${vwArt.id}`,
            tenantId,
            name: vwArt.name,
            description: vwArt.description || vc.description || '',
            scopeType: vc.scopeType || 'MODULE',
            scopeId: resolvedScope,
            icon: vc.icon || 'Bookmark',
            filterState: vc.filterState || {},
            isShared: vc.isShared !== false,
            isDefault: Boolean(vc.isDefault),
          },
        });
        provisionedResources.push(`Saved View: ${vwArt.name}`);
      } catch (e) {
        console.warn(`[SolutionDeployer] SavedView error for ${vwArt.name}:`, e);
      }
    }

    // 14. Update Blueprint Status to PUBLISHED
    await model.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    res.json({
      success: true,
      blueprintId: id,
      solutionName: blueprint.name,
      message: `Solution Blueprint "${blueprint.name}" successfully provisioned into workspace.`,
      provisionedResources,
      deployedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/deploy Error:', err);
    res.status(500).json({ error: err.message || 'Failed to deploy solution blueprint into workspace.' });
  }
});

export default router;


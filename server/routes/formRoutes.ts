import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import {
  ensureTenantBuilderEntitiesMigrated,
  formatFormRowForModule,
  resolveModuleName,
  syncStandaloneToModuleConfig,
} from '../services/builderSyncService';

const router = Router();

// GET /api/forms - List all forms for tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId } = req.query;

    const modulesMap = await ensureTenantBuilderEntitiesMigrated(db, tenantId);

    const where: any = { tenantId };
    if (moduleId) {
      where.moduleId = String(moduleId);
    }

    const forms = await db.form.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    const enriched = forms.map((f: any) => {
      const formatted = formatFormRowForModule(f);
      return {
        ...formatted,
        ...f,
        usage: formatted.usage,
        isMultistep: formatted.isMultistep,
        fields: formatted.fields,
        steps: formatted.steps,
        customFields: formatted.customFields,
        settings: formatted.settings,
        schema: {
          ...(f.schema && typeof f.schema === 'object' ? f.schema : {}),
          usage: formatted.usage,
          isMultistep: formatted.isMultistep,
          fields: formatted.fields,
          steps: formatted.steps,
          customFields: formatted.customFields,
          settings: formatted.settings,
        },
        moduleName: resolveModuleName(f.moduleId, modulesMap),
      };
    });

    res.json(enriched);
  } catch (err: any) {
    console.error('[FormsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch forms' });
  }
});

// GET /api/forms/:id - Get single form
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const modulesMap = await ensureTenantBuilderEntitiesMigrated(db, tenantId);

    const form = await db.form.findFirst({
      where: { id, tenantId }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const formatted = formatFormRowForModule(form);

    res.json({
      ...formatted,
      ...form,
      usage: formatted.usage,
      isMultistep: formatted.isMultistep,
      fields: formatted.fields,
      steps: formatted.steps,
      customFields: formatted.customFields,
      settings: formatted.settings,
      schema: {
        ...(form.schema && typeof form.schema === 'object' ? form.schema : {}),
        usage: formatted.usage,
        isMultistep: formatted.isMultistep,
        fields: formatted.fields,
        steps: formatted.steps,
        customFields: formatted.customFields,
        settings: formatted.settings,
      },
      moduleName: resolveModuleName(form.moduleId, modulesMap),
    });
  } catch (err: any) {
    console.error('[FormsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch form' });
  }
});

// POST /api/forms - Create form
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description, moduleId, schema, isGlobal, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Form name is required' });
    }

    const resolvedModuleId = moduleId || null;
    const resolvedIsGlobal = isGlobal !== undefined ? Boolean(isGlobal) : !resolvedModuleId;

    const form = await db.form.create({
      data: {
        tenantId,
        name,
        description: description || '',
        moduleId: resolvedModuleId,
        schema: schema || {},
        isGlobal: resolvedIsGlobal,
        status: status || 'PUBLISHED',
        version: 1
      }
    });

    if (resolvedModuleId) {
      await syncStandaloneToModuleConfig(db, tenantId, resolvedModuleId);
    }

    res.status(201).json(form);
  } catch (err: any) {
    console.error('[FormsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create form' });
  }
});

// PUT /api/forms/:id - Update form
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, description, moduleId, schema, isGlobal, status } = req.body;

    const existing = await db.form.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const nextModuleId = moduleId !== undefined ? (moduleId || null) : existing.moduleId;
    const nextIsGlobal = isGlobal !== undefined ? Boolean(isGlobal) : !nextModuleId;

    const updated = await db.form.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        moduleId: nextModuleId,
        schema: schema !== undefined ? schema : existing.schema,
        isGlobal: nextIsGlobal,
        status: status || existing.status,
        version: existing.version + 1
      }
    });

    if (existing.moduleId && existing.moduleId !== nextModuleId) {
      await syncStandaloneToModuleConfig(db, tenantId, existing.moduleId);
    }
    if (nextModuleId) {
      await syncStandaloneToModuleConfig(db, tenantId, nextModuleId);
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[FormsAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update form' });
  }
});

// DELETE /api/forms/:id - Delete form
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await db.form.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await db.form.delete({
      where: { id }
    });

    if (existing.moduleId) {
      await syncStandaloneToModuleConfig(db, tenantId, existing.moduleId);
    }

    res.json({ success: true, message: 'Form deleted' });
  } catch (err: any) {
    console.error('[FormsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete form' });
  }
});

// GET /api/forms/:id/submissions - List submissions, active saved drafts, and analytics for a form
router.get('/:id/submissions', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { moduleId: queryModuleId } = req.query;

    const form = await db.form.findFirst({
      where: { id, tenantId }
    });

    const targetModId = form?.moduleId || (queryModuleId ? String(queryModuleId) : null);

    // Fetch candidate records for tenant
    const allRecords = await db.record.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 300
    });

    const matchedSubmissions = allRecords.filter((r: any) => {
      const d = (r.data && typeof r.data === 'object') ? (r.data as any) : {};
      if (d._formId === id) return true;
      if (targetModId && (r.moduleId === targetModId || d._originalModuleId === targetModId)) {
        // Include module records if no explicit _formId or matching form
        if (!d._formId || d._formId === id) return true;
      }
      return false;
    });

    const schemaObj = (form?.schema && typeof form.schema === 'object') ? (form.schema as any) : {};
    const draftsMap = (schemaObj._drafts && typeof schemaObj._drafts === 'object') ? schemaObj._drafts : {};
    const drafts = Object.values(draftsMap).sort((a: any, b: any) =>
      new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
    );

    const totalSubmissions = matchedSubmissions.length;
    const activeDrafts = drafts.length;
    const totalStarts = totalSubmissions + activeDrafts;
    const completionRate = totalStarts > 0 ? Math.round((totalSubmissions / totalStarts) * 100) : 100;
    const lastSubmittedAt = matchedSubmissions[0]?.createdAt || null;

    res.json({
      submissions: matchedSubmissions.map((r: any) => {
        const d = (r.data && typeof r.data === 'object') ? (r.data as any) : {};
        return {
          id: r.id,
          moduleId: r.moduleId,
          status: r.status || d.status || 'Submitted',
          customerRef: d._customerRef || d._record_key || r.id.slice(0, 8).toUpperCase(),
          submittedBy: d._submittedByName || d.fullName || d.name || d._submittedByEmail || d.email || 'Workspace / Guest User',
          email: d._submittedByEmail || d.email || '',
          source: d._submissionSource || 'Form Submission',
          paymentStatus: d._paymentStatus || null,
          createdAt: r.createdAt,
          data: d
        };
      }),
      drafts,
      stats: {
        totalSubmissions,
        activeDrafts,
        completionRate,
        lastSubmittedAt
      }
    });
  } catch (err: any) {
    console.error('[FormsAPI] GET /:id/submissions Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch form submissions' });
  }
});

// DELETE /api/forms/:id/drafts/:token - Delete a saved draft
router.delete('/:id/drafts/:token', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id, token } = req.params;

    const form = await db.form.findFirst({
      where: { id, tenantId }
    });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const schemaObj = (form.schema && typeof form.schema === 'object') ? (form.schema as any) : {};
    const draftsMap = { ...(schemaObj._drafts || {}) };
    delete draftsMap[token];

    await db.form.update({
      where: { id: form.id },
      data: {
        schema: {
          ...schemaObj,
          _drafts: draftsMap
        }
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[FormsAPI] DELETE /:id/drafts/:token Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete draft' });
  }
});

export default router;


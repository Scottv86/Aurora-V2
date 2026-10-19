import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import {
  ensureTenantBuilderEntitiesMigrated,
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

    const enriched = forms.map((f: any) => ({
      ...f,
      moduleName: resolveModuleName(f.moduleId, modulesMap),
    }));

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

    res.json({
      ...form,
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

export default router;


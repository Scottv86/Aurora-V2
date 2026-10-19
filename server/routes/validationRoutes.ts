import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import {
  ensureTenantBuilderEntitiesMigrated,
  resolveModuleName,
  syncStandaloneToModuleConfig,
} from '../services/builderSyncService';

const router = Router();

// GET /api/validations - List all validation rulesets
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

    const rulesets = await db.validationRuleset.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    const enriched = rulesets.map((r: any) => ({
      ...r,
      moduleName: resolveModuleName(r.moduleId, modulesMap),
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('[ValidationsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch validation rulesets' });
  }
});

// GET /api/validations/:id - Get single ruleset
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const modulesMap = await ensureTenantBuilderEntitiesMigrated(db, tenantId);

    const ruleset = await db.validationRuleset.findFirst({
      where: { id, tenantId }
    });

    if (!ruleset) {
      return res.status(404).json({ error: 'Validation ruleset not found' });
    }

    res.json({
      ...ruleset,
      moduleName: resolveModuleName(ruleset.moduleId, modulesMap),
    });
  } catch (err: any) {
    console.error('[ValidationsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch validation ruleset' });
  }
});

// POST /api/validations - Create validation ruleset
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description, moduleId, scope, rules } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Validation ruleset name is required' });
    }

    const resolvedModuleId = moduleId || null;
    const resolvedScope = scope || (resolvedModuleId ? 'MODULE' : 'GLOBAL');

    const ruleset = await db.validationRuleset.create({
      data: {
        tenantId,
        name,
        description: description || '',
        moduleId: resolvedModuleId,
        scope: resolvedScope,
        rules: rules || []
      }
    });

    if (resolvedModuleId) {
      await syncStandaloneToModuleConfig(db, tenantId, resolvedModuleId);
    }

    res.status(201).json(ruleset);
  } catch (err: any) {
    console.error('[ValidationsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create validation ruleset' });
  }
});

// PUT /api/validations/:id - Update ruleset
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, description, moduleId, scope, rules } = req.body;

    const existing = await db.validationRuleset.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Validation ruleset not found' });
    }

    const nextModuleId = moduleId !== undefined ? (moduleId || null) : existing.moduleId;
    const nextScope = scope || (nextModuleId ? 'MODULE' : 'GLOBAL');

    const updated = await db.validationRuleset.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        moduleId: nextModuleId,
        scope: nextScope,
        rules: rules !== undefined ? rules : existing.rules
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
    console.error('[ValidationsAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update validation ruleset' });
  }
});

// DELETE /api/validations/:id - Delete ruleset
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await db.validationRuleset.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Validation ruleset not found' });
    }

    await db.validationRuleset.delete({
      where: { id }
    });

    if (existing.moduleId) {
      await syncStandaloneToModuleConfig(db, tenantId, existing.moduleId);
    }

    res.json({ success: true, message: 'Validation ruleset deleted' });
  } catch (err: any) {
    console.error('[ValidationsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete validation ruleset' });
  }
});

export default router;


import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = Router();

// GET /api/validations - List all validation rulesets
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId } = req.query;

    const where: any = { tenantId };
    if (moduleId) {
      where.moduleId = String(moduleId);
    }

    const rulesets = await db.validationRuleset.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(rulesets);
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

    const ruleset = await db.validationRuleset.findFirst({
      where: { id, tenantId }
    });

    if (!ruleset) {
      return res.status(404).json({ error: 'Validation ruleset not found' });
    }

    res.json(ruleset);
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

    const ruleset = await db.validationRuleset.create({
      data: {
        tenantId,
        name,
        description: description || '',
        moduleId: moduleId || null,
        scope: scope || 'GLOBAL',
        rules: rules || []
      }
    });

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
    const { name, description, scope, rules } = req.body;

    const existing = await db.validationRuleset.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Validation ruleset not found' });
    }

    const updated = await db.validationRuleset.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        scope: scope || existing.scope,
        rules: rules !== undefined ? rules : existing.rules
      }
    });

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

    res.json({ success: true, message: 'Validation ruleset deleted' });
  } catch (err: any) {
    console.error('[ValidationsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete validation ruleset' });
  }
});

export default router;

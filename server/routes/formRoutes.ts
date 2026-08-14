import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = Router();

// GET /api/forms - List all forms for tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId } = req.query;

    const where: any = { tenantId };
    if (moduleId) {
      where.moduleId = String(moduleId);
    }

    const forms = await db.form.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(forms);
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

    const form = await db.form.findFirst({
      where: { id, tenantId }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
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

    const form = await db.form.create({
      data: {
        tenantId,
        name,
        description: description || '',
        moduleId: moduleId || null,
        schema: schema || {},
        isGlobal: isGlobal !== undefined ? Boolean(isGlobal) : true,
        status: status || 'PUBLISHED',
        version: 1
      }
    });

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
    const { name, description, schema, isGlobal, status } = req.body;

    const existing = await db.form.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const updated = await db.form.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        schema: schema !== undefined ? schema : existing.schema,
        isGlobal: isGlobal !== undefined ? Boolean(isGlobal) : existing.isGlobal,
        status: status || existing.status,
        version: existing.version + 1
      }
    });

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

    res.json({ success: true, message: 'Form deleted' });
  } catch (err: any) {
    console.error('[FormsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete form' });
  }
});

export default router;

import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = Router();

// GET /api/workflows - List all workflows
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId } = req.query;

    const where: any = { tenantId };
    if (moduleId) {
      where.moduleId = String(moduleId);
    }

    const workflows = await db.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(workflows);
  } catch (err: any) {
    console.error('[WorkflowsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch workflows' });
  }
});

// GET /api/workflows/:id - Get single workflow
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const workflow = await db.workflow.findFirst({
      where: { id, tenantId }
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (err: any) {
    console.error('[WorkflowsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch workflow' });
  }
});

// POST /api/workflows - Create workflow
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description, moduleId, triggerType, nodes, edges, isGlobal, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const workflow = await db.workflow.create({
      data: {
        tenantId,
        name,
        description: description || '',
        moduleId: moduleId || null,
        triggerType: triggerType || 'RECORD_EVENT',
        nodes: nodes || [],
        edges: edges || [],
        isGlobal: isGlobal !== undefined ? Boolean(isGlobal) : true,
        status: status || 'PUBLISHED',
        version: 1
      }
    });

    res.status(201).json(workflow);
  } catch (err: any) {
    console.error('[WorkflowsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create workflow' });
  }
});

// PUT /api/workflows/:id - Update workflow
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, description, triggerType, nodes, edges, isGlobal, status } = req.body;

    const existing = await db.workflow.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const updated = await db.workflow.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        triggerType: triggerType || existing.triggerType,
        nodes: nodes !== undefined ? nodes : existing.nodes,
        edges: edges !== undefined ? edges : existing.edges,
        isGlobal: isGlobal !== undefined ? Boolean(isGlobal) : existing.isGlobal,
        status: status || existing.status,
        version: existing.version + 1
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[WorkflowsAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update workflow' });
  }
});

// DELETE /api/workflows/:id - Delete workflow
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await db.workflow.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await db.workflow.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err: any) {
    console.error('[WorkflowsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete workflow' });
  }
});

export default router;

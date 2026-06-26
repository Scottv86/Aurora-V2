import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { AutomationEngine } from '../services/automationEngine';

const router = express.Router();

// GET all automations for the tenant (and optionally module-specific)
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const moduleId = req.query.moduleId as string;

    const whereClause: any = {};
    if (moduleId) {
      whereClause.moduleId = moduleId;
    }

    const automations = await db.automation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(automations);
  } catch (err: any) {
    console.error('[AutomationRoutes] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

// GET specific automation details
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const automation = await db.automation.findUnique({
      where: { id }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json(automation);
  } catch (err: any) {
    console.error('[AutomationRoutes] GET /:id Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE automation
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description, moduleId, inputs, actions, triggers, isActive, conditions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const automation = await db.automation.create({
      data: {
        tenantId,
        name,
        description: description || null,
        moduleId: moduleId || null,
        inputs: inputs || {},
        actions: actions || [],
        triggers: triggers || [],
        isActive: isActive !== undefined ? isActive : true,
        conditions: conditions || null
      }
    });

    res.json(automation);
  } catch (err: any) {
    console.error('[AutomationRoutes] POST / Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE automation
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { name, description, inputs, actions, triggers, isActive, conditions } = req.body;

    const automation = await db.automation.update({
      where: { id },
      data: {
        name,
        description,
        inputs: inputs !== undefined ? inputs : undefined,
        actions: actions !== undefined ? actions : undefined,
        triggers: triggers !== undefined ? triggers : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        conditions: conditions !== undefined ? conditions : undefined
      }
    });

    res.json(automation);
  } catch (err: any) {
    console.error('[AutomationRoutes] PUT /:id Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE automation
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    await db.automation.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[AutomationRoutes] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET run logs for automation
router.get('/:id/runs', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const runs = await db.automationRun.findMany({
      where: { automationId: id },
      orderBy: { startedAt: 'desc' },
      take: 50 // Limit to last 50 runs for performance
    });

    res.json(runs);
  } catch (err: any) {
    console.error('[AutomationRoutes] GET /:id/runs Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TRIGGER automation manually (for QUICK_ACTION / Button click)
router.post('/:id/trigger', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { recordId, inputs } = req.body;

    const automation = await db.automation.findUnique({
      where: { id }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    if (!automation.isActive) {
      return res.status(400).json({ error: 'Automation is inactive' });
    }

    let record = null;
    if (recordId) {
      record = await db.record.findUnique({
        where: { id: recordId }
      });
      if (!record) {
        return res.status(404).json({ error: `Record ${recordId} not found` });
      }
    }

    console.log(`[AutomationRoutes] Triggering automation "${automation.name}" manually via trigger source QUICK_ACTION`);

    // Run pipeline asynchronously to prevent UI block
    AutomationEngine.runPipeline(automation, record, inputs || {}, 'QUICK_ACTION', db)
      .catch((err) => {
        console.error(`[AutomationRoutes] Asynchronous manual trigger failed for ${automation.id}:`, err);
      });

    res.json({ success: true, message: 'Automation triggered successfully' });
  } catch (err: any) {
    console.error('[AutomationRoutes] POST /:id/trigger Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

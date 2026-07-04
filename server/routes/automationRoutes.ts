import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { AutomationEngine } from '../services/automationEngine';
import { WorkflowEngine } from '../services/workflowEngine';

const router = express.Router();

// GET all quarantined records
router.get('/quarantine', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const records = await db.quarantineRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(records);
  } catch (err: any) {
    console.error('[AutomationRoutes] GET /quarantine Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch quarantined records' });
  }
});

// DELETE a quarantined record
router.delete('/quarantine/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    await db.quarantineRecord.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Quarantined record deleted successfully' });
  } catch (err: any) {
    console.error('[AutomationRoutes] DELETE /quarantine/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete quarantined record' });
  }
});

// RELEASE a quarantined record to the standard queue
router.post('/quarantine/:id/release', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const qRecord = await db.quarantineRecord.findUnique({
      where: { id }
    });

    if (!qRecord) {
      return res.status(404).json({ error: 'Quarantined record not found' });
    }

    if (qRecord.sourceChannel === 'Webhook') {
      // Find the automation
      const automation = await db.automation.findFirst({
        where: { tenantId, name: qRecord.sourceName, isActive: true }
      });

      if (!automation) {
        return res.status(404).json({ error: 'Active target automation not found for webhook release' });
      }

      // Trigger the pipeline
      AutomationEngine.runPipeline(automation, null, qRecord.payload, 'INBOUND_WEBHOOK', db).catch(err => {
        console.error('[AutomationRoutes] Failed to run released pipeline:', err);
      });
    } else {
      // Public Form source channel
      // 1. Find the triage module for the tenant
      const triageModule = await db.module.findFirst({
        where: {
          tenantId,
          config: { path: ['isIntakeTriage'], equals: true }
        }
      });

      if (!triageModule) {
        return res.status(400).json({ error: 'Work Distribution module not active for this tenant' });
      }

      // 2. Format customer ref if configured
      let customerRef = undefined;
      const sourceModule = await db.module.findFirst({
        where: { tenantId, name: qRecord.sourceName }
      });

      if (sourceModule) {
        const origConfig = (sourceModule.config || {}) as any;
        if (origConfig.customerRefPrefix) {
          const prefix = origConfig.customerRefPrefix;
          const suffix = origConfig.customerRefSuffix || '';
          const nextNum = origConfig.customerRefNextNumber !== undefined ? Number(origConfig.customerRefNextNumber) : 10001;

          customerRef = `${prefix}-${nextNum}${suffix}`;

          await db.module.update({
            where: { id: sourceModule.id },
            data: {
              config: {
                ...origConfig,
                customerRefNextNumber: nextNum + 1
              }
            }
          });
        }
      }

      const submissionData = {
        ...(qRecord.payload as any || {}),
        _originalModuleId: sourceModule?.id || triageModule.id,
        _submissionSource: 'Public Form',
        _releasedFromQuarantine: true,
        ...(customerRef ? { _customerRef: customerRef } : {})
      };

      // 3. Create normal triage queue record
      await db.record.create({
        data: {
          tenantId,
          moduleId: triageModule.id,
          status: 'New',
          data: submissionData
        }
      });
    }

    // Update status of the quarantine record
    await db.quarantineRecord.update({
      where: { id },
      data: { status: 'RELEASED' }
    });

    res.json({ success: true, message: 'Record successfully released to queue' });
  } catch (err: any) {
    console.error('[AutomationRoutes] POST /quarantine/:id/release Error:', err);
    res.status(500).json({ error: err.message || 'Failed to release quarantined record' });
  }
});

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

router.post('/run-triage', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;

    // 1. Find the triage/intake module for this tenant
    const triageModule = await db.module.findFirst({
      where: {
        tenantId,
        config: { path: ['isIntakeTriage'], equals: true }
      }
    });

    if (!triageModule) {
      return res.status(404).json({ error: 'Central Triage module not enabled for this tenant' });
    }

    // 2. Fetch all active automations (rules) for this triage module
    const automations = await db.automation.findMany({
      where: {
        tenantId,
        moduleId: triageModule.id,
        isActive: true
      }
    });

    if (automations.length === 0) {
      return res.json({ success: true, processedCount: 0, message: 'No active triage rules configured' });
    }

    // 3. Retrieve all pending records in this module
    const pendingRecords = await db.record.findMany({
      where: {
        moduleId: triageModule.id,
        tenantId,
        status: { in: ['New', 'new', 'active', 'Pending', 'pending'] }
      }
    });

    if (pendingRecords.length === 0) {
      return res.json({ success: true, processedCount: 0, message: 'No pending records in the triage queue' });
    }

    console.log(`[AutomationRoutes] Manual run: processing ${pendingRecords.length} records across ${automations.length} rules`);

    let processedCount = 0;
    // 4. Run matching automations for each record sequentially (to prevent DB race conditions on assignee load-balancing)
    for (const record of pendingRecords) {
      const recordData = { id: record.id, ...(record.data as any || {}) };
      
      for (const automation of automations) {
        // Filter by source formId if specified in trigger
        const trigger = automation.triggers?.[0] as any;
        if (trigger && trigger.formId && trigger.formId !== 'public_form') {
          const recordOriginalModuleId = record.data && (record.data as any)._originalModuleId;
          if (recordOriginalModuleId !== trigger.formId) {
            continue;
          }
        }

        // Evaluate conditions on the record
        const isMatched = WorkflowEngine.evaluateCondition(
          recordData,
          automation.conditions,
          null
        );

        if (isMatched) {
          console.log(`[AutomationRoutes] Manual run matched rule "${automation.name}" for record ${record.id}`);
          await AutomationEngine.runPipeline(automation, record, {}, 'MANUAL_RUN', db);
          processedCount++;
          // Break so we don't route the same record multiple times if multiple rules match
          break;
        }
      }
    }

    res.json({
      success: true,
      processedCount,
      message: `Queue processed successfully. Routed ${processedCount} records.`
    });
  } catch (err: any) {
    console.error('[AutomationRoutes] POST /run-triage Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process triage queue' });
  }
});

// GET all quarantined records


export default router;

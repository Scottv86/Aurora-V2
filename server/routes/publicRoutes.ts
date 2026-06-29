import { Router } from 'express';
import { globalPrisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/public/submissions
 * Public endpoint for external form submissions (e.g. from Landing Pages or Portals).
 * This endpoint does not require authentication but might eventually need rate-limiting.
 */
router.post('/submissions', async (req, res) => {
  const { tenantSlug, type, fullName, email, description, ...otherData } = req.body;

  if (!tenantSlug || !email) {
    return res.status(400).json({ error: 'Missing required submission fields (tenantSlug, email)' });
  }

  try {
    // 1. Resolve tenant by slug
    const tenant = await globalPrisma.tenant.findUnique({
      where: { subdomain: tenantSlug } // Using subdomain as slug
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Target tenant not found' });
    }

    // 2. Find a suitable module for this type of intake (preferring Intake Triage)
    let targetModule = await globalPrisma.module.findFirst({
      where: {
        tenantId: tenant.id,
        config: { path: ['isIntakeTriage'], equals: true }
      }
    });

    let isRoutedToTriage = !!targetModule;

    if (!targetModule) {
      targetModule = await globalPrisma.module.findFirst({
        where: { 
          tenantId: tenant.id,
          name: { contains: type, mode: 'insensitive' }
        }
      });
    }

    if (!targetModule) {
      targetModule = await globalPrisma.module.findFirst({
        where: { 
          tenantId: tenant.id,
          config: { path: ['type'], equals: 'WORK_ITEM' }
        }
      });
    }

    if (!targetModule) {
      return res.status(400).json({ error: 'No suitable intake module found for this tenant' });
    }

    // 3. Create the Record
    let customerRef = undefined;
    const targetConfig = (targetModule.config || {}) as any;
    if (targetConfig.customerRefPrefix) {
      const prefix = targetConfig.customerRefPrefix;
      const suffix = targetConfig.customerRefSuffix || '';
      const nextNum = targetConfig.customerRefNextNumber !== undefined ? Number(targetConfig.customerRefNextNumber) : 23734592;

      customerRef = `${prefix}-${nextNum}${suffix}`;

      await globalPrisma.module.update({
        where: { id: targetModule.id },
        data: {
          config: {
            ...targetConfig,
            customerRefNextNumber: nextNum + 1
          }
        }
      });
    }

    const recordData = {
      submitted_by: fullName,
      email: email,
      description: description,
      form_type: type,
      source: 'External Portal',
      ...(customerRef ? { _customerRef: customerRef } : {}),
      ...otherData
    };

    const record = await globalPrisma.record.create({
      data: {
        tenantId: tenant.id,
        moduleId: targetModule.id,
        status: 'New',
        data: recordData
      }
    });

    const { AutomationEngine } = await import('../services/automationEngine');
    AutomationEngine.handleEvent({
      type: 'FORM_SUBMITTED',
      tenantId: tenant.id,
      moduleId: targetModule.id,
      record: { id: record.id, ...recordData },
      metadata: { formId: 'general_portal', isTriage: isRoutedToTriage }
    }, globalPrisma).catch(err => {
      console.error('[PublicAPI] Error triggering FORM_SUBMITTED event:', err);
    });

    res.status(201).json({ 
      success: true, 
      id: record.id,
      customerRef: customerRef || record.id,
      message: 'Submission received successfully'
    });
  } catch (error: any) {
    console.error('[PublicAPI] Submission error:', error);
    res.status(500).json({ error: 'Internal system failure during submission' });
  }
});

router.get('/modules/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleData = await globalPrisma.module.findUnique({
      where: { id: moduleId }
    });
    if (!moduleData) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const config = (moduleData.config || {}) as any;
    const forms = config.forms || [];
    const publicForms = forms.filter((f: any) => f.usage === 'public_link');
    res.json({
      id: moduleData.id,
      name: moduleData.name,
      description: config.description || '',
      layout: config.layout || [],
      tabs: config.tabs || [],
      forms: publicForms
    });
  } catch (error) {
    console.error('[PublicAPI] Get module error:', error);
    res.status(500).json({ error: 'Failed to fetch public module configuration' });
  }
});

router.post('/modules/:moduleId/submissions', async (req, res) => {
  const { moduleId } = req.params;
  const { data } = req.body;
  try {
    const moduleData = await globalPrisma.module.findUnique({
      where: { id: moduleId }
    });
    if (!moduleData) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Find the Intake Triage module for the tenant if it exists
    const triageModule = await globalPrisma.module.findFirst({
      where: {
        tenantId: moduleData.tenantId,
        config: { path: ['isIntakeTriage'], equals: true }
      }
    });

    let targetModuleId = moduleData.id;
    let originalTargetModuleId = moduleData.id;
    let customerRef = undefined;

    if (triageModule) {
      targetModuleId = triageModule.id;
      const origConfig = (moduleData.config || {}) as any;

      if (origConfig.customerRefPrefix) {
        const prefix = origConfig.customerRefPrefix;
        const suffix = origConfig.customerRefSuffix || '';
        const nextNum = origConfig.customerRefNextNumber !== undefined ? Number(origConfig.customerRefNextNumber) : 10001;

        customerRef = `${prefix}-${nextNum}${suffix}`;

        await globalPrisma.module.update({
          where: { id: moduleData.id },
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
      ...(data || {}),
      _originalModuleId: originalTargetModuleId,
      _submissionSource: 'Public Form',
      ...(customerRef ? { _customerRef: customerRef } : {})
    };

    const record = await globalPrisma.record.create({
      data: {
        tenantId: moduleData.tenantId,
        moduleId: targetModuleId,
        status: 'New',
        data: submissionData
      }
    });

    const { AutomationEngine } = await import('../services/automationEngine');
    AutomationEngine.handleEvent({
      type: 'FORM_SUBMITTED',
      tenantId: moduleData.tenantId,
      moduleId: targetModuleId,
      record: { id: record.id, ...submissionData },
      metadata: { formId: 'public_form', targetModuleId: originalTargetModuleId }
    }, globalPrisma).catch(err => {
      console.error('[PublicAPI] Error triggering FORM_SUBMITTED event:', err);
    });

    res.status(201).json({ 
      success: true, 
      id: record.id,
      customerRef: customerRef || record.id,
      message: 'Submission received successfully'
    });
  } catch (error) {
    console.error('[PublicAPI] Public submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

router.post('/webhooks/:automationId', async (req, res) => {
  const { automationId } = req.params;
  const payload = req.body || {};

  try {
    const automation = await globalPrisma.automation.findUnique({
      where: { id: automationId, isActive: true }
    });

    if (!automation) {
      return res.status(404).json({ error: 'Active automation not found' });
    }

    const triggersConfig = Array.isArray(automation.triggers) ? automation.triggers : [];
    const hasWebhookTrigger = triggersConfig.some((t: any) => t.type === 'INBOUND_WEBHOOK');

    if (!hasWebhookTrigger) {
      return res.status(400).json({ error: 'Automation is not configured for webhook triggers' });
    }

    const { AutomationEngine } = await import('../services/automationEngine');
    AutomationEngine.runPipeline(automation, null, payload, 'INBOUND_WEBHOOK', globalPrisma).catch(err => {
      console.error('[WebhookAPI] Pipeline failed:', err);
    });

    res.status(202).json({
      success: true,
      message: 'Webhook trigger accepted'
    });
  } catch (error: any) {
    console.error('[WebhookAPI] Error:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

export default router;

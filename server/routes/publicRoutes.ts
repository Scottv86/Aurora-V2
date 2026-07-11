import { Router } from 'express';
import { globalPrisma } from '../lib/prisma';
import { SecurityScreeningService } from '../services/securityScreening';

const router = Router();

async function ensureTriageModule(tenantId: string) {
  // Returns triage module if exists, but does not auto-provision it.
  return await globalPrisma.module.findFirst({
    where: {
      tenantId,
      config: { path: ['isIntakeTriage'], equals: true }
    }
  });
}

/**
 * POST /api/public/submissions
 * Public endpoint for external form submissions (e.g. from Landing Pages or Portals).
 * This endpoint does not require authentication but might eventually need rate-limiting.
 */
router.post('/submissions', async (req, res) => {
  const { tenantSlug } = req.body;

  if (!tenantSlug) {
    return res.status(400).json({ error: 'Missing required tenantSlug' });
  }

  try {
    // 1. Resolve tenant by slug
    const tenant = await globalPrisma.tenant.findUnique({
      where: { subdomain: tenantSlug } // Using subdomain as slug
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Target tenant not found' });
    }

    // Run security screening
    const screeningResult = SecurityScreeningService.screenPayload(req.body);

    if (!screeningResult.isClean) {
      // Quarantine it!
      await globalPrisma.quarantineRecord.create({
        data: {
          tenantId: tenant.id,
          sourceChannel: 'Public Form',
          sourceName: 'External Portal',
          payload: req.body || {},
          reasons: screeningResult.reasons,
          status: 'QUARANTINED'
        }
      });

      return res.status(201).json({ 
        success: true, 
        id: 'quarantined-' + Math.random().toString(36).substr(2, 9),
        customerRef: 'Q-' + Math.random().toString(36).substr(2, 9),
        message: 'Submission received successfully'
      });
    }

    const { type, fullName, email, description, ...otherData } = screeningResult.sanitizedData;

    if (!email) {
      return res.status(400).json({ error: 'Missing required email field' });
    }

    // 2. Ensure the Intake Triage module exists and use it
    let targetModule = await ensureTriageModule(tenant.id);
    let isRoutedToTriage = true;

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
      ...(screeningResult.reasons.length > 0 ? { _sanitizationFlags: screeningResult.reasons } : {}),
      ...otherData
    };

    // Calculate SLA if configured in module settings
    let slaDeadline = undefined;
    if (targetConfig.slaConfig && targetConfig.slaConfig.breachHours) {
      slaDeadline = new Date(Date.now() + parseFloat(targetConfig.slaConfig.breachHours) * 60 * 60 * 1000);
    }

    const record = await globalPrisma.record.create({
      data: {
        tenantId: tenant.id,
        moduleId: targetModule.id,
        status: 'New',
        data: recordData,
        slaDeadline
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

    // Run security screening
    const screeningResult = SecurityScreeningService.screenPayload(data || {});

    if (!screeningResult.isClean) {
      // Quarantine it!
      await globalPrisma.quarantineRecord.create({
        data: {
          tenantId: moduleData.tenantId,
          sourceChannel: 'Public Form',
          sourceName: moduleData.name,
          payload: data || {},
          reasons: screeningResult.reasons,
          status: 'QUARANTINED'
        }
      });

      return res.status(201).json({ 
        success: true, 
        id: 'quarantined-' + Math.random().toString(36).substr(2, 9),
        customerRef: 'Q-' + Math.random().toString(36).substr(2, 9),
        message: 'Submission received successfully'
      });
    }

    const cleanData = screeningResult.sanitizedData;

    // Ensure the Intake Triage module exists and use it
    const triageModule = await ensureTriageModule(moduleData.tenantId);

    let targetModuleId = moduleData.id;
    let originalTargetModuleId = moduleData.id;
    let customerRef = undefined;

    if (triageModule) {
      targetModuleId = triageModule.id;
      const origConfig = (moduleData.config || {}) as any;
      const forms = origConfig.forms || [];
      const submittedFormId = data?._formId || moduleData.id;
      const form = forms.find((f: any) => f.id === submittedFormId);

      let prefix = undefined;
      let suffix = '';
      let nextNum = 10001;
      let isFormSpecific = false;

      if (form && form.settings && form.settings.customerRefPrefix) {
        prefix = form.settings.customerRefPrefix;
        suffix = form.settings.customerRefSuffix || '';
        nextNum = form.settings.customerRefNextNumber !== undefined ? Number(form.settings.customerRefNextNumber) : 10001;
        isFormSpecific = true;
      } else if (origConfig.customerRefPrefix) {
        prefix = origConfig.customerRefPrefix;
        suffix = origConfig.customerRefSuffix || '';
        nextNum = origConfig.customerRefNextNumber !== undefined ? Number(origConfig.customerRefNextNumber) : 10001;
      }

      if (prefix) {
        customerRef = `${prefix}-${nextNum}${suffix}`;

        if (isFormSpecific) {
          const updatedForms = forms.map((f: any) => {
            if (f.id === submittedFormId) {
              return {
                ...f,
                settings: {
                  ...(f.settings || {}),
                  customerRefNextNumber: nextNum + 1
                }
              };
            }
            return f;
          });

          await globalPrisma.module.update({
            where: { id: moduleData.id },
            data: {
              config: {
                ...origConfig,
                forms: updatedForms
              }
            }
          });
        } else {
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
    }

    const submissionData = {
      ...(cleanData || {}),
      _originalModuleId: originalTargetModuleId,
      _submissionSource: 'Public Form',
      ...(customerRef ? { _customerRef: customerRef } : {}),
      ...(screeningResult.reasons.length > 0 ? { _sanitizationFlags: screeningResult.reasons } : {})
    };

    // Calculate SLA if configured in module settings
    let slaDeadline = undefined;
    const moduleConfig = (moduleData.config || {}) as any;
    if (moduleConfig.slaConfig && moduleConfig.slaConfig.breachHours) {
      slaDeadline = new Date(Date.now() + parseFloat(moduleConfig.slaConfig.breachHours) * 60 * 60 * 1000);
    }

    const record = await globalPrisma.record.create({
      data: {
        tenantId: moduleData.tenantId,
        moduleId: targetModuleId,
        status: 'New',
        data: submissionData,
        slaDeadline
      }
    });

    const { AutomationEngine } = await import('../services/automationEngine');
    const submittedFormId = data?._formId || moduleData.id;
    AutomationEngine.handleEvent({
      type: 'FORM_SUBMITTED',
      tenantId: moduleData.tenantId,
      moduleId: targetModuleId,
      record: { id: record.id, ...submissionData },
      metadata: { formId: submittedFormId, targetModuleId: originalTargetModuleId }
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

    // Run security screening
    const screeningResult = SecurityScreeningService.screenPayload(payload);

    if (!screeningResult.isClean) {
      // Quarantine it!
      await globalPrisma.quarantineRecord.create({
        data: {
          tenantId: automation.tenantId,
          sourceChannel: 'Webhook',
          sourceName: automation.name,
          payload: payload || {},
          reasons: screeningResult.reasons,
          status: 'QUARANTINED'
        }
      });

      return res.status(202).json({
        success: true,
        message: 'Webhook trigger accepted'
      });
    }

    const cleanPayload = screeningResult.sanitizedData || {};
    if (screeningResult.reasons.length > 0) {
      cleanPayload._sanitizationFlags = screeningResult.reasons;
    }

    const { AutomationEngine } = await import('../services/automationEngine');
    AutomationEngine.runPipeline(automation, null, cleanPayload, 'INBOUND_WEBHOOK', globalPrisma).catch(err => {
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

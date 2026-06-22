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

    // 2. Find a suitable module for this type of intake (or use a default)
    // For now, we'll look for a module that matches the 'type' name or just use the first 'WORK_ITEM' module
    let targetModule = await globalPrisma.module.findFirst({
      where: { 
        tenantId: tenant.id,
        name: { contains: type, mode: 'insensitive' }
      }
    });

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
    const record = await globalPrisma.record.create({
      data: {
        tenantId: tenant.id,
        moduleId: targetModule.id,
        status: 'New',
        data: {
          submitted_by: fullName,
          email: email,
          description: description,
          form_type: type,
          source: 'External Portal',
          ...otherData
        }
      }
    });

    res.status(201).json({ 
      success: true, 
      id: record.id,
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
    const publicForms = ((moduleData as any).forms || []).filter((f: any) => f.usage === 'public_link');
    res.json({
      id: moduleData.id,
      name: moduleData.name,
      description: moduleData.description,
      layout: moduleData.layout,
      tabs: moduleData.tabs,
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
    const record = await globalPrisma.record.create({
      data: {
        tenantId: moduleData.tenantId,
        moduleId: moduleData.id,
        status: 'New',
        data: data || {}
      }
    });
    res.status(201).json({ 
      success: true, 
      id: record.id,
      message: 'Submission received successfully'
    });
  } catch (error) {
    console.error('[PublicAPI] Public submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

export default router;

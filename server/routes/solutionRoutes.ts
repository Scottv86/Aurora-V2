import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

const getSolutionModel = (db: any) => db?.solutionBlueprint || db?.SolutionBlueprint || globalPrisma.solutionBlueprint;

// GET /api/solutions - List all solution blueprints for active tenant
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    let solutions = [];
    if (model) {
      solutions = await model.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' }
      });
    }

    // Seed default solution blueprint if database is empty
    if (solutions.length === 0 && model) {
      const defaultSolution = await model.create({
        data: {
          id: 'sol_enterprise_intake',
          tenantId,
          name: 'Enterprise Client Intake & Service Hub',
          description: 'Production solution combining client intake forms, SLA triage workflows, executive KPI dashboards, and automated email templates.',
          category: 'Customer Experience',
          version: '1.0.0',
          status: 'ACTIVE',
          author: 'Aurora Architecture Engine',
          icon: 'Boxes',
          activeArtifactId: 'art_form_1',
          connectedModules: [
            { id: 'mod_clients', name: 'Clients', type: 'RECORD', description: 'Client records collection', fieldsCount: 12, linked: true },
            { id: 'mod_services', name: 'Services', type: 'REGISTRY', description: 'Service catalog picklist', fieldsCount: 8, linked: true },
            { id: 'mod_crm', name: 'CRM Integration', type: 'API_SYNC', description: 'External CRM webhook sync', fieldsCount: 6, linked: true }
          ],
          contextSources: [
            { id: 'src_1', name: 'Project_Vision.docx', type: 'docx', size: '245 KB', uploadedAt: '2 hours ago', status: 'PROCESSED', sourceOrigin: 'DRIVE' },
            { id: 'src_2', name: 'Client_Form_Wireframe.pdf', type: 'pdf', size: '1.2 MB', uploadedAt: 'Yesterday', status: 'PROCESSED', sourceOrigin: 'KNOWLEDGE_BASE' }
          ],
          artifacts: [
            {
              id: 'art_form_1',
              name: 'Client Intake Form',
              type: 'FORM',
              description: 'Dynamic 12-column grid intake form',
              content: {
                title: 'Client Intake & Registration',
                subtitle: 'Full screen enterprise onboarding form',
                fields: [
                  { id: 'f_fname', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true, colSpan: 6 },
                  { id: 'f_lname', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true, colSpan: 6 },
                  { id: 'f_email', label: 'Email Address', type: 'email', placeholder: 'client@company.com', required: true, colSpan: 12 },
                  { id: 'f_tier', label: 'Service Tier', type: 'select', colSpan: 12, options: ['Standard Support', 'Premium Onboarding', 'Enterprise SLA'] }
                ]
              }
            },
            {
              id: 'art_flow_1',
              name: 'Automated Intake Flow',
              type: 'WORKFLOW',
              description: 'Visual process execution graph',
              content: {
                nodes: [
                  { id: 'node_1', label: 'Form Submitted', type: 'TRIGGER', status: 'completed' },
                  { id: 'node_2', label: 'Evaluate SLA Thresholds', type: 'ACTION', status: 'active' },
                  { id: 'node_3', label: 'Generate Welcome Pack', type: 'AUTOMATION', status: 'pending' }
                ]
              }
            },
            {
              id: 'art_nav_1',
              name: 'Portal Navigation Tree',
              type: 'NAVIGATION',
              description: 'Portal navigation menu tree',
              content: {
                items: [
                  { label: 'Client Dashboard', path: '/workspace/dashboard' },
                  { label: 'Submit Ticket Intake', path: '/workspace/intake' },
                  { label: 'SLA Escalation Queue', path: '/workspace/triage' }
                ]
              }
            },
            {
              id: 'art_list_1',
              name: 'Service Tiers Picklist',
              type: 'GLOBAL_LIST',
              description: 'Shared enum picklist values',
              content: {
                options: ['Standard Support', 'Premium Onboarding', 'Enterprise SLA', '24/7 Managed Support']
              }
            }
          ]
        }
      });
      solutions = [defaultSolution];
    }

    res.json({ solutions });
  } catch (err: any) {
    console.error('[SolutionRoutes] GET / Error:', err);
    res.status(500).json({ error: 'Failed to load solution blueprints.' });
  }
});

// GET /api/solutions/:id - Get specific solution blueprint detail
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const sol = await model.findFirst({
      where: { id, tenantId }
    });

    if (!sol) {
      return res.status(404).json({ error: 'Solution blueprint not found' });
    }

    res.json(sol);
  } catch (err: any) {
    console.error('[SolutionRoutes] GET /:id Error:', err);
    res.status(500).json({ error: 'Failed to fetch solution blueprint details' });
  }
});

// POST /api/solutions - Create or update a solution blueprint in database
router.post('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);
    const body = req.body;

    if (!model) {
      return res.status(500).json({ error: 'SolutionBlueprint model not initialized' });
    }

    const solutionId = body.id || `sol_${Date.now()}`;

    const upserted = await model.upsert({
      where: { id: solutionId },
      update: {
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || [],
        metadata: body.metadata || {}
      },
      create: {
        id: solutionId,
        tenantId,
        name: body.name || 'New Enterprise Solution',
        description: body.description || '',
        category: body.category || 'General',
        version: body.version || '1.0.0',
        status: body.status || 'DRAFT',
        author: body.author || 'Platform User',
        activeArtifactId: body.activeArtifactId || undefined,
        contextSources: body.contextSources || [],
        connectedModules: body.connectedModules || [],
        artifacts: body.artifacts || [],
        savedNotes: body.savedNotes || [],
        chatMessages: body.chatMessages || [],
        metadata: body.metadata || {}
      }
    });

    res.status(201).json(upserted);
  } catch (err: any) {
    console.error('[SolutionRoutes] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save solution blueprint' });
  }
});

// DELETE /api/solutions/:id - Delete solution blueprint from database
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    if (model) {
      await model.deleteMany({
        where: { id, tenantId }
      });
    }

    res.json({ success: true, message: `Solution blueprint ${id} removed.` });
  } catch (err: any) {
    console.error('[SolutionRoutes] DELETE /:id Error:', err);
    res.status(500).json({ error: 'Failed to delete solution blueprint' });
  }
});

// POST /api/solutions/:id/deploy - Real Workspace End-to-End Solution Provisioner Runner
router.post('/:id/deploy', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default-tenant';
    const db = req.db || globalPrisma;
    const model = getSolutionModel(db);

    const blueprint = await model?.findFirst({ where: { id, tenantId } });
    if (!blueprint) {
      return res.status(404).json({ error: 'Solution blueprint not found for deployment.' });
    }

    const artifacts = Array.isArray(blueprint.artifacts) ? blueprint.artifacts : [];
    const provisionedResources: string[] = [];

    // 1. Provision Global Picklists (GlobalList Table)
    const picklistArtifacts = artifacts.filter((a: any) => a.type === 'GLOBAL_LIST');
    for (const pArt of picklistArtifacts) {
      try {
        const options = pArt.content?.options || ['Standard Support', 'Enterprise SLA'];
        if (db.globalList) {
          await db.globalList.upsert({
            where: { id: `glist_${pArt.id}` },
            update: { name: pArt.name, values: options },
            create: { id: `glist_${pArt.id}`, tenantId, name: pArt.name, category: 'General', values: options }
          });
          provisionedResources.push(`Global Picklist: ${pArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Picklist error for ${pArt.name}:`, e);
      }
    }

    // 2. Provision Forms (Form Table)
    const formArtifacts = artifacts.filter((a: any) => a.type === 'FORM');
    for (const fArt of formArtifacts) {
      try {
        if (db.form) {
          await db.form.upsert({
            where: { id: `form_${fArt.id}` },
            update: { name: fArt.name, schema: fArt.content },
            create: { id: `form_${fArt.id}`, tenantId, name: fArt.name, status: 'PUBLISHED', schema: fArt.content }
          });
          provisionedResources.push(`Interactive Form: ${fArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Form error for ${fArt.name}:`, e);
      }
    }

    // 3. Provision Workflows (Workflow Table)
    const flowArtifacts = artifacts.filter((a: any) => a.type === 'WORKFLOW');
    for (const wArt of flowArtifacts) {
      try {
        if (db.workflow) {
          await db.workflow.upsert({
            where: { id: `flow_${wArt.id}` },
            update: { name: wArt.name, graph: wArt.content },
            create: { id: `flow_${wArt.id}`, tenantId, name: wArt.name, status: 'ACTIVE', graph: wArt.content }
          });
          provisionedResources.push(`Process Workflow: ${wArt.name}`);
        }
      } catch (e) {
        console.warn(`[SolutionDeployer] Workflow error for ${wArt.name}:`, e);
      }
    }

    // 4. Update Blueprint Status to PUBLISHED
    await model.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    res.json({
      success: true,
      blueprintId: id,
      solutionName: blueprint.name,
      message: `Solution Blueprint "${blueprint.name}" successfully provisioned into workspace.`,
      provisionedResources,
      deployedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SolutionRoutes] POST /:id/deploy Error:', err);
    res.status(500).json({ error: err.message || 'Failed to deploy solution blueprint into workspace.' });
  }
});

export default router;


import express from 'express';
import { emitTenantUpdate } from '../socket';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = express.Router();

// GET all modules for this tenant
router.get('/modules', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const modules = await db.module.findMany();
    // Flatten config for frontend
    const formatted = modules.map(m => {
      const config = (m.config as any);
      return {
        ...config,
        id: m.id,
        templateId: config.id,
        name: m.name,
        createdAt: m.createdAt,
      };
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single module by ID
router.get('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const module = await db.module.findUnique({ where: { id } });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const config = module.config as any;
    const formatted = {
      ...config,
      id: module.id,
      templateId: config.id,
      name: module.name,
      createdAt: module.createdAt,
    };
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET all cases/records
router.get('/records', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { moduleId } = req.query;

    const whereClause: any = {};
    if (moduleId) {
      whereClause.moduleId = moduleId as string;
    }

    const records = await db.record.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    // Format records for frontend consumption (Hydrate top-level with 'data' payload)
    const formatted = records.map((r: any) => ({
      id: r.id,
      moduleId: r.moduleId,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...(r.data as any)
    }));
    
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single record by ID
router.get('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const record = await db.record.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    // Hydrate record with data payload
    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.data as any)
    };
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE record
router.post('/records', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId, ...data } = req.body;

    const record = await db.record.create({
      data: {
        tenantId, // still required by schema, but RLS will verify it matches app.current_tenant_id
        moduleId,
        data: data as any,
        status: data.status || 'New'
      }
    });

    // Websocket emit for realtime sync
    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.data as any)
    };
    emitTenantUpdate(tenantId, 'record_added', formatted);

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE record
router.put('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { moduleId, status, ...data } = req.body;

    // Fetch existing (RLS will ensure we can't see records from other tenants)
    const existing = await db.record.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updatedData = {
      ...(existing.data as any),
      ...data
    };

    const record = await db.record.update({
      where: { id },
      data: {
        data: updatedData,
        status: status || existing.status
      }
    });

    // Websocket emit
    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.data as any)
    };
    emitTenantUpdate(tenantId, 'record_updated', formatted);

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // RLS will ensure we can only delete if it belongs to current tenant
    await db.record.delete({ where: { id } });

    // Websocket emit
    emitTenantUpdate(tenantId, 'record_deleted', id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODULE MANAGEMENT ---

// CREATE module
router.post('/modules', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, ...config } = req.body;
    console.log(`[DataAPI] Creating module: "${name}" for tenant: ${tenantId}`);

    // Find first workspace for this tenant (Prisma client is already scoped to tenant via RLS)
    let workspace = await db.workspace.findFirst();
    
    // Auto-onboarding: Create a workspace if one doesn't exist yet
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'Main Workspace',
          tenantId
        }
      });
    }

    const module = await db.module.create({
      data: {
        tenantId,
        workspaceId: workspace.id,
        name,
        config: config as any
      }
    });

    const configData = module.config as any;
    const formatted = {
      ...configData,
      id: module.id,
      templateId: configData.id,
      name: module.name,
      createdAt: module.createdAt,
    };
    
    emitTenantUpdate(tenantId, 'module_added', formatted);

    res.json(formatted);
  } catch (err: any) {
    console.error('[DataAPI] Module create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE module
router.put('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, ...config } = req.body;

    const module = await db.module.update({
      where: { id },
      data: {
        name,
        config: config as any
      }
    });

    const configData = module.config as any;
    const formatted = {
      ...configData,
      id: module.id,
      templateId: configData.id,
      name: module.name,
      createdAt: module.createdAt,
    };
    
    emitTenantUpdate(tenantId, 'module_updated', formatted);

    res.json(formatted);
  } catch (err: any) {
    console.error('[DataAPI] Module update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE module
router.delete('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await db.module.delete({ where: { id } });
    
    emitTenantUpdate(tenantId, 'module_deleted', id);

    res.json({ success: true });
  } catch (err: any) {
    console.error('[DataAPI] Module delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


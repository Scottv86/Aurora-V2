import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// In-memory queue store fallback
const memoryQueues = new Map<string, any[]>();

const loadTenantQueues = async (tenantId: string): Promise<any[]> => {
  try {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    const settings = (tenant?.workspaceSettings as any) || {};
    if (Array.isArray(settings.queues)) {
      memoryQueues.set(tenantId, settings.queues);
      return settings.queues;
    }
  } catch (err) {
    // Fallback to in-memory if DB is unreachable
  }
  if (!memoryQueues.has(tenantId)) {
    memoryQueues.set(tenantId, []);
  }
  return memoryQueues.get(tenantId)!;
};

const saveTenantQueues = async (tenantId: string, queues: any[]): Promise<void> => {
  memoryQueues.set(tenantId, queues);
  try {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    if (tenant) {
      const settings = (tenant.workspaceSettings as any) || {};
      await globalPrisma.tenant.update({
        where: { id: tenantId },
        data: {
          workspaceSettings: {
            ...settings,
            queues
          }
        }
      });
    }
  } catch (err) {
    console.warn('[QueuesAPI] Fallback to memory persistence:', err);
  }
};

const getAllowedQueueIdsForUser = (user: any): string[] | null => {
  if (!user || user.isSuperAdmin) return null;
  const rawRole = String(user.role || user.roleId || '').toLowerCase();
  if (rawRole.includes('admin') || rawRole.includes('owner') || rawRole === 'tenant_admin') {
    return null;
  }
  const allowed = user.effectivePolicies?.workflowPolicies?.allowedQueueIds;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed;
  }
  return null;
};

// GET /api/queues - List all queues for tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const queues = await loadTenantQueues(tenantId);
    const allowedIds = getAllowedQueueIdsForUser((req as any).user);
    const filtered = allowedIds
      ? queues.filter((q) => allowedIds.includes(q.id) || (q.slug && allowedIds.includes(q.slug)))
      : queues;
    res.json(filtered);
  } catch (err: any) {
    console.error('[QueuesAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch queues' });
  }
});

// GET /api/queues/:id - Get single queue
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;
    const queues = await loadTenantQueues(tenantId);
    const found = queues.find(q => q.id === id || q.slug === id);

    if (!found) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const allowedIds = getAllowedQueueIdsForUser((req as any).user);
    if (allowedIds && !allowedIds.includes(found.id) && !(found.slug && allowedIds.includes(found.slug))) {
      return res.status(403).json({ error: 'Forbidden: Your role does not have access to this queue' });
    }

    res.json(found);
  } catch (err: any) {
    console.error('[QueuesAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch queue' });
  }
});

// POST /api/queues - Create or Upsert queue
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id, name, description, iconName, isUnifiedQueue, moduleId, moduleName, moduleIds, queueConfig, isGlobal, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Queue name is required' });
    }

    const queues = [...(await loadTenantQueues(tenantId))];
    const existingIndex = id ? queues.findIndex(q => q.id === id) : -1;

    const queueRecord = {
      id: id || `queue_${Date.now()}`,
      tenantId,
      name,
      slug: req.body.slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      iconName: iconName || 'ListOrdered',
      isGlobal: isGlobal !== undefined ? Boolean(isGlobal) : true,
      isUnifiedQueue: Boolean(isUnifiedQueue),
      moduleId: moduleId || null,
      moduleName: moduleName || null,
      moduleIds: Array.isArray(moduleIds) ? moduleIds : (moduleId ? [moduleId] : []),
      queueConfig: queueConfig || {
        conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
        columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
      },
      version: existingIndex >= 0 ? (queues[existingIndex].version || 1) + 1 : 1,
      status: status || 'PUBLISHED',
      createdAt: existingIndex >= 0 ? queues[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      queues[existingIndex] = queueRecord;
    } else {
      queues.unshift(queueRecord);
    }
    await saveTenantQueues(tenantId, queues);

    res.status(201).json(queueRecord);
  } catch (err: any) {
    console.error('[QueuesAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create queue' });
  }
});

// PUT /api/queues/:id - Update queue
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;
    const queues = [...(await loadTenantQueues(tenantId))];
    const index = queues.findIndex(q => q.id === id);

    if (index === -1) {
      const newQueue = {
        id,
        tenantId,
        ...req.body,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      queues.unshift(newQueue);
      await saveTenantQueues(tenantId, queues);
      return res.json(newQueue);
    }

    const existing = queues[index];
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      tenantId: existing.tenantId,
      version: (existing.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    queues[index] = updated;
    await saveTenantQueues(tenantId, queues);

    res.json(updated);
  } catch (err: any) {
    console.error('[QueuesAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update queue' });
  }
});

// DELETE /api/queues/:id - Delete queue
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;
    const queues = await loadTenantQueues(tenantId);
    const filtered = queues.filter(q => q.id !== id);

    await saveTenantQueues(tenantId, filtered);
    res.json({ success: true, message: 'Queue deleted' });
  } catch (err: any) {
    console.error('[QueuesAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete queue' });
  }
});

export default router;

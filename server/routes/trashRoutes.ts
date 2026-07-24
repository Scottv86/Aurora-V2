import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { emitTenantUpdate } from '../socket';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

const getTrashModel = (db: any) => {
  return db?.recyclingBinItem || (globalPrisma as any)?.recyclingBinItem || db?._client?.recyclingBinItem;
};

// GET all items in recycling bin for tenant
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const model = getTrashModel(db);

    if (!model) {
      return res.json([]);
    }

    // Auto-clean expired items (older than 30 days)
    const now = new Date();
    await model.deleteMany({
      where: {
        tenantId,
        expiresAt: { lt: now }
      }
    }).catch(() => {});

    const items = await model.findMany({
      where: { tenantId },
      orderBy: { deletedAt: 'desc' }
    });

    res.json(items);
  } catch (err: any) {
    console.error('[TrashRoutes] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch recycling bin items' });
  }
});

// POST soft-delete item into recycling bin
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const model = getTrashModel(db);
    const { itemType, itemId, title, subtitle, payload, deletedBy } = req.body;

    if (!itemType || !title) {
      return res.status(400).json({ error: 'itemType and title are required' });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days retention

    const item = await model.create({
      data: {
        tenantId,
        itemType,
        itemId: itemId || `item_${Date.now()}`,
        title,
        subtitle: subtitle || null,
        payload: payload || {},
        deletedBy: deletedBy || (req as any).user?.email || 'User',
        deletedAt: new Date(),
        expiresAt
      }
    });

    emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'add', item });
    res.json(item);
  } catch (err: any) {
    console.error('[TrashRoutes] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to add item to recycling bin' });
  }
});

// POST restore item from recycling bin
router.post('/:id/restore', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const model = getTrashModel(db);
    const { id } = req.params;

    const item = await model.findFirst({
      where: { id, tenantId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Recycling bin item not found' });
    }

    const payload = item.payload || {};

    // Restore to target table based on itemType
    try {
      if (item.itemType === 'RECORD' && payload.moduleId) {
        await db.record.create({
          data: {
            id: item.itemId,
            tenantId,
            moduleId: payload.moduleId,
            data: payload.data || payload,
            status: payload.status || 'active',
            associations: payload.associations || [],
            path: payload.path || null,
            workflowState: payload.workflowState || null
          }
        });
        emitTenantUpdate(tenantId, 'record_added', { id: item.itemId, ...payload });
      } else if (item.itemType === 'MODULE') {
        await db.module.create({
          data: {
            id: item.itemId,
            tenantId,
            name: payload.name || item.title,
            category: payload.category || 'Custom Modules',
            iconName: payload.iconName || 'Folder',
            type: payload.type || 'CUSTOM',
            enabled: payload.enabled ?? true,
            status: payload.status || 'ACTIVE',
            config: payload.config || {}
          }
        });
        emitTenantUpdate(tenantId, 'module_added', { id: item.itemId, ...payload });
      } else if (item.itemType === 'AUTOMATION') {
        await db.automation.create({
          data: {
            id: item.itemId,
            tenantId,
            name: payload.name || item.title,
            triggers: payload.triggers || [],
            actions: payload.actions || [],
            conditions: payload.conditions || null,
            isActive: payload.isActive ?? true,
            moduleId: payload.moduleId || null
          }
        });
      } else if (item.itemType === 'CONNECTOR') {
        await db.tenantConnector.create({
          data: {
            id: item.itemId,
            tenantId,
            connectorId: payload.connectorId || 'custom_connector',
            displayName: payload.displayName || item.title,
            authType: payload.authType || 'NONE',
            credentials: payload.credentials || {},
            config: payload.config || {},
            isActive: payload.isActive ?? true
          }
        });
      } else if (item.itemType === 'CHAT_SESSION') {
        const restoredSession = await db.antigravitySession.create({
          data: {
            id: item.itemId,
            tenantId,
            title: payload.title || item.title,
            metadata: payload.metadata || {}
          }
        });
        if (Array.isArray(payload.messages) && payload.messages.length > 0) {
          for (const msg of payload.messages) {
            await db.antigravityMessage.create({
              data: {
                id: msg.id,
                sessionId: restoredSession.id,
                role: msg.role,
                content: msg.content,
                steps: msg.steps || undefined,
                promptTokens: msg.promptTokens,
                completionTokens: msg.completionTokens,
                model: msg.model,
                provider: msg.provider,
                isBYOK: msg.isBYOK,
                keyHint: msg.keyHint,
                createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date()
              }
            }).catch(() => {});
          }
        }
      } else if (item.itemType === 'CHAT_MESSAGE') {
        let targetSessionId = payload.sessionId;
        let sess = await db.antigravitySession.findUnique({ where: { id: targetSessionId } });
        if (!sess) {
          sess = await db.antigravitySession.create({
            data: {
              id: targetSessionId || `session_${Date.now()}`,
              tenantId,
              title: 'Restored Conversation'
            }
          });
          targetSessionId = sess.id;
        }
        await db.antigravityMessage.create({
          data: {
            id: item.itemId,
            sessionId: targetSessionId,
            role: payload.role || 'user',
            content: payload.content || '',
            steps: payload.steps || undefined,
            promptTokens: payload.promptTokens,
            completionTokens: payload.completionTokens,
            model: payload.model,
            provider: payload.provider,
            isBYOK: payload.isBYOK,
            keyHint: payload.keyHint,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date()
          }
        });
      }
    } catch (restoreErr: any) {
      console.warn('[TrashRoutes] Direct table restore notice:', restoreErr.message);
    }

    // Remove from recycling bin
    await model.delete({
      where: { id }
    });

    emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'restore', id, itemType: item.itemType });
    res.json({ success: true, message: `Restored ${item.title} successfully` });
  } catch (err: any) {
    console.error('[TrashRoutes] POST /:id/restore Error:', err);
    res.status(500).json({ error: err.message || 'Failed to restore item' });
  }
});

// DELETE permanently single item
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const model = getTrashModel(db);
    const { id } = req.params;

    await model.deleteMany({
      where: { id, tenantId }
    });

    emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'delete', id });
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (err: any) {
    console.error('[TrashRoutes] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to permanently delete item' });
  }
});

// DELETE empty entire recycling bin
router.delete('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const model = getTrashModel(db);

    await model.deleteMany({
      where: { tenantId }
    });

    emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'empty' });
    res.json({ success: true, message: 'Recycling bin emptied successfully' });
  } catch (err: any) {
    console.error('[TrashRoutes] DELETE / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to empty recycling bin' });
  }
});

export default router;

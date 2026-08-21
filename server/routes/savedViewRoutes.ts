import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// GET /api/saved-views - List all views for a scope & tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const userId = (req as any).user?.id || (req as any).user?.cuid || req.query.userId as string;
    const { scopeType, scopeId } = req.query;

    const whereClause: any = {
      tenantId
    };

    if (scopeType) {
      whereClause.scopeType = String(scopeType).toUpperCase();
    }

    if (scopeId) {
      whereClause.scopeId = String(scopeId);
    }

    // Access control: Return all shared views OR views created by the current user
    if (userId) {
      whereClause.OR = [
        { isShared: true },
        { userId: String(userId) },
        { userId: null }
      ];
    }

    const views = await globalPrisma.savedView.findMany({
      where: whereClause,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(views);
  } catch (err: any) {
    console.error('[SavedViewsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch saved views' });
  }
});

// GET /api/saved-views/:id - Get single view
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const found = await globalPrisma.savedView.findFirst({
      where: { id, tenantId }
    });

    if (!found) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    res.json(found);
  } catch (err: any) {
    console.error('[SavedViewsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch saved view' });
  }
});

// POST /api/saved-views - Create or Upsert view
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const userId = (req as any).user?.id || (req as any).user?.cuid || req.body.userId;
    const {
      id,
      name,
      description,
      icon,
      color,
      scopeType = 'MODULE',
      scopeId,
      filterState,
      isShared = false,
      isDefault = false
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'View name is required' });
    }

    if (!scopeId) {
      return res.status(400).json({ error: 'Scope ID (moduleId or queueId) is required' });
    }

    if (!filterState || typeof filterState !== 'object') {
      return res.status(400).json({ error: 'Valid filterState is required' });
    }

    const normalizedScopeType = String(scopeType).toUpperCase();

    // If marked as default, unset other default views in the same scope
    if (isDefault) {
      await globalPrisma.savedView.updateMany({
        where: {
          tenantId,
          scopeType: normalizedScopeType,
          scopeId: String(scopeId),
          ...(isShared ? { isShared: true } : { userId: userId ? String(userId) : undefined })
        },
        data: {
          isDefault: false
        }
      });
    }

    let existing = null;
    if (id) {
      existing = await globalPrisma.savedView.findFirst({
        where: { id, tenantId }
      });
    }

    if (existing) {
      const updated = await globalPrisma.savedView.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          description: description !== undefined ? description : existing.description,
          icon: icon || existing.icon,
          color: color !== undefined ? color : existing.color,
          filterState,
          isShared: typeof isShared === 'boolean' ? isShared : existing.isShared,
          isDefault: typeof isDefault === 'boolean' ? isDefault : existing.isDefault
        }
      });
      return res.json(updated);
    }

    const created = await globalPrisma.savedView.create({
      data: {
        tenantId,
        userId: userId ? String(userId) : null,
        scopeType: normalizedScopeType,
        scopeId: String(scopeId),
        name: name.trim(),
        description: description || null,
        icon: icon || 'Bookmark',
        color: color || null,
        filterState,
        isShared: Boolean(isShared),
        isDefault: Boolean(isDefault)
      }
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[SavedViewsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save view' });
  }
});

// POST /api/saved-views/clear-default - Clear all default views for a scope
router.post('/clear-default', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { scopeType, scopeId } = req.body;

    if (!scopeId) {
      return res.status(400).json({ error: 'scopeId is required' });
    }

    await globalPrisma.savedView.updateMany({
      where: {
        tenantId,
        scopeType: String(scopeType || 'MODULE').toUpperCase(),
        scopeId: String(scopeId)
      },
      data: { isDefault: false }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[SavedViewsAPI] POST /clear-default Error:', err);
    res.status(500).json({ error: err.message || 'Failed to clear default views' });
  }
});

// PATCH /api/saved-views/:id/default - Toggle / set default view
router.patch('/:id/default', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;
    const { isDefault = true } = req.body;

    const existing = await globalPrisma.savedView.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    if (isDefault) {
      // Clear other defaults in same scope
      await globalPrisma.savedView.updateMany({
        where: {
          tenantId,
          scopeType: existing.scopeType,
          scopeId: existing.scopeId
        },
        data: { isDefault: false }
      });
    }

    const updated = await globalPrisma.savedView.update({
      where: { id: existing.id },
      data: { isDefault: Boolean(isDefault) }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SavedViewsAPI] PATCH /:id/default Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update default view' });
  }
});

// DELETE /api/saved-views/:id - Delete saved view
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const existing = await globalPrisma.savedView.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved view not found' });
    }

    await globalPrisma.savedView.delete({
      where: { id: existing.id }
    });

    res.json({ success: true, id: existing.id });
  } catch (err: any) {
    console.error('[SavedViewsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete saved view' });
  }
});

export default router;

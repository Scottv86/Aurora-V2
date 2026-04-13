import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { recordAudit } from '../lib/audit';

const router = express.Router();

/**
 * GET /api/permissions/groups
 * Lists all permission groups for the current tenant.
 */
router.get('/groups', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const groups = await db.permissionGroup.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/groups
 * Creates a new permission group.
 */
router.post('/groups', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { name, description, capabilities } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const newGroup = await db.permissionGroup.create({
      data: {
        name,
        description,
        capabilities: capabilities || [],
        tenantId: req.tenantId!
      }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_CREATE',
      resourceId: newGroup.id,
      newValue: newGroup
    });

    res.json(newGroup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/permissions/groups/:id
 * Updates an existing permission group.
 */
router.patch('/groups/:id', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { name, description, capabilities } = req.body;

    const oldValue = await db.permissionGroup.findUnique({ where: { id } });

    const updated = await db.permissionGroup.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        capabilities: capabilities !== undefined ? capabilities : undefined
      }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_UPDATE',
      resourceId: id,
      oldValue,
      newValue: updated
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/permissions/groups/:id
 * Deletes a permission group.
 */
router.delete('/groups/:id', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    // Check for active memberships
    const count = await db.memberPermissionGroup.count({
      where: { permissionGroupId: id }
    });

    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete group with active members. Remove all members first.' });
    }

    const oldValue = await db.permissionGroup.findUnique({ where: { id } });

    await db.permissionGroup.delete({
      where: { id }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_DELETE',
      resourceId: id,
      oldValue
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

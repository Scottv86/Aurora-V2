import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { emitTenantUpdate } from '../socket';

const router = express.Router();

// GET all positions (Job Titles/Slots)
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const positions = await db.position.findMany({
      include: {
        members: {
          include: {
            user: true,
            agent: true
          }
        },
        parent: {
          select: { id: true, title: true, positionNumber: true }
        }
      },
      orderBy: { positionNumber: 'asc' }
    });

    const formatted = positions.map(p => ({
      id: p.id,
      positionNumber: p.positionNumber,
      title: p.title,
      description: p.description,
      parentId: p.parentId,
      parentTitle: p.parent?.title,
      occupants: p.members.map(m => ({
        id: m.id,
        name: m.isSynthetic ? m.agent?.name : (m.user?.email.split('@')[0] || 'Unknown'),
        isSynthetic: m.isSynthetic
      })),
      occupantCount: p.members.length,
      createdAt: p.createdAt
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single position
router.get('/:id', async (req: TenantRequest, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  console.log(`[PositionRoutes] GET /:id | ID: ${id} | Tenant: ${tenantId}`);
  
  try {
    const db = req.db!;
    const position = await db.position.findFirst({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
            agent: true
          }
        },
        parent: {
          select: { id: true, title: true, positionNumber: true }
        }
      }
    });

    if (!position) {
      console.warn(`[PositionRoutes] 404 - Position ${id} not found in Tenant ${tenantId}`);
      return res.status(404).json({ 
        error: 'Position not found',
        details: `ID ${id} does not exist in tenant ${tenantId}`
      });
    }

    const formatted = {
      id: position.id,
      positionNumber: position.positionNumber,
      title: position.title,
      description: position.description,
      parentId: position.parentId,
      parentTitle: position.parent?.title,
      occupants: position.members.map(m => ({
        id: m.id,
        name: m.isSynthetic ? m.agent?.name : (m.user?.email.split('@')[0] || 'Unknown'),
        isSynthetic: m.isSynthetic
      })),
      occupantCount: position.members.length,
      createdAt: position.createdAt
    };

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create position
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { positionNumber, title, description, parentId } = req.body;

    if (!positionNumber || !title) {
      return res.status(400).json({ error: 'Position number and title are required' });
    }

    const position = await db.position.create({
      data: {
        tenantId,
        positionNumber,
        title,
        description: description || null,
        parentId: parentId || null
      },
      include: {
        parent: {
          select: { id: true, title: true }
        }
      }
    });

    const formatted = {
      id: position.id,
      positionNumber: position.positionNumber,
      title: position.title,
      description: position.description,
      parentId: position.parentId,
      parentTitle: position.parent?.title,
      occupantCount: 0,
      createdAt: position.createdAt
    };

    emitTenantUpdate(tenantId, 'position_added', formatted);
    res.json(formatted);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Position number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH update position
router.patch('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { positionNumber, title, description, parentId } = req.body;

    const updated = await db.position.update({
      where: { id },
      data: {
        positionNumber,
        title,
        description,
        parentId: parentId || null
      },
      include: {
        parent: {
          select: { id: true, title: true }
        }
      }
    });

    const formatted = {
      id: updated.id,
      positionNumber: updated.positionNumber,
      title: updated.title,
      description: updated.description,
      parentId: updated.parentId,
      parentTitle: updated.parent?.title
    };

    emitTenantUpdate(tenantId, 'position_updated', formatted);
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE position
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await db.position.delete({
      where: { id }
    });

    emitTenantUpdate(tenantId, 'position_deleted', { id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

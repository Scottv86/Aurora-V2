import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { emitTenantUpdate } from '../socket';

const router = express.Router();

// GET all teams
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const teams = await db.team.findMany({
      include: {
        members: {
          select: { isSynthetic: true }
        }
      }
    });

    const formatted = teams.map(t => {
      const humanCount = t.members.filter(m => !m.isSynthetic).length;
      const agentCount = t.members.filter(m => m.isSynthetic).length;
      
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        memberCount: humanCount,
        agentCount: agentCount
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create team
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description } = req.body;

    const team = await db.team.create({
      data: {
        tenantId,
        name,
        description
      }
    });

    const formatted = {
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: 0,
      agentCount: 0
    };

    emitTenantUpdate(tenantId, 'team_added', formatted);
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single team
router.get('/:id', async (req: TenantRequest, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;
  console.log(`[TeamRoutes] GET /:id | ID: ${id} | Tenant: ${tenantId}`);
  
  try {
    const db = req.db!;
    const team = await db.team.findFirst({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
            agent: true
          }
        }
      }
    });

    if (!team) {
      console.warn(`[TeamRoutes] 404 - Team ${id} not found in Tenant ${tenantId}`);
      return res.status(404).json({ 
        error: 'Team not found',
        details: `ID ${id} does not exist in tenant ${tenantId}`
      });
    }

    const formatted = {
      id: team.id,
      name: team.name,
      description: team.description,
      members: team.members.map(m => ({
        id: m.id,
        name: m.isSynthetic ? m.agent?.name : (m.user?.email.split('@')[0] || 'Unknown'),
        role: m.roleId,
        isSynthetic: m.isSynthetic
      })),
      memberCount: team.members.filter(m => !m.isSynthetic).length,
      agentCount: team.members.filter(m => m.isSynthetic).length
    };

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update team
router.patch('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, description } = req.body;

    const updated = await db.team.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    emitTenantUpdate(tenantId, 'team_updated', updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE team
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await db.team.delete({
      where: { id }
    });

    emitTenantUpdate(tenantId, 'team_deleted', { id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

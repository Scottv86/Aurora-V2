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

export default router;

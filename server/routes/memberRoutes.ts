import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { emitTenantUpdate } from '../socket';

const router = express.Router();

// GET all members (Human & Agent)
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const members = await db.tenantMember.findMany({
      include: {
        user: true,
        agent: true,
        team: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = members.map(m => ({
      id: m.id,
      name: m.isSynthetic ? m.agent?.name : (m.user?.email.split('@')[0] || 'Unknown'),
      email: m.isSynthetic ? `agent.${m.agent?.modelType.toLowerCase().replace(' ', '.')}@internal` : (m.user?.email || ''),
      role: m.roleId,
      team: m.team?.name || 'Unassigned',
      status: m.status,
      isSynthetic: m.isSynthetic,
      modelType: m.agent?.modelType,
      lastActive: m.isSynthetic ? 'Now' : 'Recent'
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Invite Human
router.post('/invite', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { email, role, teamId } = req.body;

    // Build/Find user shell
    let user = await db.user.findFirst({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: `u_${Math.random().toString(36).substr(2, 9)}`,
          email
        }
      });
    }

    const member = await db.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: role,
        teamId: teamId || null,
        isSynthetic: false,
        status: 'Pending'
      },
      include: { user: true, team: true }
    });

    const formatted = {
      id: member.id,
      name: email.split('@')[0],
      email: email,
      role: member.roleId,
      team: member.team?.name || 'Unassigned',
      status: member.status,
      isSynthetic: false,
      lastActive: 'Never'
    };

    emitTenantUpdate(tenantId, 'member_added', formatted);
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Provision Agent
router.post('/provision', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { modelType, teamId, role } = req.body;

    // Create Agent record
    const agent = await db.agent.create({
      data: {
        tenantId,
        name: `${modelType.split(' ')[0]} ${Math.floor(Math.random() * 100)}`,
        modelType
      }
    });

    // Create TenantMember bridge
    const member = await db.tenantMember.create({
      data: {
        tenantId,
        agentId: agent.id,
        roleId: role,
        teamId: teamId || null,
        isSynthetic: true,
        status: 'Active'
      },
      include: { agent: true, team: true }
    });

    const formatted = {
      id: member.id,
      name: agent.name,
      email: `agent.${modelType.toLowerCase().replace(' ', '.')}@internal`,
      role: member.roleId,
      team: member.team?.name || 'Unassigned',
      status: member.status,
      isSynthetic: true,
      modelType: agent.modelType,
      lastActive: 'Now'
    };

    emitTenantUpdate(tenantId, 'member_added', formatted);
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single member
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const member = await db.tenantMember.findFirst({
      where: { id },
      include: {
        user: true,
        agent: true,
        team: true
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found or access denied' });
    }

    // Format for frontend
    const formatted = {
      id: member.id,
      userId: member.userId,
      agentId: member.agentId,
      name: member.isSynthetic ? member.agent?.name : (member.user?.email.split('@')[0] || 'Unknown'),
      email: member.isSynthetic ? `agent.${member.agent?.modelType.toLowerCase().replace(' ', '.')}@internal` : (member.user?.email || ''),
      role: member.roleId,
      teamId: member.teamId,
      team: member.team?.name || 'Unassigned',
      status: member.status,
      isSynthetic: member.isSynthetic,
      agentConfig: member.agent?.config,
      modelType: member.agent?.modelType,
      createdAt: member.createdAt,
      lastActive: member.isSynthetic ? 'Now' : 'Recent'
    };

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update member
router.post('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { role, teamId, status, agentConfig, modelType, name } = req.body;

    const member = await db.tenantMember.findFirst({
      where: { id },
      include: { agent: true }
    });

    if (!member) return res.status(404).json({ error: 'Member not found or access denied' });

    // 1. Update TenantMember basic fields
    const updatedMember = await db.tenantMember.update({
      where: { id },
      data: {
        roleId: role || member.roleId,
        teamId: teamId !== undefined ? (teamId || null) : member.teamId,
        status: status || member.status
      },
      include: { user: true, agent: true, team: true }
    });

    // 2. If it's an agent, update Agent specific fields
    if (member.isSynthetic && member.agentId) {
      await db.agent.update({
        where: { id: member.agentId },
        data: {
          config: agentConfig !== undefined ? agentConfig : member.agent?.config,
          modelType: modelType || member.agent?.modelType,
          name: name || member.agent?.name
        }
      });
    }

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE member (Decommission Agent or Revoke Human Access)
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const member = await db.tenantMember.findFirst({ where: { id } });
    if (!member) return res.status(404).json({ error: 'Member not found or access denied' });

    // If it's an agent, we delete the agent record too
    if (member.isSynthetic && member.agentId) {
      // First delete membership (bridge)
      await db.tenantMember.delete({ where: { id } });
      // Then delete agent record
      await db.agent.delete({ where: { id: member.agentId } });
    } else {
      // Just delete the membership for humans
      await db.tenantMember.delete({ where: { id } });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

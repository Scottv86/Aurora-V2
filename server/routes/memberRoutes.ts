import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { resolveCapabilities } from '../lib/permissions';

const router = express.Router();

// GET all members
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;

    const members = await db.tenantMember.findMany({
      include: {
        user: true,
        agent: true,
        team: true,
        position: true
      }
    });

    // Format for frontend
    let formatted = members.map(m => ({
      id: m.id,
      userId: m.userId || m.user?.id || m.id,
      name: m.isSynthetic ? m.agent?.name : (m.firstName && m.familyName ? `${m.firstName} ${m.familyName}` : (m.user?.email ? m.user.email.split('@')[0] : 'Member')),
      email: m.isSynthetic ? 'Agent' : (m.user?.email || m.personalEmail || ''),
      role: m.roleId,
      team: m.team?.name || 'Unassigned',
      teamId: m.teamId,
      status: m.status,
      isSynthetic: m.isSynthetic,
      position: m.position?.title || 'Undesignated',
      avatarUrl: m.avatarUrl || (m.isSynthetic ? undefined : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.email || m.firstName || 'U')}&background=random`),
      lastActive: m.isSynthetic ? 'Now' : 'Recent',
      isContractor: m.isContractor,
      licenceType: m.licenceType,
      aiOverrides: m.aiOverrides || {}
    }));

    // If no tenant members exist in tenantMember table, return registered users from User model
    if (formatted.length === 0) {
      const users = await (globalPrisma as any).user.findMany().catch(() => []);
      formatted = users.map((u: any) => ({
        id: u.id,
        userId: u.id,
        name: u.email ? u.email.split('@')[0] : 'User',
        email: u.email || '',
        role: u.isSuperAdmin ? 'Admin' : 'Standard',
        team: 'Unassigned',
        teamId: null,
        status: 'Active',
        isSynthetic: false,
        position: 'Member',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email || 'U')}&background=random`,
        lastActive: 'Recent',
        isContractor: false,
        licenceType: 'Standard'
      }));
    }

    res.json(formatted);
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET lightweight profile card for hover popup (lookup by TenantMember.id OR userId)
router.get('/:id/profile-card', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const member = await db.tenantMember.findFirst({
      where: {
        OR: [{ id }, { userId: id }]
      },
      include: {
        user: {
          select: { id: true, email: true, isSuperAdmin: true }
        },
        agent: {
          select: { id: true, name: true, modelType: true }
        },
        team: {
          select: { id: true, name: true, avatarUrl: true }
        },
        position: {
          select: {
            id: true,
            title: true,
            positionNumber: true,
            parent: {
              select: {
                id: true,
                title: true,
                positionNumber: true,
                members: {
                  take: 1,
                  include: {
                    user: { select: { id: true, email: true } },
                    agent: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        },
        phoneNumbers: {
          select: { id: true, label: true, number: true }
        },
        permissionGroups: {
          include: {
            permissionGroup: {
              select: { id: true, name: true, description: true }
            }
          }
        }
      }
    });

    if (!member) {
      // Fallback to bare User record if no TenantMember row exists
      const user = await (globalPrisma as any).user.findUnique({
        where: { id },
        select: { id: true, email: true, isSuperAdmin: true }
      }).catch(() => null);

      if (!user) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const fallbackName = user.email ? user.email.split('@')[0] : 'User';
      return res.json({
        id: user.id,
        userId: user.id,
        name: fallbackName,
        email: user.email || '',
        workEmail: user.email || '',
        role: user.isSuperAdmin ? 'Admin' : 'Standard',
        status: 'Active',
        isSynthetic: false,
        jobTitle: user.isSuperAdmin ? 'Administrator' : 'Member',
        positionNumber: null,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=random`,
        workArrangements: null,
        phoneNumbers: [],
        team: null,
        reportsTo: null,
        memberships: []
      });
    }

    const displayName = member.isSynthetic
      ? (member.agent?.name || 'AI Agent')
      : (member.firstName && member.familyName
          ? `${member.firstName} ${member.familyName}`
          : (member.firstName || member.user?.email?.split('@')[0] || 'Member'));

    const managerMember = member.position?.parent?.members?.[0] || null;
    const managerName = managerMember
      ? (managerMember.isSynthetic
          ? (managerMember.agent?.name || 'AI Agent')
          : (managerMember.firstName && managerMember.familyName
              ? `${managerMember.firstName} ${managerMember.familyName}`
              : (managerMember.firstName || managerMember.user?.email?.split('@')[0] || 'Manager')))
      : null;

    const memberships = [
      ...(member.team ? [{ id: member.team.id, name: member.team.name, kind: 'team' as const }] : []),
      ...member.permissionGroups.map(pg => ({
        id: pg.permissionGroup.id,
        name: pg.permissionGroup.name,
        kind: 'group' as const
      }))
    ];

    res.json({
      id: member.id,
      userId: member.userId || member.user?.id || null,
      name: displayName,
      email: member.isSynthetic ? '' : (member.workEmail || member.user?.email || ''),
      workEmail: member.workEmail || member.user?.email || '',
      role: member.roleId,
      status: member.status,
      isSynthetic: member.isSynthetic,
      jobTitle: member.position?.title || (member.isSynthetic ? 'AI Digital Twin' : member.roleId),
      positionNumber: member.position?.positionNumber || null,
      avatarUrl: member.avatarUrl || (member.isSynthetic ? null : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`),
      workArrangements: member.workArrangements || null,
      phoneNumbers: member.phoneNumbers || [],
      team: member.team || null,
      reportsTo: managerMember
        ? {
            id: managerMember.id,
            userId: managerMember.userId || managerMember.user?.id || null,
            name: managerName,
            jobTitle: member.position?.parent?.title || 'Manager',
            avatarUrl: managerMember.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(managerName || 'M')}&background=random`
          }
        : null,
      memberships
    });
  } catch (err: any) {
    console.error('[MemberAPI ProfileCard Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single member details
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const member = await db.tenantMember.findFirst({
      where: { id },
      include: {
        user: true,
        agent: true,
        team: true,
        position: true,
        phoneNumbers: true,
        certifications: true,
        education: true,
        skills: true,
        permissionGroups: {
          include: {
            permissionGroup: true
          }
        }
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found or access denied' });
    }

    // Format for frontend
    const displayName = member.isSynthetic 
      ? member.agent?.name 
      : (member.firstName && member.familyName ? `${member.firstName} ${member.familyName}` : (member.user?.email.split('@')[0] || 'Unknown'));

    const formatted = {
      id: member.id,
      name: displayName,
      email: member.isSynthetic ? 'Agent' : (member.user?.email || ''),
      role: member.roleId,
      teamId: member.teamId,
      positionId: member.positionId,
      status: member.status,
      isSynthetic: member.isSynthetic,
      agentConfig: member.agent?.config,
      modelType: member.agent?.modelType,
      createdAt: member.createdAt,
      lastActive: member.isSynthetic ? 'Now' : 'Recent',
      
      // Detailed fields
      firstName: member.firstName,
      otherName: member.otherName,
      familyName: member.familyName,
      personalEmail: member.personalEmail,
      homeAddress: member.homeAddress,
      workArrangements: member.workArrangements,
      emergencyContact: member.emergencyContact,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      nationality: member.nationality,
      startDate: member.startDate,
      endDate: member.endDate,
      
      // Relations
      phoneNumbers: member.phoneNumbers,
      certifications: member.certifications,
      education: member.education,
      skills: member.skills,
      permissionGroups: member.permissionGroups.map(pg => pg.permissionGroup),

      // Workforce Enhancements
      avatarUrl: member.avatarUrl,
      isContractor: member.isContractor,
      licenceType: member.licenceType,
      aiHumour: member.aiHumour,
      workEmail: member.workEmail,
      signature: member.signature,
      aiOverrides: member.aiOverrides || {}
    };

    res.json(formatted);
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET effective permissions
router.get('/:id/effective-permissions', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    
    const member = await db.tenantMember.findUnique({
      where: { id },
      include: {
        permissionGroups: {
          include: {
            permissionGroup: true
          }
        }
      }
    });

    if (!member) return res.status(404).json({ error: 'Member not found' });

    const groupIds = member.permissionGroups.map(pg => pg.permissionGroupId);
    const capabilities = await resolveCapabilities(groupIds, req.tenantId!);

    // Group capabilities by category for better UI organization
    const breakdown: Record<string, string[]> = {};
    capabilities.forEach(cap => {
      const [category] = cap.split(':');
      if (!breakdown[category]) breakdown[category] = [];
      breakdown[category].push(cap);
    });

    res.json({
      memberId: id,
      groups: member.permissionGroups.map(pg => ({
        id: pg.permissionGroup.id,
        name: pg.permissionGroup.name,
        parentGroupId: pg.permissionGroup.parentGroupId
      })),
      effectiveCapabilities: capabilities,
      breakdown
    });
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST invite human
router.post('/invite', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { email, role, teamId, firstName, familyName, isContractor, licenceType, workArrangements } = req.body;

    // Check if user exists or create new placeholder
    let user = await globalPrisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await globalPrisma.user.create({
        data: {
          id: `usr_${Math.random().toString(36).substring(2, 11)}`,
          email
        }
      });
    }

    const member = await db.tenantMember.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: role || 'Standard',
        teamId: teamId || null,
        status: 'Pending',
        firstName,
        familyName,
        isContractor: !!isContractor,
        licenceType: licenceType || 'Standard',
        workArrangements,
        isSynthetic: false
      },
      include: { user: true, team: true }
    });

    res.json(member);
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST provision agent
router.post('/provision', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { modelType, teamId, role, aiHumour, name, agentConfig, licenceType, avatarUrl } = req.body;

    const agent = await db.agent.create({
      data: {
        tenantId,
        name: name || `${modelType.split(' ')[0]} Assistant`,
        modelType,
        config: { humour: aiHumour || 0.5, ...agentConfig }
      }
    });

    const member = await db.tenantMember.create({
      data: {
        tenantId,
        agentId: agent.id,
        roleId: role || 'Standard',
        teamId: teamId || null,
        status: 'Active',
        isSynthetic: true,
        aiHumour: aiHumour || 0.5,
        licenceType: licenceType || 'AI Agent',
        avatarUrl: avatarUrl || null
      },
      include: { agent: true, team: true }
    });

    res.json(member);
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST clone member
router.post('/clone/:id', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const source = await db.tenantMember.findUnique({
      where: { id },
      include: { agent: true, skills: true }
    });

    if (!source) return res.status(404).json({ error: 'Source member not found' });

    let newMember;
    if (source.isSynthetic) {
      const newAgent = await db.agent.create({
        data: {
          tenantId,
          name: source.agent?.name ? `${source.agent.name} (Clone)` : 'Cloned Agent',
          modelType: source.agent?.modelType || 'gemini-2.5-flash',
          config: source.agent?.config ? { ...(source.agent.config as any) } : undefined
        }
      });

      newMember = await db.tenantMember.create({
        data: {
          tenantId,
          agentId: newAgent.id,
          roleId: source.roleId,
          teamId: source.teamId,
          positionId: source.positionId,
          status: 'Active',
          isSynthetic: true,
          aiHumour: source.aiHumour,
          licenceType: source.licenceType,
          avatarUrl: source.avatarUrl
        },
        include: { agent: true, team: true }
      });
    } else {
      const newUserId = `usr_${Math.random().toString(36).substring(2, 11)}`;
      await globalPrisma.user.create({
        data: {
          id: newUserId,
          email: `clone_${newUserId}@placeholder.ai`
        }
      });

      newMember = await db.tenantMember.create({
        data: {
          tenantId,
          userId: newUserId,
          roleId: source.roleId,
          teamId: source.teamId,
          positionId: source.positionId,
          status: 'Pending',
          firstName: source.firstName ? `${source.firstName} (Clone)` : undefined,
          familyName: source.familyName,
          isContractor: source.isContractor,
          licenceType: source.licenceType,
          workArrangements: source.workArrangements
        },
        include: { team: true, skills: true }
      });
    }

    res.json(newMember);
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH update member
router.post('/:id', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    
    const { 
      role, teamId, positionId, status, agentConfig, modelType, name,
      firstName, otherName, familyName, personalEmail, homeAddress, workArrangements,
      emergencyContact, dateOfBirth, gender, nationality, startDate, endDate,
      phoneNumbers, certifications, education, skills, permissionGroups,
      avatarUrl, isContractor, licenceType, aiHumour, workEmail, signature, aiOverrides
    } = req.body;

    const member = await db.tenantMember.findFirst({
      where: { id },
      include: { agent: true }
    });

    if (!member) return res.status(404).json({ error: 'Member not found or access denied' });

    // 1. Update TenantMember basic and detailed fields
    const updatedMember = await db.tenantMember.update({
      where: { id },
      data: {
        roleId: role || member.roleId,
        teamId: teamId !== undefined ? (teamId || null) : member.teamId,
        positionId: positionId !== undefined ? (positionId || null) : member.positionId,
        status: status || member.status,
        aiOverrides: aiOverrides !== undefined ? aiOverrides : undefined,
        
        firstName: firstName !== undefined ? firstName : member.firstName,
        otherName: otherName !== undefined ? otherName : member.otherName,
        familyName: familyName !== undefined ? familyName : member.familyName,
        personalEmail: personalEmail !== undefined ? personalEmail : member.personalEmail,
        homeAddress: homeAddress !== undefined ? homeAddress : member.homeAddress,
        workArrangements: workArrangements !== undefined ? workArrangements : member.workArrangements,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : member.emergencyContact,
        dateOfBirth: (dateOfBirth && !isNaN(Date.parse(dateOfBirth))) ? new Date(dateOfBirth) : member.dateOfBirth,
        gender: gender !== undefined ? gender : member.gender,
        nationality: nationality !== undefined ? nationality : member.nationality,
        startDate: (startDate && !isNaN(Date.parse(startDate))) ? new Date(startDate) : member.startDate,
        endDate: (endDate && !isNaN(Date.parse(endDate))) ? new Date(endDate) : member.endDate,
        
        avatarUrl: avatarUrl !== undefined ? avatarUrl : member.avatarUrl,
        isContractor: isContractor !== undefined ? isContractor : member.isContractor,
        licenceType: licenceType !== undefined ? licenceType : member.licenceType,
        aiHumour: aiHumour !== undefined ? aiHumour : member.aiHumour,
        workEmail: workEmail !== undefined ? workEmail : member.workEmail,
        signature: signature !== undefined ? signature : member.signature,

        // Nested updates for relations
        phoneNumbers: phoneNumbers ? {
          deleteMany: {},
          create: phoneNumbers.map((p: any) => ({ label: p.label, number: p.number, tenantId: req.tenantId }))
        } : undefined,
        certifications: certifications ? {
          deleteMany: {},
          create: certifications.map((c: any) => ({
            name: c.name,
            issuer: c.issuer,
            dateObtained: (c.dateObtained && !isNaN(Date.parse(c.dateObtained))) ? new Date(c.dateObtained) : null,
            expiryDate: (c.expiryDate && !isNaN(Date.parse(c.expiryDate))) ? new Date(c.expiryDate) : null,
            tenantId: req.tenantId
          }))
        } : undefined,
        education: education ? {
          deleteMany: {},
          create: education.map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            startDate: (e.startDate && !isNaN(Date.parse(e.startDate))) ? new Date(e.startDate) : null,
            endDate: (e.endDate && !isNaN(Date.parse(e.endDate))) ? new Date(e.endDate) : null,
            tenantId: req.tenantId
          }))
        } : undefined,
        skills: skills ? {
          deleteMany: {},
          create: skills.map((s: any) => ({
            name: s.name,
            proficiencyLevel: s.proficiencyLevel,
            tenantId: req.tenantId
          }))
        } : undefined,
        permissionGroups: permissionGroups ? {
          deleteMany: {},
          create: permissionGroups.map((groupId: string) => ({
            permissionGroupId: groupId,
            tenantId: req.tenantId!
          }))
        } : undefined
      },
      include: { 
        user: true, 
        agent: true, 
        team: true, 
        position: true,
        phoneNumbers: true,
        certifications: true,
        education: true,
        skills: true,
        permissionGroups: {
          include: {
            permissionGroup: true
          }
        }
      }
    });

    // 2. If it's an agent, update Agent specific fields
    if (member.isSynthetic && member.agentId) {
      await db.agent.update({
        where: { id: member.agentId },
        data: {
          modelType: modelType || undefined,
          config: agentConfig ? { ...(member.agent.config as any || {}), ...agentConfig } : undefined,
          name: name || undefined
        }
      });
    }

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'MEMBER_UPDATE',
      resourceId: id,
      oldValue: member, // Note: Simplified for auditing
      newValue: updatedMember
    });

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    console.error('[MemberAPI Update Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update member AI Overrides
router.put('/:id/ai-overrides', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { aiOverrides } = req.body;

    const existing = await db.tenantMember.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = await db.tenantMember.update({
      where: { id },
      data: { aiOverrides: aiOverrides || {} }
    });

    await recordAudit({
      tenantId,
      actorId: req.user!.uid,
      action: 'MEMBER_AI_OVERRIDES_UPDATE',
      resourceId: id,
      newValue: updated.aiOverrides
    });

    res.json({ success: true, aiOverrides: updated.aiOverrides });
  } catch (err: any) {
    console.error(`[MemberAPI] AI Overrides update error for member ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to update member AI overrides' });
  }
});

// Helper to reliably resolve a TenantMember by memberId, userId, or 'me'
async function resolveMember(db: any, id: string, tenantId: string, userId?: string, email?: string) {
  if (id === 'me' || id === 'current' || id === 'self') {
    if (userId) {
      const m = await db.tenantMember.findFirst({ where: { userId, tenantId } });
      if (m) return m;
    }
    if (email) {
      const m = await db.tenantMember.findFirst({ where: { workEmail: email, tenantId } });
      if (m) return m;
    }
    // Fallback: first member in tenant
    return await db.tenantMember.findFirst({ where: { tenantId } });
  }

  // Direct ID check
  let member = await db.tenantMember.findFirst({ where: { id, tenantId } });
  if (!member && id) {
    // Check if ID is userId
    member = await db.tenantMember.findFirst({ where: { userId: id, tenantId } });
  }
  if (!member && email) {
    member = await db.tenantMember.findFirst({ where: { workEmail: email, tenantId } });
  }
  return member;
}

// GET /api/members/:id/hr - Fetch HR details (contracts, leave, timesheets, work arrangements, requests)
router.get('/:id/hr', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const userUid = req.user?.uid;
    const userEmail = req.user?.email;

    let member = await resolveMember(db, id, tenantId, userUid, userEmail);
    if (!member) {
      // Auto-provision a basic TenantMember record if user is valid but no member record exists yet
      if (userUid && (id === 'me' || id === userUid)) {
        member = await db.tenantMember.create({
          data: {
            tenantId,
            userId: userUid,
            workEmail: userEmail || 'user@aurora.internal',
            firstName: userEmail ? userEmail.split('@')[0].split('.')[0] : 'Aurora',
            familyName: userEmail && userEmail.includes('.') ? userEmail.split('@')[0].split('.')[1] : 'User',
            roleId: req.user?.isSuperAdmin ? 'Admin' : 'Standard',
            status: 'Active',
            workArrangements: JSON.stringify({
              pattern: 'Hybrid (3/2)',
              schedule: { monday: 'Home', tuesday: 'Office', wednesday: 'Office', thursday: 'Office', friday: 'Home' },
              location: 'Sydney HQ & Home Office',
              flexibleHours: true,
              notes: 'Standard flexible hybrid schedule'
            })
          }
        });
      } else {
        return res.status(404).json({ error: 'Member not found' });
      }
    }

    const memberId = member.id;

    // Load full member details (position, team, certifications, skills, phoneNumbers)
    const detailedMember = await db.tenantMember.findFirst({
      where: { id: memberId },
      include: {
        position: true,
        team: true,
        certifications: true,
        skills: true,
        phoneNumbers: true
      }
    });

    let [contracts, leaveBalances, leaveRequests, timesheets, requestLogs] = await Promise.all([
      db.employmentContract.findMany({
        where: { memberId, tenantId },
        include: { remuneration: true },
        orderBy: { startDate: 'desc' }
      }),
      db.leaveBalance.findMany({
        where: { memberId }
      }),
      db.leaveRequest.findMany({
        where: { memberId },
        orderBy: { startDate: 'desc' }
      }),
      db.timesheet.findMany({
        where: { memberId },
        include: { entries: true },
        orderBy: { periodStart: 'desc' }
      }),
      db.auditLog.findMany({
        where: {
          tenantId,
          action: 'EMPLOYEE_REQUEST',
          resourceId: memberId
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      }).catch(() => [])
    ]);

    // Seed default Leave Balances if empty
    if (leaveBalances.length === 0) {
      const defaultBalances = [
        { type: 'Annual Leave', accrued: 20, used: 3.5 },
        { type: 'Sick & Carer\'s Leave', accrued: 10, used: 1 },
        { type: 'Time In Lieu (TOIL)', accrued: 2.5, used: 0 },
        { type: 'Compassionate Leave', accrued: 3, used: 0 }
      ];
      for (const bal of defaultBalances) {
        await db.leaveBalance.create({
          data: {
            memberId,
            type: bal.type,
            accrued: bal.accrued,
            used: bal.used
          }
        }).catch(() => {});
      }
      leaveBalances = await db.leaveBalance.findMany({ where: { memberId } });
    }

    // Seed default Contract & Remuneration if empty
    if (contracts.length === 0) {
      try {
        const seededContract = await db.employmentContract.create({
          data: {
            tenantId,
            memberId,
            type: 'Permanent Full-Time',
            startDate: member.startDate || new Date(Date.now() - 365 * 24 * 3600 * 1000),
            status: 'Active',
            remuneration: {
              create: {
                amount: 115000,
                currency: 'AUD',
                effectiveDate: member.startDate || new Date(Date.now() - 365 * 24 * 3600 * 1000)
              }
            }
          },
          include: { remuneration: true }
        });
        contracts = [seededContract];
      } catch (err) {
        console.warn('[MemberAPI] Contract auto-seed error:', err);
      }
    }

    // Seed default current-period timesheet if empty
    if (timesheets.length === 0) {
      try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
        startOfWeek.setHours(9, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(17, 30, 0, 0);

        const initialEntries: any[] = [];
        for (let i = 0; i < 5; i++) {
          const entryDate = new Date(startOfWeek);
          entryDate.setDate(startOfWeek.getDate() + i);
          initialEntries.push({
            date: entryDate,
            hours: 7.6,
            description: i % 2 === 0 ? 'Core Platform Engineering & System Architecture' : 'Workspace Sprint Tasks & Team Sync'
          });
        }

        const seededTimesheet = await db.timesheet.create({
          data: {
            memberId,
            status: 'Draft',
            periodStart: startOfWeek,
            periodEnd: endOfWeek,
            entries: {
              create: initialEntries
            }
          },
          include: { entries: true }
        });
        timesheets = [seededTimesheet];
      } catch (err) {
        console.warn('[MemberAPI] Timesheet auto-seed error:', err);
      }
    }

    // Parse work arrangements
    let parsedWorkArrangements = null;
    if (member.workArrangements) {
      try {
        parsedWorkArrangements = typeof member.workArrangements === 'string'
          ? JSON.parse(member.workArrangements)
          : member.workArrangements;
      } catch {
        parsedWorkArrangements = { pattern: member.workArrangements };
      }
    } else {
      parsedWorkArrangements = {
        pattern: 'Hybrid (3 Days Office / 2 Days Home)',
        schedule: {
          monday: 'Home',
          tuesday: 'Office',
          wednesday: 'Office',
          thursday: 'Office',
          friday: 'Home'
        },
        location: 'Sydney HQ & Home Office',
        flexibleHours: true,
        notes: 'Standard flexible hybrid schedule'
      };
    }

    // Extract employee requests from audit log
    const requests = requestLogs.map((log: any) => {
      const val = (log.newValue as any) || {};
      return {
        id: log.id,
        type: val.type || 'general',
        title: val.title || 'Workplace Request',
        description: val.description || '',
        amount: val.amount || null,
        currency: val.currency || 'AUD',
        urgency: val.urgency || 'Normal',
        status: val.status || 'Pending Review',
        submittedAt: log.timestamp,
        reviewerNotes: val.reviewerNotes || null
      };
    });

    res.json({
      member: detailedMember || member,
      contracts,
      leaveBalances,
      leaveRequests,
      timesheets,
      workArrangements: parsedWorkArrangements,
      requests
    });
  } catch (err: any) {
    console.error('[MemberAPI] GET /:id/hr Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch HR details' });
  }
});

// POST /api/members/:id/contracts - Create employment contract & remuneration
router.post('/:id/contracts', authorize('manage:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { type, startDate, endDate, salary, currency } = req.body;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const contract = await db.employmentContract.create({
      data: {
        tenantId,
        memberId: member.id,
        type: type || 'Permanent',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: 'Active',
        remuneration: salary ? {
          create: {
            amount: parseFloat(salary),
            currency: currency || 'AUD',
            effectiveDate: startDate ? new Date(startDate) : new Date()
          }
        } : undefined
      },
      include: {
        remuneration: true
      }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'MEMBER_CONTRACT_CREATE',
      resourceId: contract.id,
      newValue: contract
    });

    res.status(201).json(contract);
  } catch (err: any) {
    console.error('[MemberAPI] Create Contract Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create contract' });
  }
});

// POST /api/members/:id/leave-requests - Submit leave request & update leave balance
router.post('/:id/leave-requests', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason, handoverTo, enableTwinHandover } = req.body;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leaveRequest = await db.leaveRequest.create({
      data: {
        memberId: member.id,
        type: leaveType || 'Annual Leave',
        startDate: start,
        endDate: end,
        reason: reason ? `${reason}${handoverTo ? ` (Handover: ${handoverTo})` : ''}${enableTwinHandover ? ' [Digital Twin Auto-Handover Armed]' : ''}` : null,
        status: 'Pending'
      }
    });

    // Update or seed LeaveBalance
    const balance = await db.leaveBalance.findFirst({
      where: { memberId: member.id, type: leaveType || 'Annual Leave' }
    });
    if (!balance) {
      await db.leaveBalance.create({
        data: {
          memberId: member.id,
          type: leaveType || 'Annual Leave',
          accrued: 20,
          used: diffDays
        }
      });
    } else {
      await db.leaveBalance.update({
        where: { id: balance.id },
        data: {
          used: balance.used + diffDays
        }
      });
    }

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'LEAVE_REQUEST_CREATE',
      resourceId: leaveRequest.id,
      newValue: leaveRequest
    });

    res.status(201).json(leaveRequest);
  } catch (err: any) {
    console.error('[MemberAPI] Create Leave Request Error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit leave request' });
  }
});

// POST /api/members/:id/timesheets - Save / Upsert Timesheet with Entries
router.post('/:id/timesheets', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { timesheetId, periodStart, periodEnd, status, entries } = req.body;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    let timesheet;
    if (timesheetId) {
      timesheet = await db.timesheet.findFirst({
        where: { id: timesheetId, memberId: member.id }
      });
    }

    if (!timesheet) {
      timesheet = await db.timesheet.create({
        data: {
          memberId: member.id,
          status: status || 'Draft',
          periodStart: periodStart ? new Date(periodStart) : new Date(),
          periodEnd: periodEnd ? new Date(periodEnd) : new Date()
        }
      });
    } else if (status) {
      await db.timesheet.update({
        where: { id: timesheet.id },
        data: { status }
      });
    }

    // Replace or update entries if supplied
    if (Array.isArray(entries)) {
      // Clear existing entries
      await db.timesheetEntry.deleteMany({
        where: { timesheetId: timesheet.id }
      });

      // Insert new entries
      for (const entry of entries) {
        if (entry.hours > 0 || entry.description) {
          await db.timesheetEntry.create({
            data: {
              timesheetId: timesheet.id,
              date: new Date(entry.date),
              hours: parseFloat(entry.hours) || 0,
              description: entry.description || ''
            }
          });
        }
      }
    }

    const updated = await db.timesheet.findFirst({
      where: { id: timesheet.id },
      include: { entries: true }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'TIMESHEET_UPDATE',
      resourceId: timesheet.id,
      newValue: updated
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[MemberAPI] Save Timesheet Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save timesheet' });
  }
});

// PUT /api/members/:id/timesheets/:timesheetId/submit - Submit Timesheet
router.put('/:id/timesheets/:timesheetId/submit', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id, timesheetId } = req.params;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = await db.timesheet.update({
      where: { id: timesheetId },
      data: { status: 'Submitted' },
      include: { entries: true }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'TIMESHEET_SUBMITTED',
      resourceId: timesheetId,
      newValue: updated
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[MemberAPI] Submit Timesheet Error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit timesheet' });
  }
});

// PUT /api/members/:id/work-arrangements - Update work arrangements & weekly schedule
router.put('/:id/work-arrangements', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const arrangementsJson = JSON.stringify(req.body);

    const updated = await db.tenantMember.update({
      where: { id: member.id },
      data: {
        workArrangements: arrangementsJson
      }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'WORK_ARRANGEMENTS_UPDATED',
      resourceId: member.id,
      newValue: req.body
    });

    res.json({ success: true, workArrangements: req.body });
  } catch (err: any) {
    console.error('[MemberAPI] Update Work Arrangements Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update work arrangements' });
  }
});

// POST /api/members/:id/requests - Lodge Employee Workplace Request (Expense, Equipment, Letter, Query)
router.post('/:id/requests', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { type, title, description, amount, currency, urgency, attachments } = req.body;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const requestPayload = {
      requestId,
      type: type || 'general',
      title: title || 'Workplace Request',
      description: description || '',
      amount: amount ? parseFloat(amount) : null,
      currency: currency || 'AUD',
      urgency: urgency || 'Normal',
      attachments: attachments || [],
      status: 'Pending Review',
      submittedAt: new Date().toISOString()
    };

    const auditEntry = await db.auditLog.create({
      data: {
        tenantId,
        actorId: req.user?.uid || member.id,
        action: 'EMPLOYEE_REQUEST',
        resourceId: member.id,
        newValue: requestPayload
      }
    });

    res.status(201).json({
      id: auditEntry.id,
      ...requestPayload,
      submittedAt: auditEntry.timestamp
    });
  } catch (err: any) {
    console.error('[MemberAPI] Lodge Request Error:', err);
    res.status(500).json({ error: err.message || 'Failed to lodge workplace request' });
  }
});

// PUT /api/members/:id/personal-details - Update personal, emergency & contact details
router.put('/:id/personal-details', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { emergencyContact, homeAddress, personalEmail, workEmail, phone } = req.body;

    const member = await resolveMember(db, id, tenantId, req.user?.uid);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = await db.tenantMember.update({
      where: { id: member.id },
      data: {
        emergencyContact: emergencyContact !== undefined ? emergencyContact : member.emergencyContact,
        homeAddress: homeAddress !== undefined ? homeAddress : member.homeAddress,
        personalEmail: personalEmail !== undefined ? personalEmail : member.personalEmail,
        workEmail: workEmail !== undefined ? workEmail : member.workEmail
      }
    });

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'MEMBER_PERSONAL_DETAILS_UPDATE',
      resourceId: member.id,
      newValue: { emergencyContact, homeAddress, personalEmail, workEmail }
    });

    res.json({ success: true, member: updated });
  } catch (err: any) {
    console.error('[MemberAPI] Update Personal Details Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update personal details' });
  }
});

// DELETE member
router.delete('/:id', authorize('decommission:staff'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    
    // Check if it's the last admin? (Business logic could go here)
    
    await db.tenantMember.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[MemberAPI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

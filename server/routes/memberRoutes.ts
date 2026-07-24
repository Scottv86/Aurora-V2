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
    const tenantId = req.tenantId!;

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
      licenceType: m.licenceType
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
      signature: member.signature
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
          name: source.agent?.name ? `${source.agent.name} (Clone)` : 'Cloned Agent',
          modelType: source.modelType || undefined,
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
      avatarUrl, isContractor, licenceType, aiHumour, workEmail, signature
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

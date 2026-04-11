import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

// GET all members
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const members = await db.tenantMember.findMany({
      include: {
        user: true,
        agent: true,
        team: true,
        position: true
      }
    });

    // Format for frontend
    const formatted = members.map(m => ({
      id: m.id,
      name: m.isSynthetic ? m.agent?.name : (m.firstName && m.familyName ? `${m.firstName} ${m.familyName}` : (m.user?.email.split('@')[0] || 'Unknown')),
      email: m.isSynthetic ? 'Agent' : (m.user?.email || ''),
      role: m.roleId,
      team: m.team?.name || 'Unassigned',
      teamId: m.teamId,
      status: m.status,
      isSynthetic: m.isSynthetic,
      position: m.position?.title || 'Undesignated',
      avatar: m.isSynthetic ? undefined : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.email || 'U')}&background=random`,
      lastActive: m.isSynthetic ? 'Now' : 'Recent'
    }));

    res.json(formatted);
  } catch (err: any) {
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
        skills: true
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
      skills: member.skills
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
    
    const { 
      role, teamId, positionId, status, agentConfig, modelType, name,
      firstName, otherName, familyName, personalEmail, homeAddress, workArrangements,
      emergencyContact, dateOfBirth, gender, nationality, startDate, endDate,
      phoneNumbers, certifications, education, skills
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
        dateOfBirth: (dateOfBirth && dateOfBirth !== "") ? new Date(dateOfBirth) : member.dateOfBirth,
        gender: gender !== undefined ? gender : member.gender,
        nationality: nationality !== undefined ? nationality : member.nationality,
        startDate: (startDate && startDate !== "") ? new Date(startDate) : member.startDate,
        endDate: (endDate && endDate !== "") ? new Date(endDate) : member.endDate,

        // Nested updates for relations
        phoneNumbers: phoneNumbers ? {
          deleteMany: {},
          create: phoneNumbers.map((p: any) => ({ label: p.label, number: p.number, tenant_id: req.tenantId }))
        } : undefined,
        certifications: certifications ? {
          deleteMany: {},
          create: certifications.map((c: any) => ({
            name: c.name,
            issuer: c.issuer,
            dateObtained: (c.dateObtained && c.dateObtained !== "") ? new Date(c.dateObtained) : null,
            expiryDate: (c.expiryDate && c.expiryDate !== "") ? new Date(c.expiryDate) : null,
            tenant_id: req.tenantId
          }))
        } : undefined,
        education: education ? {
          deleteMany: {},
          create: education.map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            startDate: (e.startDate && e.startDate !== "") ? new Date(e.startDate) : null,
            endDate: (e.endDate && e.endDate !== "") ? new Date(e.endDate) : null,
            tenant_id: req.tenantId
          }))
        } : undefined,
        skills: skills ? {
          deleteMany: {},
          create: skills.map((s: any) => ({
            name: s.name,
            proficiencyLevel: s.proficiencyLevel,
            tenant_id: req.tenantId
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
        skills: true
      }
    });

    // 2. If it's an agent, update Agent specific fields
    if (member.isSynthetic && member.agentId) {
      await db.agent.update({
        where: { id: member.agentId },
        data: {
          modelType: modelType || undefined,
          config: agentConfig || undefined,
          name: name || undefined
        }
      });
    }

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    console.error('[MemberAPI Update Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE member
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    
    // Check if it's the last admin? (Business logic could go here)
    
    await db.tenantMember.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

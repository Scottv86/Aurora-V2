import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { recordAudit } from '../lib/audit';
import { hasCircularInheritance, simulateRoleAccess, resolveEffectivePolicies } from '../lib/permissions';

const router = express.Router();

const toSlug = (val: string) =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatRole = (g: any) => ({
  id: g.id,
  tenantId: g.tenantId,
  name: g.name,
  slug: g.slug || toSlug(g.name || 'role'),
  description: g.description || '',
  type: g.type || 'CUSTOM',
  status: g.status || 'ACTIVE',
  icon: g.icon || 'Shield',
  color: g.color || '#3b82f6',
  capabilities: Array.isArray(g.capabilities) ? g.capabilities : [],
  modulePolicies: g.modulePolicies && typeof g.modulePolicies === 'object' ? g.modulePolicies : {},
  workflowPolicies: g.workflowPolicies && typeof g.workflowPolicies === 'object' ? g.workflowPolicies : {},
  aiPolicies: g.aiPolicies && typeof g.aiPolicies === 'object' ? g.aiPolicies : {},
  parentGroupId: g.parentGroupId || null,
  parentGroup: g.parentGroup ? { id: g.parentGroup.id, name: g.parentGroup.name, color: g.parentGroup.color } : null,
  solutionId: g.solutionId || null,
  memberCount: g._count?.members ?? 0,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

/**
 * GET /api/permissions/groups
 * Lists all roles / permission groups for the current tenant.
 */
router.get('/groups', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const groups = await db.permissionGroup.findMany({
      include: {
        parentGroup: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(groups.map(formatRole));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/permissions/groups/:id
 * Fetches a single role with its full policy definition.
 */
router.get('/groups/:id', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const group = await db.permissionGroup.findUnique({
      where: { id },
      include: {
        parentGroup: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Role not found' });
    res.json(formatRole(group));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/groups
 * Creates a new role / permission group.
 */
router.post('/groups', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const {
      name,
      slug,
      description,
      type,
      status,
      icon,
      color,
      capabilities,
      modulePolicies,
      workflowPolicies,
      aiPolicies,
      parentGroupId,
      solutionId,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Role name is required' });

    const newGroup = await db.permissionGroup.create({
      data: {
        name,
        slug: slug || toSlug(name),
        description: description ?? '',
        type: type || 'CUSTOM',
        status: status || 'ACTIVE',
        icon: icon || 'Shield',
        color: color || '#3b82f6',
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        modulePolicies: modulePolicies && typeof modulePolicies === 'object' ? modulePolicies : {},
        workflowPolicies: workflowPolicies && typeof workflowPolicies === 'object' ? workflowPolicies : {},
        aiPolicies: aiPolicies && typeof aiPolicies === 'object' ? aiPolicies : {},
        parentGroupId: parentGroupId || null,
        solutionId: solutionId || null,
        tenantId: req.tenantId!,
      },
      include: {
        parentGroup: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_CREATE',
      resourceId: newGroup.id,
      newValue: newGroup,
    });

    res.json(formatRole(newGroup));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/permissions/groups/:id
 * Updates an existing role / permission group.
 */
router.patch('/groups/:id', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      type,
      status,
      icon,
      color,
      capabilities,
      modulePolicies,
      workflowPolicies,
      aiPolicies,
      parentGroupId,
      solutionId,
    } = req.body;

    if (parentGroupId !== undefined && parentGroupId !== null && parentGroupId !== '') {
      const circular = await hasCircularInheritance(id, parentGroupId, req.tenantId!);
      if (circular) {
        return res.status(400).json({ error: 'Circular role inheritance detected. Choose a different parent role.' });
      }
    }

    const oldValue = await db.permissionGroup.findUnique({ where: { id } });
    if (!oldValue) return res.status(404).json({ error: 'Role not found' });

    const updated = await db.permissionGroup.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug: slug || toSlug(name || oldValue.name) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(capabilities !== undefined ? { capabilities } : {}),
        ...(modulePolicies !== undefined ? { modulePolicies } : {}),
        ...(workflowPolicies !== undefined ? { workflowPolicies } : {}),
        ...(aiPolicies !== undefined ? { aiPolicies } : {}),
        ...(parentGroupId !== undefined ? { parentGroupId: parentGroupId || null } : {}),
        ...(solutionId !== undefined ? { solutionId: solutionId || null } : {}),
      },
      include: {
        parentGroup: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_UPDATE',
      resourceId: id,
      oldValue,
      newValue: updated,
    });

    res.json(formatRole(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/groups/:id/clone
 * Clones an existing role as a new DRAFT role.
 */
router.post('/groups/:id/clone', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const source = await db.permissionGroup.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Source role not found' });

    const cloneName = `${source.name} (Copy)`;
    const cloned = await db.permissionGroup.create({
      data: {
        tenantId: req.tenantId!,
        name: cloneName,
        slug: toSlug(cloneName),
        description: source.description,
        type: source.type === 'SYSTEM' ? 'CUSTOM' : source.type,
        status: 'DRAFT',
        icon: source.icon,
        color: source.color,
        capabilities: (source.capabilities as any) ?? [],
        modulePolicies: (source.modulePolicies as any) ?? {},
        workflowPolicies: (source.workflowPolicies as any) ?? {},
        aiPolicies: (source.aiPolicies as any) ?? {},
        parentGroupId: source.parentGroupId,
        solutionId: source.solutionId,
      },
      include: {
        parentGroup: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
    });

    res.json(formatRole(cloned));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/groups/:id/simulate
 * Simulates effective permissions including full inheritance trace.
 */
router.post('/groups/:id/simulate', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const result = await simulateRoleAccess(id, req.tenantId!);
    if (!result) return res.status(404).json({ error: 'Role not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/permissions/groups/:id/dependencies
 * Lists Workforce members, child roles, and modules referencing this role.
 */
router.get('/groups/:id/dependencies', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const role = await db.permissionGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            member: { select: { id: true, firstName: true, familyName: true, email: true } },
          },
        },
        childGroups: { select: { id: true, name: true } },
      },
    });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const modules = await db.module.findMany({
      select: { id: true, name: true, config: true },
    });

    const dependencies: Array<{ id: string; name: string; type: string; path?: string }> = [];

    for (const m of role.members) {
      const fullName = `${m.member?.firstName || ''} ${m.member?.familyName || ''}`.trim() || m.member?.email || m.memberId;
      dependencies.push({
        id: m.memberId,
        name: fullName,
        type: 'Workforce Member',
        path: `/workspace/settings/platform-modules/workforce-management/member/${m.memberId}`,
      });
    }

    for (const child of role.childGroups) {
      dependencies.push({
        id: child.id,
        name: child.name,
        type: 'Inheriting Role',
        path: `/workspace/settings/builder/role/${child.id}`,
      });
    }

    const modPolicies = (role.modulePolicies && typeof role.modulePolicies === 'object' ? role.modulePolicies : {}) as Record<string, any>;
    for (const mod of modules) {
      const cfg = (mod.config as any) || {};
      const referencedInConfig =
        (Array.isArray(cfg.accessControl?.allowedGroupIds) && cfg.accessControl.allowedGroupIds.includes(id)) ||
        Boolean(cfg.fieldSecurity?.[id]);
      const referencedInPolicy = Boolean(modPolicies[mod.id]);
      if (referencedInConfig || referencedInPolicy) {
        dependencies.push({
          id: mod.id,
          name: mod.name,
          type: 'Data Module',
          path: `/workspace/settings/builder/${mod.id}`,
        });
      }
    }

    res.json({ roleId: id, roleName: role.name, dependencies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/simulate-member/:memberId
 * Simulates effective combined policies for a real Workforce member across all assigned roles.
 */
router.post('/simulate-member/:memberId', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { memberId } = req.params;
    const member = await db.tenantMember.findFirst({
      where: { id: memberId },
      include: {
        team: { select: { id: true, name: true } },
        permissionGroups: {
          include: { permissionGroup: { select: { id: true, name: true } } },
        },
      },
    });
    if (!member) return res.status(404).json({ error: 'Workforce member not found' });

    const groupIds = member.permissionGroups.map((pg: any) => pg.permissionGroupId);
    const effective = await resolveEffectivePolicies(groupIds, req.tenantId!);

    res.json({
      memberId: member.id,
      memberName: `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.email,
      roleId: member.roleId,
      team: member.team,
      assignedRoles: member.permissionGroups.map((pg: any) => pg.permissionGroup),
      effectivePolicies: effective,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/permissions/groups/:id/members
 * Lists members assigned to this role.
 */
router.get('/groups/:id/members', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const rows = await db.memberPermissionGroup.findMany({
      where: { permissionGroupId: id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            familyName: true,
            email: true,
            roleId: true,
            avatarUrl: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    res.json(
      rows.map((r: any) => ({
        memberId: r.memberId,
        assignedAt: r.assignedAt,
        name: `${r.member?.firstName || ''} ${r.member?.familyName || ''}`.trim() || r.member?.email || r.memberId,
        email: r.member?.email || '',
        roleId: r.member?.roleId || '',
        teamName: r.member?.team?.name || null,
        avatarUrl: r.member?.avatarUrl || null,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/permissions/groups/:id/members
 * Assigns a Workforce member to this role.
 */
router.post('/groups/:id/members', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId is required' });

    await db.memberPermissionGroup.upsert({
      where: {
        memberId_permissionGroupId: {
          memberId,
          permissionGroupId: id,
        },
      },
      create: {
        memberId,
        permissionGroupId: id,
        tenantId: req.tenantId!,
      },
      update: {},
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_MEMBER_ADD',
      resourceId: id,
      newValue: { memberId },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/permissions/groups/:id/members/:memberId
 * Removes a Workforce member from this role.
 */
router.delete('/groups/:id/members/:memberId', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id, memberId } = req.params;
    await db.memberPermissionGroup.deleteMany({
      where: { permissionGroupId: id, memberId },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_MEMBER_REMOVE',
      resourceId: id,
      oldValue: { memberId },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/permissions/groups/:id/audit
 * Returns AuditLog history for this role.
 */
router.get('/groups/:id/audit', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const logs = await db.auditLog.findMany({
      where: { resourceId: id },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/permissions/groups/:id
 * Deletes a role / permission group if no active members are assigned.
 */
router.delete('/groups/:id', authorize('manage:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const count = await db.memberPermissionGroup.count({
      where: { permissionGroupId: id },
    });

    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete role with active members. Remove all members first.' });
    }

    const oldValue = await db.permissionGroup.findUnique({ where: { id } });

    await db.permissionGroup.delete({
      where: { id },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user!.uid,
      action: 'GROUP_DELETE',
      resourceId: id,
      oldValue,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

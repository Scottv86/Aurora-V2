import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/authMiddleware';
import { globalPrisma } from '../lib/prisma';
import { resolveCapabilities } from '../lib/permissions';

const router = Router();

/**
 * GET /api/platform/context
 * Returns the full context for the current authenticated user session,
 * including tenant information and user profile.
 */
router.get('/context', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Auth failed: User session missing' });
  }

  const { uid, tenantIds } = req.user;

  try {
    // Fetch user details from DB
    const user = await globalPrisma.user.findUnique({
      where: { id: uid },
      include: {
        memberships: {
          include: {
            tenant: true,
            position: true,
            team: true,
            permissionGroups: {
              include: {
                permissionGroup: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.warn(`[PlatformAPI] User ${uid} NOT FOUND in database`);
      return res.status(404).json({ error: 'User record not found in system' });
    }

    // Determine primary tenant
    // We prioritize actual database memberships over the token's snapshot
    const primaryMembership = user.memberships[0];
    const tenant: any = primaryMembership?.tenant || null;

    // Calculate flattened capabilities for the primary membership
    const groupIds = primaryMembership?.permissionGroups?.map((pg: any) => pg.permissionGroupId) || [];
    const capabilities = await resolveCapabilities(groupIds, tenant?.id || '');
    
    // Menu Configuration Resolution: User Customization > Specific User Override > Team Override > Position Override > Role Override > Tenant Default
    const memberId = primaryMembership?.id;
    const teamId = primaryMembership?.teamId;
    const positionId = primaryMembership?.positionId;
    const roleId = primaryMembership?.roleId || 'USER';

    let resolvedMenuConfig = primaryMembership?.menuConfig || null;

    if (!resolvedMenuConfig && tenant?.menuConfig) {
      const tConfig = tenant.menuConfig as any;
      if (tConfig && typeof tConfig === 'object' && !Array.isArray(tConfig) && (tConfig.default || tConfig.roles || tConfig.teams || tConfig.positions || tConfig.users)) {
        resolvedMenuConfig = 
          (memberId && tConfig.users?.[memberId]) ||
          (teamId && tConfig.teams?.[teamId]) ||
          (positionId && tConfig.positions?.[positionId]) ||
          (roleId && tConfig.roles?.[roleId]) ||
          tConfig.default ||
          null;
      } else {
        resolvedMenuConfig = tenant.menuConfig;
      }
    }

    const menuConfig = resolvedMenuConfig;

    const contextData = {
      user: {
        id: user.id,
        memberId: primaryMembership?.id,
        email: user.email,
        firstName: primaryMembership?.firstName,
        lastName: primaryMembership?.familyName,
        isSuperAdmin: user.isSuperAdmin,
        role: user.isSuperAdmin ? 'SUPERADMIN' : (primaryMembership?.roleId || 'USER'),
        licenceType: primaryMembership?.licenceType || (user.isSuperAdmin ? 'Developer' : 'Standard'),
        avatarUrl: primaryMembership?.avatarUrl,
        position: primaryMembership?.position?.title,
        positionId: primaryMembership?.positionId,
        teamId: primaryMembership?.teamId,
        team: primaryMembership?.team?.name,
        capabilities: user.isSuperAdmin ? ['platform:manage', 'manage:staff', 'view:billing', 'admin:access'] : capabilities
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.planTier,
        status: tenant.status,
        createdAt: tenant.createdAt,
        environments: ['production'],
        menuConfig: tenant.menuConfig,
        branding: tenant.branding,
        localization: tenant.localization,
        metadata: tenant.metadata,
        workspaceSettings: tenant.workspaceSettings,
        enabledApps: tenant.enabledApps
      } : null,
      menuConfig // Resolved menu config (profile override or tenant default)
    };

    res.json(contextData);
  } catch (error: any) {
    console.error(`[PlatformAPI] Context Error for UID ${uid}:`, {
      message: error.message,
      stack: error.stack,
      tenantIds
    });
    res.status(500).json({ 
      error: 'Failed to retrieve platform context',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/platform/menu-config
 * Updates the menu configuration for either the current user or the organization.
 */
router.put('/menu-config', authenticate, async (req: AuthRequest, res: Response) => {
  const { config, scope } = req.body;
  const { uid, tenantIds, isSuperAdmin } = req.user!;

  // Use provided tenant ID from header or fallback to primary
  const tenantId = req.headers['x-tenant-id'] as string || tenantIds[0];

  if (!tenantId) {
    return res.status(400).json({ error: 'No active tenant found for request' });
  }

  try {
    if (scope === 'tenant') {
      // Check if user has Developer license or is superadmin
      const membership = await globalPrisma.tenantMember.findUnique({
        where: { userId_tenantId: { userId: uid, tenantId } }
      });

      const canUpdate = membership?.licenceType === 'Developer' || membership?.roleId === 'Admin' || isSuperAdmin;

      if (!canUpdate) {
        return res.status(403).json({ error: 'An Admin role or Developer license seat is required to update the organization menu.' });
      }

      await globalPrisma.tenant.update({
        where: { id: tenantId },
        data: { menuConfig: config }
      });
    } else {
      // Default scope: user (TenantMember profile)
      await globalPrisma.tenantMember.update({
        where: { userId_tenantId: { userId: uid, tenantId } },
        data: { menuConfig: config }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[PlatformAPI] Menu config update error:', error);
    res.status(500).json({ error: 'Failed to save menu configuration' });
  }
});

/**
 * PATCH /api/platform/settings
 * Updates the organization settings (name, branding, localization).
 */
router.patch('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, subdomain, branding, localization, metadata, workspaceSettings, enabledApps } = req.body;
  const { uid, tenantIds, isSuperAdmin } = req.user!;
  const tenantId = req.headers['x-tenant-id'] as string || tenantIds[0];

  if (!tenantId) {
    return res.status(400).json({ error: 'No active tenant found for request' });
  }

  try {
    // Check if user has Developer license or is superadmin
    const membership = await globalPrisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId: uid, tenantId } }
    });

    const canUpdate = membership?.licenceType === 'Developer' || membership?.roleId === 'Admin' || isSuperAdmin;

    if (!canUpdate) {
      return res.status(403).json({ error: 'An Admin role or Developer license seat is required to update organization settings.' });
    }

      console.log('[PlatformRoutes] PATCH /settings body:', JSON.stringify(req.body, null, 2));
      console.log('[PlatformRoutes] Updating settings for tenant:', tenantId, {
        name,
        branding: branding ? JSON.stringify(branding) : 'null'
      });

      const updatedTenant = await globalPrisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(name && { name }),
          ...(subdomain && { subdomain }),
          ...(branding && { branding }),
        ...(localization && { localization }),
        ...(metadata && { metadata }),
        ...(workspaceSettings && { workspaceSettings }),
        ...(enabledApps && { enabledApps })
      }
    });

    res.json({ success: true, tenant: {
      id: updatedTenant.id,
      name: updatedTenant.name,
      subdomain: updatedTenant.subdomain,
      branding: updatedTenant.branding,
      localization: updatedTenant.localization,
      metadata: updatedTenant.metadata,
      workspaceSettings: updatedTenant.workspaceSettings,
      enabledApps: updatedTenant.enabledApps
    }});
  } catch (error) {
    console.error('[PlatformAPI] Settings update error:', error);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
});

/**
 * PATCH /api/platform/config
 * Specific endpoint for navigation manifest updates.
 */
router.patch('/config', authenticate, async (req: AuthRequest, res: Response) => {
  const { navigation_manifest } = req.body;
  const { uid, tenantIds, isSuperAdmin } = req.user!;
  const tenantId = req.headers['x-tenant-id'] as string || tenantIds[0];

  if (!tenantId) {
    return res.status(400).json({ error: 'No active tenant found for request' });
  }

  try {
    const membership = await globalPrisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId: uid, tenantId } }
    });

    const canUpdate = membership?.licenceType === 'Developer' || membership?.roleId === 'Admin' || isSuperAdmin;
    if (!canUpdate) {
      return res.status(403).json({ error: 'An Admin role or Developer license seat is required to update organization config.' });
    }

    await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: { menuConfig: navigation_manifest }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[PlatformAPI] Config update error:', error);
    res.status(500).json({ error: 'Failed to update organization configuration' });
  }
});

export default router;

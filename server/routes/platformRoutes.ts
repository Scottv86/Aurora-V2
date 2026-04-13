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
    
    // Menu Configuration Resolution: User Customization > Tenant Default
    const menuConfig = primaryMembership?.menuConfig || tenant?.menuConfig || null;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        role: primaryMembership?.roleId || (user.isSuperAdmin ? 'SUPERADMIN' : 'USER'),
        capabilities: capabilities
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.planTier,
        status: tenant.status,
        createdAt: tenant.createdAt,
        environments: ['production'],
        menuConfig: tenant.menuConfig
      } : null,
      menuConfig // Resolved menu config (profile override or tenant default)
    });
  } catch (error: any) {
    console.error('[PlatformAPI] Context error:', error);
    res.status(500).json({ error: 'Failed to retrieve platform context' });
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
      // Check if user is admin of this tenant or superadmin
      const membership = await globalPrisma.tenantMember.findUnique({
        where: { userId_tenantId: { userId: uid, tenantId } }
      });

      if (!isSuperAdmin && membership?.roleId !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can update the organization menu.' });
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

export default router;

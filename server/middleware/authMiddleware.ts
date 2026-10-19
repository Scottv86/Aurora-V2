import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { globalPrisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id?: string;
    uid: string;
    email: string;
    name: string;
    isSuperAdmin: boolean;
    tenantIds: string[];
    memberId?: string;
    roleId?: string;
    avatarUrl?: string;
  };
}

/**
 * Provisions a strictly isolated personal sandbox workspace for new user onboarding.
 * Prevents strangers and public testers from accessing existing company tenant data.
 */
export async function provisionIsolatedUserWorkspace(userId: string, email: string, name?: string) {
  // 1. If an explicit public demo tenant is designated in the environment, use it
  if (process.env.PUBLIC_DEMO_TENANT_ID) {
    const demoTenant = await globalPrisma.tenant.findUnique({
      where: { id: process.env.PUBLIC_DEMO_TENANT_ID }
    });
    if (demoTenant) {
      return await globalPrisma.tenantMember.create({
        data: {
          userId,
          tenantId: demoTenant.id,
          roleId: 'member',
          workEmail: email,
          firstName: name || email.split('@')[0]
        }
      });
    }
  }

  // 2. Otherwise auto-provision an isolated personal sandbox tenant
  const cleanEmail = email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'user';
  const uniqueCode = Math.random().toString(36).substring(2, 7);
  const subdomain = `ws-${cleanEmail.slice(0, 12)}-${uniqueCode}`;
  const workspaceTitle = `${name || email.split('@')[0]}'s Workspace`;

  console.log(`[Tenant Provisioning] Creating isolated personal workspace "${workspaceTitle}" (${subdomain}) for ${email}`);
  
  const newTenant = await globalPrisma.tenant.create({
    data: {
      name: workspaceTitle,
      subdomain,
      planTier: 'standard',
      status: 'active'
    }
  });

  await globalPrisma.workspace.create({
    data: {
      tenantId: newTenant.id,
      name: 'Default Workspace'
    }
  });

  return await globalPrisma.tenantMember.create({
    data: {
      userId,
      tenantId: newTenant.id,
      roleId: 'admin', // User is admin of their own sandbox
      workEmail: email,
      firstName: name || email.split('@')[0]
    }
  });
}

/**
 * Verifies the Supabase Access Token (JWT) and injects user session data.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1]?.trim() : '';

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  try {
    // 1. Verify the access token with Supabase Admin Client
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      if (error && (error.status === 0 || error.name === 'AuthRetryableFetchError' || error.message?.includes('fetch failed'))) {
        console.error('[Auth Middleware] Supabase auth service unreachable:', error.message || error);
        return res.status(503).json({ error: 'Authentication service temporarily unavailable' });
      }
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const supabaseUser = data.user;
    const { id: uid, email = '' } = supabaseUser;

    // 2. Look up user and memberships from DB
    let dbUser = await globalPrisma.user.findFirst({
      where: {
        OR: [
          { id: uid },
          ...(email ? [{ email }] : [])
        ]
      },
      include: {
        memberships: true
      }
    });

    // Auto-provision verified Supabase user if missing from Prisma registry
    if (!dbUser && email) {
      console.log(`[Auth Provisioning] Auto-provisioning verified Supabase user: ${email} (${uid})`);
      try {
        dbUser = await globalPrisma.user.create({
          data: {
            id: uid,
            email: email,
            isSuperAdmin: false,
          },
          include: { memberships: true }
        });

        // Auto-assign isolated personal sandbox tenant
        const userName = (supabaseUser as any).user_metadata?.full_name || '';
        const membership = await provisionIsolatedUserWorkspace(dbUser.id, email, userName);
        if (membership) {
          dbUser.memberships = [membership];
        }
      } catch (createErr: any) {
        console.error('[Auth Provisioning] User creation error:', createErr.message || createErr);
      }
    }

    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized: User not found in registry' });
    }

    let dbMemberships: any[] = dbUser.memberships || [];
    if (dbMemberships.length === 0) {
      dbMemberships = await globalPrisma.tenantMember.findMany({
        where: {
          OR: [
            { userId: dbUser.id },
            ...(email ? [{ user: { email } }] : [])
          ]
        }
      });
    }

    // If existing user has zero memberships and is not superadmin, ensure isolated workspace is provisioned
    const isSuperAdminUser = Boolean(
      dbUser.isSuperAdmin ?? 
      (supabaseUser as any).user_metadata?.isSuperAdmin
    );

    if (dbMemberships.length === 0 && !isSuperAdminUser) {
      try {
        const userName = (supabaseUser as any).user_metadata?.full_name || '';
        const membership = await provisionIsolatedUserWorkspace(dbUser.id, email, userName);
        if (membership) {
          dbMemberships = [membership];
        }
      } catch (provErr: any) {
        console.error('[Auth Provisioning] Sandbox provisioning error:', provErr.message || provErr);
      }
    }

    // Strictly derive verified tenant memberships from database - never trust x-tenant-id header
    const verifiedTenantIds = Array.from(new Set((dbMemberships || []).map(m => m.tenantId).filter(Boolean)));

    const membership = (dbMemberships || [])[0];
    const name = membership 
      ? `${membership.firstName || ''} ${membership.familyName || ''}`.trim() 
      : (supabaseUser as any).user_metadata?.full_name || email || 'User';

    const isSuperAdmin = Boolean(
      dbUser.isSuperAdmin ?? 
      (supabaseUser as any).user_metadata?.isSuperAdmin
    );

    const avatarUrl = membership?.avatarUrl || (supabaseUser as any).user_metadata?.avatar_url || (supabaseUser as any).user_metadata?.picture;

    req.user = {
      id: dbUser.id,
      uid: dbUser.id,
      email: dbUser.email,
      name: name,
      isSuperAdmin: isSuperAdmin,
      tenantIds: verifiedTenantIds,
      memberId: membership?.id || dbUser.id,
      roleId: membership?.roleId || (isSuperAdmin ? 'SUPERADMIN' : 'member'),
      avatarUrl: avatarUrl || undefined
    };

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Verification error:', error.message || error);
    res.status(401).json({ 
      error: 'Unauthorized: Token verification failed'
    });
  }
};

/**
 * Restricts access to SuperAdmins only.
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden: SuperAdmin access required' });
  }
  next();
};

/**
 * Restricts access to users with dashboard (tenant) membership.
 */
export const requireDashboardAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.tenantIds.length === 0 && !req.user.isSuperAdmin)) {
    return res.status(403).json({ error: 'Forbidden: No tenant membership found' });
  }
  next();
};

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { globalPrisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    isSuperAdmin: boolean;
    tenantIds: string[];
    roleId?: string;
  };
}

/**
 * Verifies the Supabase Access Token (JWT) and injects user session data.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify the access token with Supabase Admin Client
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !supabaseUser) {
      console.error('Supabase Auth error:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { id: uid, email } = supabaseUser;

    // 2. Fetch User and Memberships from Prisma
    let user = await globalPrisma.user.findUnique({
      where: { id: uid },
      include: { memberships: true }
    });

    // 3. Auto-provision User if they don't exist
    if (!user && email) {
      console.log(`[Auth] Provisioning new user: ${email} (${uid})`);
      user = await globalPrisma.user.create({
        data: {
          id: uid,
          email: email,
          isSuperAdmin: false,
        },
        include: { memberships: true }
      });
    }

    // 4. Ensure user has at least one tenant membership (Auto-onboarding)
    if (user && user.memberships.length === 0 && !user.isSuperAdmin) {
      console.log(`[Auth Sync] User ${user.email} exists but has no memberships. Finding default tenant...`);
      const defaultTenant = await globalPrisma.tenant.findFirst();
      
      if (defaultTenant) {
        console.log(`[Auth Sync] Default tenant hit: ${defaultTenant.name} (${defaultTenant.id})`);
        try {
          const membership = await globalPrisma.tenantMember.upsert({
            where: {
              userId_tenantId: {
                userId: user.id,
                tenantId: defaultTenant.id
              }
            },
            update: {}, // No changes if exists
            create: {
              userId: user.id,
              tenantId: defaultTenant.id,
              roleId: 'admin'
            }
          });
          console.log(`[Auth Sync] Successfully associated ${user.email} with ${defaultTenant.name}`);
          
          // Re-populate memberships to ensure req.user reflects the change
          user.memberships = [membership];
        } catch (dbErr) {
          console.error(`[Auth Sync] Failed to create or upsert TenantMember record for ${user.email}:`, dbErr);
        }
      } else {
        console.warn(`[Auth Sync] Global Registry is empty. No tenants found for auto-onboarding.`);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User synchronization failed' });
    }

    // 4. Inject Session Data
    const tenantIds = user.memberships.map(m => m.tenantId);
    console.log(`[Auth API] Session sync: user=${user.email} admin=${user.isSuperAdmin} tenants=[${tenantIds.join(',')}]`);

    req.user = {
      uid: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      tenantIds: tenantIds,
      roleId: user.memberships[0]?.roleId
    };

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Internal verify error' });
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

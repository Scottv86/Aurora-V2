import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { globalPrisma, getScopedPrisma, ScopedPrismaClient } from '../lib/prisma';

// Cache for dedicated tenant clients to avoid re-instantiation
const tenantClients: Record<string, PrismaClient> = {};

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    subdomain: string;
    db: ScopedPrismaClient;
    plan: string;
  };
}

export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. Identify Tenant (Priority: Header > Subdomain)
  let identifier = req.headers['x-tenant-id'] as string;

  if (!identifier) {
    const host = req.get('host') || '';
    const parts = host.split('.');
    if (parts.length >= 2) {
      identifier = parts[0];
    }
  }

  if (!identifier) {
    return res.status(400).json({ error: 'Tenant context missing' });
  }

  try {
    // 2. Resolve Tenant from Global Registry
    const tenant = await globalPrisma.tenant.findFirst({
      where: { 
        OR: [
          { id: identifier },
          { subdomain: identifier }
        ]
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant account suspended' });
    }

    // 3. Select Prisma Client (Hybrid Isolation with Driver Adapters)
    let baseClient = globalPrisma;

    if (tenant.dbConnectionString) {
      // Use Dedicated Database
      if (!tenantClients[tenant.id]) {
        // Prisma 7 requires explicit adapters for every new connection
        const pool = new Pool({ connectionString: tenant.dbConnectionString });
        const adapter = new PrismaPg(pool);
        tenantClients[tenant.id] = new PrismaClient({ adapter });
      }
      baseClient = tenantClients[tenant.id];
    }

    // 4. Inject Scoped Context (Mission-Critical RLS)
    req.tenant = {
      id: tenant.id,
      subdomain: tenant.subdomain,
      db: getScopedPrisma(tenant.id, baseClient),
      plan: tenant.planTier
    };

    next();
  } catch (error) {
    console.error('Tenant resolution failure:', error);
    res.status(500).json({ error: 'Internal multi-tenancy error' });
  }
};

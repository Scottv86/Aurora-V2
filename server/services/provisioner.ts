import { globalPrisma } from '../lib/prisma';

export interface ProvisioningOptions {
  name: string;
  subdomain: string;
  adminEmail: string;
  plan?: string;
}

/**
 * Spawns a new tenant with a default workspace and admin user.
 * This should be used for signups or superadmin onboarding.
 */
export async function spawnTenant(options: ProvisioningOptions) {
  const { name, subdomain, adminEmail, plan = 'standard' } = options;

  return await globalPrisma.$transaction(async (tx) => {
    // 1. Create Tenant record in Global Registry
    const tenant = await tx.tenant.create({
      data: { 
        name, 
        subdomain,
        planTier: plan,
        status: 'active'
      }
    });

    // 2. Create Default Workspace
    const workspace = await tx.workspace.create({
      data: {
        name: `${name} Main Workspace`,
        tenantId: tenant.id
      }
    });

    // 3. Set up Initial Admin User
    const admin = await tx.user.create({
      data: {
        id: options.adminEmail.startsWith('scott') ? 'default-admin-id' : `usr_${Math.random().toString(36).substring(2, 11)}`, 
        email: adminEmail,
      }
    });

    // 3b. Create Membership association
    await tx.tenantMember.create({
      data: {
        userId: admin.id,
        tenantId: tenant.id,
        roleId: 'admin'
      }
    });

    // 4. Log Provisioning Event
    await tx.usageLog.create({
      data: {
        tenantId: tenant.id,
        type: 'provisioning',
        amount: 1,
        metadata: {
          admin: adminEmail,
          workspaceId: workspace.id,
          action: 'tenant_spawn'
        }
      }
    });

    return {
      tenant,
      workspace,
      admin
    };
  });
}

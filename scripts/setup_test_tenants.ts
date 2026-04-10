import { globalPrisma as prisma } from '../server/lib/prisma';
import { supabaseAdmin } from '../server/lib/supabaseAdmin';

async function main() {
  console.log('Starting tenant and user setup...');

  // 1. Create Tenants
  const tenants = [
    { name: 'Acme Corp', subdomain: 'acme' },
    { name: 'Global Tech', subdomain: 'global' }
  ];

  const createdTenants: Record<string, any> = {};

  for (const t of tenants) {
    const existing = await prisma.tenant.findUnique({ where: { subdomain: t.subdomain } });
    if (existing) {
      console.log(`Tenant ${t.name} already exists.`);
      createdTenants[t.subdomain] = existing;
    } else {
      const created = await prisma.tenant.create({
        data: {
          name: t.name,
          subdomain: t.subdomain,
          planTier: 'enterprise',
          status: 'active'
        }
      });
      console.log(`Created tenant: ${created.name}`);
      createdTenants[t.subdomain] = created;
    }
  }

  // 2. Define Test Users
  const testUsers = [
    { email: 'admin@acme.com', password: 'Password123!', role: 'admin', tenantSubdomain: 'acme' },
    { email: 'staff@acme.com', password: 'Password123!', role: 'staff', tenantSubdomain: 'acme' },
    { email: 'admin@globaltech.com', password: 'Password123!', role: 'admin', tenantSubdomain: 'global' },
    { email: 'staff@globaltech.com', password: 'Password123!', role: 'staff', tenantSubdomain: 'global' }
  ];

  for (const tu of testUsers) {
    let authUser;
    
    // Check if user exists in Supabase
    const listResponse = await supabaseAdmin.auth.admin.listUsers();
    const users = listResponse.data?.users || [];
    const listError = listResponse.error;
    if (listError) {
      console.error('Error listing users:', listError);
      continue;
    }

    const existingAuthUser = users.find(u => u.email === tu.email);

    if (existingAuthUser) {
      console.log(`Supabase user ${tu.email} already exists.`);
      authUser = existingAuthUser;
    } else {
      console.log(`Creating Supabase user ${tu.email}...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true,
        user_metadata: {
          full_name: tu.email.split('@')[0]
        }
      });

      if (createError) {
        console.error(`Failed to create ${tu.email}:`, createError.message);
        continue;
      }
      if (!newUser?.user) {
        console.error(`Failed to create ${tu.email}: No user data returned`);
        continue;
      }
      authUser = newUser.user;
    }

    // Ensure User exists in Prisma
    let dbUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          isSuperAdmin: tu.email === 'admin@acme.com' // Just to keep previous behavior if expected
        }
      });
      console.log(`Created Prisma user: ${tu.email}`);
    }

    // Create Membership if it doesn't exist
    const tenant = createdTenants[tu.tenantSubdomain];
    
    const existingMembership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId: dbUser.id,
          tenantId: tenant.id
        }
      }
    });

    if (!existingMembership) {
      await prisma.tenantMember.create({
        data: {
          userId: dbUser.id,
          tenantId: tenant.id,
          roleId: tu.role
        }
      });
      console.log(`Associated ${tu.email} with ${tenant.name} as ${tu.role}`);
    } else {
      console.log(`${tu.email} is already associated with ${tenant.name}`);
    }
  }

  console.log('Setup complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

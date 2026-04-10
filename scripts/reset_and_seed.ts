import { globalPrisma as prisma } from '../server/lib/prisma';
import { supabaseAdmin } from '../server/lib/supabaseAdmin';

const COMMON_PASSWORD = 'TestPassword123!';

async function wipeAll() {
  console.log('--- Wiping existing data ---');

  // 1. Wipe Supabase Auth Users
  console.log('Cleaning Supabase Auth...');
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;

  console.log(`Found ${users.length} users in Auth.`);
  for (const user of users) {
    console.log(`Deleting auth user: ${user.email} (${user.id})`);
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delError) {
        console.error(`Failed to delete auth user ${user.email}:`, delError.message);
    }
  }

  // 2. Wipe DB Tables
  console.log('Cleaning Database tables via consolidated TRUNCATE CASCADE...');
  try {
      await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = 'true'`);
          
          const tables = [
            'records',
            'generated_documents',
            'document_templates',
            'modules',
            'workspaces',
            'usage_logs',
            'tenant_members',
            'users',
            'tenants'
          ];
          
          const truncateQuery = `TRUNCATE TABLE ${tables.map(t => `"${t}"`).join(', ')} CASCADE`;
          console.log('Executing:', truncateQuery);
          await tx.$executeRawUnsafe(truncateQuery);
      });
      console.log('Wipe complete.\n');
  } catch (err: any) {
      console.error('Error during database wipe:', JSON.stringify(err, null, 2));
      if (err.message) console.error('Message:', err.message);
      throw err;
  }
}

async function createTestData() {
  console.log('--- Creating test data ---');

  // 1. Create Tenants
  const tenants = [
    { name: 'Acme Corp', subdomain: 'acme' },
    { name: 'Global Tech', subdomain: 'global' }
  ];

  const dbTenants: any[] = [];
  // Use transaction for creation too
  await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = 'true'`);

      for (const t of tenants) {
        const created = await tx.tenant.create({
          data: {
            name: t.name,
            subdomain: t.subdomain,
            planTier: 'enterprise',
            status: 'active'
          }
        });
        console.log(`Created tenant: ${created.name}`);
        dbTenants.push(created);

        await tx.workspace.create({
          data: {
            tenantId: created.id,
            name: 'Main Workspace'
          }
        });
      }

      // 2. Define Users
      const userSpecs = [
        { email: 'superadmin@aurora.com', isSuper: true, tenantSubdomain: null },
        { email: 'user1.acme@aurora.com', isSuper: false, tenantSubdomain: 'acme' },
        { email: 'user2.acme@aurora.com', isSuper: false, tenantSubdomain: 'acme' },
        { email: 'user1.global@aurora.com', isSuper: false, tenantSubdomain: 'global' },
        { email: 'user2.global@aurora.com', isSuper: false, tenantSubdomain: 'global' }
      ];

      for (const spec of userSpecs) {
        console.log(`Creating user: ${spec.email}...`);
        
        const { data: authResult, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: spec.email,
          password: COMMON_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: spec.email.split('@')[0]
          }
        });

        if (createError) {
          console.error(`Failed to create auth user ${spec.email}:`, createError.message);
          continue;
        }

        const authUser = authResult.user;

        // Use upsert to handle cases where the trigger might have already inserted the user
        const dbUser = await tx.user.upsert({
          where: { id: authUser.id },
          create: {
            id: authUser.id,
            email: authUser.email!,
            isSuperAdmin: spec.isSuper
          },
          update: {
            isSuperAdmin: spec.isSuper
          }
        });

        if (spec.tenantSubdomain) {
          const tenant = dbTenants.find(t => t.subdomain === spec.tenantSubdomain);
          if (tenant) {
            await tx.tenantMember.create({
              data: {
                userId: dbUser.id,
                tenantId: tenant.id,
                roleId: 'admin'
              }
            });
            console.log(`  -> Linked to ${tenant.name}`);
          }
        } else if (spec.isSuper) {
           for(const tenant of dbTenants) {
              await tx.tenantMember.create({
                data: {
                    userId: dbUser.id,
                    tenantId: tenant.id,
                    roleId: 'super_admin'
                }
              });
           }
           console.log('  -> Linked to all tenants as Super Admin');
        }
      }
  });

  console.log('\n--- DATA SUMMARY ---');
  console.log('Password for all accounts:', COMMON_PASSWORD);
  console.log('Users:');
  console.log('- superadmin@aurora.com (Super Admin)');
  console.log('- user1.acme@aurora.com (Acme Corp)');
  console.log('- user2.acme@aurora.com (Acme Corp)');
  console.log('- user1.global@aurora.com (Global Tech)');
  console.log('- user2.global@aurora.com (Global Tech)');
}

async function main() {
  try {
    await wipeAll();
    await createTestData();
    console.log('\nSetup finished successfully!');
  } catch (error) {
    console.error('Fatal error during setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

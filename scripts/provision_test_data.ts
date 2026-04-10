import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { globalPrisma } from '../server/lib/prisma';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_PASSWORD = 'AuroraTest123!';

const USERS = [
  { email: 'superadmin@aurora.app', isSuperAdmin: true, tenant: null },
  { email: 'admin@acme.com', isSuperAdmin: false, tenant: { name: 'Acme Corp', subdomain: 'acme' } },
  { email: 'user@globex.com', isSuperAdmin: false, tenant: { name: 'Globex', subdomain: 'globex' } }
];

async function provision() {
  console.log('🚀 Starting Provisioning...');

  for (const userData of USERS) {
    console.log(`\n--- Processing ${userData.email} ---`);

    try {
      // 0. Preliminary Cleanup: Remove any existing user in Prisma with this email 
      // AND their memberships. This prevents unique constraint violations during 
      // Supabase sync and avoids foreign key errors.
      const existingPrismaUser = await globalPrisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingPrismaUser) {
        await globalPrisma.tenantMember.deleteMany({ where: { userId: existingPrismaUser.id } });
        await globalPrisma.user.delete({ where: { id: existingPrismaUser.id } });
        console.log(`ℹ️  Cleared legacy Prisma records and memberships for ${userData.email}`);
      }

      // 1. Create or Find Supabase Auth User
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: TEST_PASSWORD,
        email_confirm: true
      });

      let uid: string;

      if (authError) {
        if (authError.message.includes('already registered') || (authError as any).code === 'email_exists') {
          console.log(`ℹ️  User ${userData.email} already exists in Supabase. Fetching ID...`);
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list.users.find(u => u.email === userData.email);
          if (!existing) throw new Error('Could not find existing user');
          uid = existing.id;
        } else {
          throw authError;
        }
      } else {
        uid = authUser.user!.id;
      }

      console.log(`✅ Supabase UID: ${uid}`);

      // 2. Clear out any existing user with this email but different ID (to prevent sync conflicts)
      await globalPrisma.user.deleteMany({
        where: { 
          email: userData.email,
          NOT: { id: uid }
        }
      });

      // 3. Create/Update User record in Prisma
      const user = await globalPrisma.user.upsert({
        where: { id: uid },
        update: { 
          isSuperAdmin: userData.isSuperAdmin,
          email: userData.email 
        },
        create: {
          id: uid,
          email: userData.email,
          isSuperAdmin: userData.isSuperAdmin
        }
      });
      console.log(`✅ Prisma User record synchronized`);

      // 3. Handle Tenant
      if (userData.tenant) {
        const { name, subdomain } = userData.tenant;

        // Create Tenant
        const tenant = await globalPrisma.tenant.upsert({
          where: { subdomain },
          update: { name },
          create: { name, subdomain }
        });
        console.log(`✅ Tenant "${name}" (${subdomain}) created/updated`);

        // Create Workspace (if not exists)
        const workspaceName = `${name} Main Workspace`;
        const workspace = await globalPrisma.workspace.upsert({
          where: { id: `ws_${subdomain}` }, // Custom ID for predictability
          update: { name: workspaceName },
          create: {
            id: `ws_${subdomain}`,
            name: workspaceName,
            tenantId: tenant.id
          }
        });
        console.log(`✅ Workspace created/updated`);

        // Create Membership
        await globalPrisma.tenantMember.upsert({
          where: { 
            userId_tenantId: { userId: user.id, tenantId: tenant.id }
          },
          update: { roleId: 'admin' },
          create: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: 'admin'
          }
        });
        console.log(`✅ Membership established`);
      }

    } catch (err) {
      console.error(`❌ Error provisioning ${userData.email}:`, err);
    }
  }

  console.log('\n✨ Provisioning complete!');
  await globalPrisma.$disconnect();
}

provision();

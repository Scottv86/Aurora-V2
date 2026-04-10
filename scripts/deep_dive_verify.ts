import { globalPrisma as prisma } from '../server/lib/prisma';
import { supabaseAdmin } from '../server/lib/supabaseAdmin';

async function main() {
  console.log('--- Deep Dive Verification ---');
  
  // 1. Get all Supabase Auth Users
  const { data: { users: authUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  
  console.log(`Auth Users Count: ${authUsers.length}`);
  
  for (const au of authUsers) {
    console.log(`\nChecking Auth User: ${au.email} (${au.id})`);
    
    // 2. Find Prisma User
    const pu = await prisma.user.findUnique({
      where: { id: au.id },
      include: { memberships: true }
    });
    
    if (pu) {
      console.log(`  - Prisma Record: FOUND`);
      console.log(`  - isSuperAdmin: ${pu.isSuperAdmin}`);
      console.log(`  - Memberships: ${pu.memberships.length}`);
    } else {
      console.log(`  - Prisma Record: MISSING! (This is likely the issue)`);
      
      // Check if user exists by email instead
      const puByEmail = await prisma.user.findUnique({
        where: { email: au.email! }
      });
      if (puByEmail) {
        console.log(`  - Found by email with DIFFERENT ID: ${puByEmail.id}`);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

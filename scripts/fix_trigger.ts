import 'dotenv/config';
import { globalPrisma } from '../server/lib/prisma';

async function fixTrigger() {
  console.log('🛠️  Fixing Supabase sync trigger...');
  try {
    // 1. Drop existing trigger and function
    await globalPrisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`);
    await globalPrisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;`);
    console.log('✅ Dropped old trigger and function');

    // 2. Create corrected function
    // Note: We use lowercase 'users' and snake_case column names as per schema_v2.sql
    await globalPrisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.users (id, email, created_at, updated_at, is_superadmin)
        VALUES (new.id, new.email, now(), now(), false)
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ Created corrected function');

    // 3. Re-create trigger
    await globalPrisma.$executeRawUnsafe(`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('✅ Re-created trigger');

  } catch (err) {
    console.error('❌ Error fixing trigger:', err);
  } finally {
    await globalPrisma.$disconnect();
  }
}

fixTrigger();

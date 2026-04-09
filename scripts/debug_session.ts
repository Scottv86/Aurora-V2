import { globalPrisma, getScopedPrisma } from '../server/lib/prisma';
import 'dotenv/config';

async function debugSession() {
  const db = getScopedPrisma('my-tenant', 'my-user', false);
  
  // We use executeRaw to check the current settings
  const settings = await db.$queryRaw`
    SELECT 
      current_setting('app.current_tenant_id', true) as tenant,
      current_setting('app.current_user_id', true) as user,
      current_setting('app.is_superadmin', true) as superadmin
  `;
  
  console.log('--- SESSION SETTINGS ---');
  console.table(settings);
}

debugSession().catch(console.error);

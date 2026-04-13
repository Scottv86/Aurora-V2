import { getScopedPrisma } from '../server/lib/prisma';

async function main() {
  const tenantId = 'cmnsdi0eq00008on3rhqw2z7m'; // Acme Corp
  const userId = '0a1369c3-48bd-49e7-b559-e91c9d2301cb'; // REAL user ID
  const teamId = 'cmntukn5b00004on3dulsniea';

  console.log(`--- Repro 404 (with RLS) ---`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`User ID: ${userId}`);

  const db = getScopedPrisma(tenantId, userId, false); // Real session scope

  try {
    const team = await db.team.findFirst({
      where: { id: teamId }
    });

    if (team) {
      console.log('SUCCESS: Team found!', team.name);
    } else {
      console.log('FAILURE: Team not found with scoped client.');
    }
    
    // Test direct global client
    const { globalPrisma } = await import('../server/lib/prisma');
    const directTeam = await globalPrisma.team.findUnique({ where: { id: teamId } });
    console.log('Direct Global Client result:', directTeam ? 'FOUND' : 'NOT FOUND');

  } catch (err) {
    console.error('Error during repro:', err);
  }
}

main();

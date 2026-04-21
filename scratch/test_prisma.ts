import { globalPrisma, getScopedPrisma } from '../server/lib/prisma';

async function test() {
  try {
    const tenantId = 'cmnx01q3s0000mon3pbr44ju4'; // Use the ID from the logs
    const userId = 'test-user';
    const scopedDb = getScopedPrisma(tenantId, userId);

    const team = await scopedDb.team.findFirst();
    if (!team) {
      console.log('No team found');
      return;
    }

    console.log('Found team:', team.id);
    
    // Attempting a update using the scoped client
    const updated = await scopedDb.team.update({
      where: { id: team.id },
      data: {
        name: team.name + ' (Updated)'
      }
    });
    
    console.log('Update successful:', updated.name);
  } catch (err: any) {
    console.error('Update failed with error:', err.message);
    if (err.clientVersion) console.log('Client version:', err.clientVersion);
  } finally {
    await globalPrisma.$disconnect();
  }
}

test();

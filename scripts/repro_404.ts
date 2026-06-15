import { getScopedPrisma } from '../server/lib/prisma';

async function main() {
  const tenantId = 'cmnx01q3s0000mon3pbr44ju4'; 
  const userId = 'd23a087e-a868-4c28-b85f-69080a46a530'; 
  const recordId = 'cmop73ulw0001j8n3vrgt45xh';

  console.log(`--- Repro 404 (with RLS) ---`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Record ID: ${recordId}`);

  const db = getScopedPrisma(tenantId, userId, false); 

  try {
    const record = await db.record.findUnique({
      where: { id: recordId }
    });

    if (record) {
      console.log('SUCCESS: Record found!', record.id);
    } else {
      console.log('FAILURE: Record not found with scoped client.');
    }
    
    // Test direct global client
    const { globalPrisma } = await import('../server/lib/prisma');
    const directRecord = await globalPrisma.record.findUnique({ where: { id: recordId } });
    console.log('Direct Global Client result:', directRecord ? 'FOUND' : 'NOT FOUND');

  } catch (err) {
    console.error('Error during repro:', err);
  }
}

main();

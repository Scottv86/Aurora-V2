import { PrismaClient } from '@prisma/client';

async function testPartyQuery() {
    const db = new PrismaClient();
    const tenantId = 'cmnx01q3s0000mon3pbr44ju4';

    try {
        console.log('Testing Party query via Prisma (with RLS mock)...');
        
        // Mocking the RLS context for the transaction
        const records = await db.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
            await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = 'mock-user'`);
            
            return await tx.party.findMany({
                include: { person: true, organization: true },
                take: 5
            });
        });

        console.log('Found parties:', records.length);
        records.forEach((p: any) => {
            const name = p.partyType === 'PERSON' 
                ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
                : p.organization?.legalName || 'Unknown Org';
            console.log(` - ${name} (${p.partyType})`);
        });

        console.log('SUCCESS: Database query for platform module is working.');
    } catch (err: any) {
        console.error('FAILED:', err.message);
    } finally {
        await db.$disconnect();
    }
}

testPartyQuery();

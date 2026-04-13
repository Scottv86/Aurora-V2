import { getScopedPrisma } from '../server/lib/prisma';

async function testScopedUpdate() {
  const memberId = 'cmnstgaen000584n3ibu7p9m8'; 
  const tenantId = 'cmnsdi0eq00008on3rhqw2z7m'; 

  console.log(`Testing SCOPED update for member ${memberId} in tenant ${tenantId}...`);
  
  try {
    const db = await getScopedPrisma(tenantId);
    
    // Test fetch
    const member = await db.tenantMember.findFirst({
      where: { id: memberId }
    });
    
    if (!member) {
      console.error("Member not found via scoped client! This means RLS or tenantId mismatch.");
      return;
    }
    
    console.log("Current data (scoped):", {
      firstName: member.firstName,
      familyName: member.familyName
    });
    
    // Test update
    const updated = await db.tenantMember.update({
      where: { id: memberId },
      data: {
        firstName: 'John-Scoped',
        familyName: 'Doe-Scoped'
      }
    });
    
    console.log("Scoped update returned success:", {
      firstName: updated.firstName,
      familyName: updated.familyName
    });
    
    const doubleCheck = await db.tenantMember.findFirst({
      where: { id: memberId }
    });
    
    console.log("Double check after scoped fetch:", {
      firstName: doubleCheck?.firstName,
      familyName: doubleCheck?.familyName
    });
    
  } catch (err: any) {
    console.error("Scoped update failed:", err.message);
  } finally {
    process.exit();
  }
}

testScopedUpdate();

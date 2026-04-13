import { globalPrisma } from '../server/lib/prisma';

async function testUpdate() {
  const memberId = 'cmnstgaen000584n3ibu7p9m8'; // Re-read from screenshot (cmnstgaen000584n3ibu7p9m8)
  // ...

  console.log(`Testing update for member ${memberId}...`);
  
  try {
    const member = await globalPrisma.tenantMember.findUnique({
      where: { id: memberId }
    });
    
    if (!member) {
      console.error("Member not found in globalPrisma check!");
      return;
    }
    
    console.log("Current data:", {
      firstName: member.firstName,
      familyName: member.familyName
    });
    
    const updated = await globalPrisma.tenantMember.update({
      where: { id: memberId },
      data: {
        firstName: 'John',
        familyName: 'Doe'
      }
    });
    
    console.log("Update successful:", {
      firstName: updated.firstName,
      familyName: updated.familyName
    });
    
    const doubleCheck = await globalPrisma.tenantMember.findUnique({
      where: { id: memberId }
    });
    
    console.log("Double check after fetch:", {
      firstName: doubleCheck?.firstName,
      familyName: doubleCheck?.familyName
    });
    
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    process.exit();
  }
}

testUpdate();

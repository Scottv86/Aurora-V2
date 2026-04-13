import { globalPrisma as prisma } from '../server/lib/prisma';

async function main() {
  const email = 'user1.acme@aurora.com';
  
  console.log(`Searching for user with email: ${email}`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true }
  });

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  const membership = user.memberships[0];
  if (!membership) {
    console.error('No tenant membership found for this user');
    process.exit(1);
  }

  console.log(`Found membership ID: ${membership.id}. Updating license to 'Developer'...`);

  const updated = await prisma.tenantMember.update({
    where: { id: membership.id },
    data: { licenceType: 'Developer' }
  });

  console.log('Update result:', JSON.stringify(updated, null, 2));
  console.log('Successfully assigned Developer seat to user1.acme@aurora.com');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { globalPrisma } from '../server/lib/prisma';

async function main() {
  const users = await globalPrisma.user.findMany({
    include: {
      memberships: {
        include: {
          tenant: true
        }
      }
    }
  });

  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error);

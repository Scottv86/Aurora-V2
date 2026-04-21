import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to DB...");
    await prisma.$connect();
    console.log("Connected.");

    console.log("Querying parties...");
    const parties = await prisma.party.findMany({
      include: {
        person: true,
        organization: true
      }
    });
    console.log("Success! Found", parties.length, "parties.");
  } catch (err) {
    console.error("DB Query Failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { globalPrisma } from '../server/lib/prisma';

async function main() {
    try {
        const users = await globalPrisma.user.findMany({
            take: 5,
            select: {
                email: true,
                isSuperAdmin: true,
                memberships: {
                    select: {
                        tenant: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

main();

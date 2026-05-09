import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tenants = await prisma.tenant.findMany();
    const users = await prisma.user.findMany();
    const memberships = await prisma.tenantMember.findMany();
    const positions = await prisma.position.findMany();
    const teams = await prisma.team.findMany();

    console.log('--- TENANTS ---');
    console.log(JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name })), null, 2));
    
    console.log('\n--- USERS ---');
    console.log(JSON.stringify(users.map(u => ({ id: u.id, email: u.email })), null, 2));
    
    console.log('\n--- MEMBERSHIPS ---');
    console.log(JSON.stringify(memberships.map(m => ({ id: m.id, userId: m.userId, teamId: m.teamId, positionId: m.positionId })), null, 2));

    console.log('\n--- POSITIONS ---');
    console.log(JSON.stringify(positions.map(p => ({ id: p.id, title: p.title })), null, 2));

    console.log('\n--- TEAMS ---');
    console.log(JSON.stringify(teams.map(t => ({ id: t.id, name: t.name })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('--- SEEDING PERMISSION GROUPS ---');
  
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('No tenant found. Deployment might be empty.');
    return;
  }
  
  console.log(`Target Tenant: ${tenant.name} (${tenant.id})`);

  const groups = [
    {
      name: 'ReadOnly Viewer',
      description: 'Can view all information but cannot make changes.',
      capabilities: [
        'view:staff', 'view:teams', 'view:positions', 'view:audit_logs', 'view:modules'
      ]
    },
    {
      name: 'Department Manager',
      description: 'Can manage staff and teams. Full visibility across the department.',
      capabilities: [
        'view:staff', 'manage:staff', 'invite:staff', 
        'view:teams', 'manage:teams',
        'view:positions', 'view:audit_logs'
      ]
    },
    {
      name: 'Platform Administrator',
      description: 'Full un-restricted access to the entire platform and all modules.',
      capabilities: ['*:*']
    }
  ];

  for (const g of groups) {
    const existing = await prisma.permissionGroup.findFirst({
      where: { 
        tenantId: tenant.id,
        name: g.name
      }
    });

    if (existing) {
      console.log(`Group already exists: ${g.name}`);
      continue;
    }

    await prisma.permissionGroup.create({
      data: {
        ...g,
        tenantId: tenant.id
      }
    });
    console.log(`Created group: ${g.name}`);
  }

  console.log('--- SEEDING COMPLETE ---');
}

seed()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

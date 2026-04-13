import { firebaseAdmin } from '../server/lib/firebaseAdmin';
import { globalPrisma } from '../server/lib/prisma';
import crypto from 'crypto';

async function migrate() {
  console.log('Starting Migration from Firestore to PostgreSQL (Prisma)...');
  const db = firebaseAdmin.firestore();

  // 1. Fetch all tenants
  const tenantsSnap = await db.collection('tenants').get();
  console.log(`Found ${tenantsSnap.size} tenants.`);

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const tenantData = tenantDoc.data();
    
    console.log(`\n--- Migrating Tenant: ${tenantData.name} (${tenantId}) ---`);

    // Ensure tenant exists in Prisma
    let tenant = await globalPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      tenant = await globalPrisma.tenant.create({
        data: {
          id: tenantId,
          name: tenantData.name || 'Unknown Tenant',
          subdomain: tenantData.slug || crypto.randomUUID(),
          status: tenantData.status || 'active',
        }
      });
      console.log(`  Created Tenant: ${tenant.id}`);
    } else {
      console.log(`  Tenant already exists: ${tenant.id}`);
    }

    // Ensure a default workspace exists for the tenant
    let defaultWorkspace = await globalPrisma.workspace.findFirst({
        where: { tenantId }
    });
    
    if (!defaultWorkspace) {
        defaultWorkspace = await globalPrisma.workspace.create({
            data: {
                tenantId: tenantId,
                name: 'Default Workspace'
            }
        });
    }

    // 2. Fetch Modules for this tenant
    const modulesRef = db.collection(`tenants/${tenantId}/modules`);
    const modulesSnap = await modulesRef.get();
    console.log(`  Found ${modulesSnap.size} modules.`);

    for (const moduleDoc of modulesSnap.docs) {
      const moduleId = moduleDoc.id;
      const moduleData = moduleDoc.data();

      let prismaModule = await globalPrisma.module.findFirst({
         where: { tenantId, name: moduleData.name }
      });
      
      if (!prismaModule) {
        prismaModule = await globalPrisma.module.create({
          data: {
            id: moduleId,
            tenantId,
            workspaceId: defaultWorkspace.id,
            name: moduleData.name || 'Untitled Module',
            config: moduleData as any
          }
        });
        console.log(`    Created Module: ${prismaModule.name} (${prismaModule.id})`);
      }

      // 3. Fetch Cases/Records for this module (or for this tenant if global)
      // Firestore structure has cases under tenants/{tenantId}/cases
    }

    const casesRef = db.collection(`tenants/${tenantId}/cases`);
    const casesSnap = await casesRef.get();
    console.log(`  Found ${casesSnap.size} cases (records).`);

    let recordsCreated = 0;
    for (const caseDoc of casesSnap.docs) {
        const caseId = caseDoc.id;
        const caseData = caseDoc.data();

        // Check if it already exists
        const existingRecord = await globalPrisma.record.findUnique({
             where: { id: caseId }
        });

        if (!existingRecord && caseData.moduleId) {
            // Verify the module exists
            const prismaModule = await globalPrisma.module.findUnique({
                where: { id: caseData.moduleId }
            });

            if (prismaModule) {
                await globalPrisma.record.create({
                    data: {
                        id: caseId,
                        tenantId,
                        moduleId: caseData.moduleId,
                        status: caseData.status || 'active',
                        data: caseData as any,
                        createdAt: caseData.submittedAt ? caseData.submittedAt.toDate() : new Date(),
                        updatedAt: caseData.updatedAt ? caseData.updatedAt.toDate() : new Date()
                    }
                });
                recordsCreated++;
            } else {
                console.log(`    Warning: Record ${caseId} references non-existent Module ${caseData.moduleId}`);
            }
        }
    }
    console.log(`  Created ${recordsCreated} records.`);
  }

  console.log('\nMigration Completed Successfully.');
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await globalPrisma.$disconnect();
  });

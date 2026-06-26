import { globalPrisma } from './server/lib/prisma';
import { AutomationEngine } from './server/services/automationEngine';

async function runTests() {
  console.log('🏁 Starting Automation Integration Tests...');
  let passedCount = 0;
  let failedCount = 0;

  // Track created IDs for cleanup
  let tenantId = '';
  let workspaceId = '';
  let moduleAId = '';
  let moduleBId = '';
  let automation1Id = '';
  let automation2Id = '';
  const createdRecordIds: string[] = [];

  try {
    // 1. Find or create a test tenant
    let tenant = await globalPrisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating one...');
      tenant = await globalPrisma.tenant.create({
        data: {
          name: 'Automation Test Tenant',
          subdomain: 'autotest',
          status: 'active',
          planTier: 'standard'
        }
      });
    }
    tenantId = tenant.id;
    console.log(`✅ Using Tenant: ${tenant.name} (${tenantId})`);

    // 2. Find or create a workspace
    let workspace = await globalPrisma.workspace.findFirst({
      where: { tenantId }
    });
    if (!workspace) {
      console.log('No workspace found. Creating one...');
      workspace = await globalPrisma.workspace.create({
        data: {
          tenantId,
          name: 'Automation Test Workspace'
        }
      });
    }
    workspaceId = workspace.id;
    console.log(`✅ Using Workspace: ${workspace.name} (${workspaceId})`);

    // 3. Create Module A (Leads)
    const moduleA = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Test Leads Module',
        config: {
          layout: [
            { id: 'leadName', type: 'text', label: 'Lead Name' },
            { id: 'leadEmail', type: 'text', label: 'Lead Email' },
            { id: 'budget', type: 'number', label: 'Budget' }
          ]
        }
      }
    });
    moduleAId = moduleA.id;
    console.log(`✅ Created Module A: ${moduleA.name} (${moduleAId})`);

    // 4. Create Module B (Tasks)
    const moduleB = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Test Tasks Module',
        config: {
          layout: [
            { id: 'taskName', type: 'text', label: 'Task Name' },
            { id: 'priority', type: 'text', label: 'Priority' }
          ]
        }
      }
    });
    moduleBId = moduleB.id;
    console.log(`✅ Created Module B: ${moduleB.name} (${moduleBId})`);

    // 5. Create Trigger-based Automation Rule on Module A
    // Trigger when record created, budget > 10000
    // Actions: 
    // 1. Create a task in Module B
    // 2. Send email
    const automation1 = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: moduleAId,
        name: 'High Value Lead Task Spawn',
        description: 'Auto-spawns a task and sends welcome email for leads with budget > 10000',
        isActive: true,
        inputs: {},
        conditions: 'budget > 10000',
        triggers: [
          {
            type: 'MODULE_EVENT',
            on: 'RECORD_CREATED',
            moduleId: moduleAId
          }
        ],
        actions: [
          {
            type: 'CREATE_RECORD',
            config: {
              targetModuleId: moduleBId,
              fields: {
                taskName: 'Follow up with high value lead: {{ trigger.record.leadName }}',
                priority: 'High'
              }
            }
          },
          {
            type: 'SEND_EMAIL',
            config: {
              to: '{{ trigger.record.leadEmail }}',
              subject: 'High Value Alert: {{ trigger.record.leadName }}',
              body: 'Lead {{ trigger.record.leadName }} has a budget of {{ trigger.record.budget }}!'
            }
          }
        ]
      }
    });
    automation1Id = automation1.id;
    console.log(`✅ Created Automation Rule 1: ${automation1.name} (${automation1Id})`);

    // --- TEST CASE 1: Low budget lead (should NOT trigger actions) ---
    console.log('\n--- Test Case 1: Low Budget Lead (budget = 5000) ---');
    const lead1Data = { leadName: 'Low Value Joe', leadEmail: 'joe@example.com', budget: 5000 };
    
    const record1 = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId: moduleAId,
        data: lead1Data,
        status: 'New'
      }
    });
    createdRecordIds.push(record1.id);
    console.log(`Created Lead Record: "${record1.id}"`);

    // Evaluate automation manually for testing (simulating DB trigger hook)
    await AutomationEngine.handleEvent({
      type: 'RECORD_CREATED',
      tenantId,
      moduleId: moduleAId,
      record: { id: record1.id, ...lead1Data }
    }, globalPrisma);

    // Wait a brief moment for async tasks to run
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify no task was created in Module B
    const tasksCount1 = await globalPrisma.record.count({
      where: { moduleId: moduleBId }
    });

    // Verify no AutomationRuns logs exist
    const runsCount1 = await globalPrisma.automationRun.count({
      where: { automationId: automation1Id }
    });

    if (tasksCount1 === 0 && runsCount1 === 0) {
      passedCount++;
      console.log('✅ TEST CASE 1 PASSED: Low budget lead correctly skipped.');
    } else {
      failedCount++;
      console.error(`❌ TEST CASE 1 FAILED: Tasks: ${tasksCount1}, Runs: ${runsCount1}`);
    }

    // --- TEST CASE 2: High budget lead (should trigger actions) ---
    console.log('\n--- Test Case 2: High Budget Lead (budget = 25000) ---');
    const lead2Data = { leadName: 'High Value John', leadEmail: 'john@example.com', budget: 25000 };

    const record2 = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId: moduleAId,
        data: lead2Data,
        status: 'New'
      }
    });
    createdRecordIds.push(record2.id);
    console.log(`Created Lead Record: "${record2.id}"`);

    // Evaluate automation trigger
    await AutomationEngine.handleEvent({
      type: 'RECORD_CREATED',
      tenantId,
      moduleId: moduleAId,
      record: { id: record2.id, ...lead2Data }
    }, globalPrisma);

    // Wait for async execution pipeline to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify task record was created in Module B
    const tasksModuleB = await globalPrisma.record.findMany({
      where: { moduleId: moduleBId }
    });

    // Verify run logs
    const runsList = await globalPrisma.automationRun.findMany({
      where: { automationId: automation1Id }
    });

    let tc2Passed = false;
    if (tasksModuleB.length === 1 && runsList.length === 1) {
      const spawnedTask = tasksModuleB[0];
      const runLog = runsList[0];
      createdRecordIds.push(spawnedTask.id);

      const data = spawnedTask.data as any;
      
      console.log(`Spawned Task ID: "${spawnedTask.id}"`);
      console.log(`Spawned Task Title: "${data?.taskName}"`);
      console.log(`Run Log Status: "${runLog.status}"`);

      if (
        data?.taskName === 'Follow up with high value lead: High Value John' &&
        data?.priority === 'High' &&
        runLog.status === 'SUCCESS'
      ) {
        tc2Passed = true;
      }
    }

    if (tc2Passed) {
      passedCount++;
      console.log('✅ TEST CASE 2 PASSED: High budget lead successfully triggered actions & variables interpolated.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 2 FAILED: Automation actions were not properly executed.');
    }

    // --- TEST CASE 3: Quick Action Button Trigger (Manual Update) ---
    console.log('\n--- Test Case 3: Quick Action Manual Trigger (Update Record status to Qualified) ---');
    
    // Create Quick Action Automation
    const automation2 = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: moduleAId,
        name: 'Manual Qualify Action',
        isActive: true,
        triggers: [{ type: 'QUICK_ACTION' }],
        actions: [
          {
            type: 'UPDATE_RECORD',
            config: {
              targetType: 'TRIGGERING',
              fields: {
                status: 'Qualified'
              }
            }
          }
        ]
      }
    });
    automation2Id = automation2.id;

    console.log(`Triggering manual Quick Action for record "${record2.id}"...`);
    await AutomationEngine.runPipeline(automation2, record2, {}, 'QUICK_ACTION', globalPrisma);

    // Fetch updated record from database
    const updatedRecord2 = await globalPrisma.record.findUnique({
      where: { id: record2.id }
    });

    const runLogs2 = await globalPrisma.automationRun.findMany({
      where: { automationId: automation2Id }
    });

    if (updatedRecord2?.data && (updatedRecord2.data as any).status === 'Qualified' && runLogs2[0]?.status === 'SUCCESS') {
      passedCount++;
      console.log('✅ TEST CASE 3 PASSED: Quick Action automation correctly updated triggering record.');
    } else {
      failedCount++;
      console.error(`❌ TEST CASE 3 FAILED: Record: ${JSON.stringify(updatedRecord2?.data)}, Runs: ${runLogs2.length}`);
    }

  } catch (error) {
    console.error('❌ Test execution crashed:', error);
    failedCount++;
  } finally {
    // 8. Clean up all resources created during testing
    console.log('\n🧹 Cleaning up test resources...');
    try {
      for (const rId of createdRecordIds) {
        await globalPrisma.record.deleteMany({ where: { id: rId } });
      }
      if (automation1Id) await globalPrisma.automation.deleteMany({ where: { id: automation1Id } });
      if (automation2Id) await globalPrisma.automation.deleteMany({ where: { id: automation2Id } });
      if (moduleAId) await globalPrisma.module.deleteMany({ where: { id: moduleAId } });
      if (moduleBId) await globalPrisma.module.deleteMany({ where: { id: moduleBId } });
      console.log('🧹 Cleanup complete.');
    } catch (cleanErr) {
      console.error('Error during cleanup:', cleanErr);
    }

    await globalPrisma.$disconnect();
    
    console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 Integration tests completed successfully!');
    }
  }
}

runTests();

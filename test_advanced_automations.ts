import { globalPrisma } from './server/lib/prisma';
import { AutomationEngine } from './server/services/automationEngine';
import { AutomationScheduler } from './server/services/scheduler';
import publicRouter from './server/routes/publicRoutes';

async function run() {
  console.log('🏁 Starting Advanced Automations Integration Tests...');
  let passedCount = 0;
  let failedCount = 0;

  let tenantId = '';
  let workspaceId = '';
  let moduleId = '';
  let automation1Id = '';
  let automation2Id = '';
  let recordId = '';

  try {
    // 1. Find or create a test tenant
    let tenant = await globalPrisma.tenant.findFirst();
    if (!tenant) {
      tenant = await globalPrisma.tenant.create({
        data: {
          name: 'Test Tenant',
          subdomain: 'test',
          status: 'active',
          planTier: 'standard'
        }
      });
    }
    tenantId = tenant.id;

    // 2. Find or create a workspace
    let workspace = await globalPrisma.workspace.findFirst({
      where: { tenantId }
    });
    if (!workspace) {
      workspace = await globalPrisma.workspace.create({
        data: {
          tenantId,
          name: 'Test Workspace'
        }
      });
    }
    workspaceId = workspace.id;

    // 3. Create a test module
    const testModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Advanced Automation Test Module',
        config: { layout: [] }
      }
    });
    moduleId = testModule.id;

    // --- TEST CASE 1: Cron Expression Evaluator ---
    console.log('\n--- Test Case 1: Cron Expression Evaluator ---');
    const mondayNoon = new Date('2026-06-29T12:00:00'); // Monday (29th June 2026)
    
    const cron1 = '*/5 * * * *'; // Every 5 minutes
    const cron2 = '0 12 * * 1';  // Noon on Mondays
    const cron3 = '0 12 * * 2';  // Noon on Tuesdays (should be false)

    const match1 = AutomationScheduler.matchesCron(cron1, mondayNoon);
    const match2 = AutomationScheduler.matchesCron(cron2, mondayNoon);
    const match3 = AutomationScheduler.matchesCron(cron3, mondayNoon);

    console.log(`"*/5 * * * *" on Mon 12:00: Match = ${match1} (Expected: true)`);
    console.log(`"0 12 * * 1" on Mon 12:00: Match = ${match2} (Expected: true)`);
    console.log(`"0 12 * * 2" on Mon 12:00: Match = ${match3} (Expected: false)`);

    if (match1 && match2 && !match3) {
      passedCount++;
      console.log('✅ TEST CASE 1 PASSED');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 1 FAILED');
    }

    // --- TEST CASE 2: Logical Branching & Loop Execution ---
    console.log('\n--- Test Case 2: Logical Branching (If/Else, Loops, Delay) ---');
    
    // Define an automation with If/Else condition and Loops
    const actions = [
      {
        type: 'IF_CONDITION',
        config: {
          condition: 'score > 80',
          thenSteps: [
            {
              type: 'SEND_INTERNAL_PING',
              config: { message: 'High score detected!', channel: 'alerts' }
            }
          ],
          elseSteps: [
            {
              type: 'SEND_INTERNAL_PING',
              config: { message: 'Regular score.', channel: 'general' }
            }
          ]
        }
      },
      {
        type: 'DELAY',
        config: { delaySeconds: '1' }
      },
      {
        type: 'LOOP_FOREACH',
        config: {
          arrayPath: 'trigger.record.items',
          loopSteps: [
            {
              type: 'SEND_INTERNAL_PING',
              config: { message: 'Processing item: {{ loop.item.name }}', channel: 'loop' }
            }
          ]
        }
      }
    ];

    const automation1 = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId,
        name: 'Logic and Loops Automation',
        triggers: [{ type: 'MODULE_EVENT', on: 'RECORD_CREATED' }],
        isActive: true,
        actions: actions as any
      }
    });
    automation1Id = automation1.id;

    // Run the pipeline using mock record
    const mockRecord = {
      id: 'mock-rec-1',
      score: 95,
      items: [
        { name: 'Item A' },
        { name: 'Item B' }
      ]
    };

    console.log('Running branching pipeline...');
    await AutomationEngine.runPipeline(automation1, mockRecord, {}, 'TEST_CASE', globalPrisma);

    // Verify run logs
    const runs = await globalPrisma.automationRun.findMany({
      where: { automationId: automation1Id }
    });
    console.log(`Runs logged in DB: ${runs.length}`);
    const run = runs[0];
    console.log(`Run status: ${run.status}`);
    
    const logs = run.stepLogs as any[];
    console.log(`Step 1 (IF_CONDITION) Output:`, JSON.stringify(logs[0], null, 2));
    console.log(`Step 2 (DELAY) Output:`, JSON.stringify(logs[1], null, 2));
    console.log(`Step 3 (LOOP_FOREACH) Output:`, JSON.stringify(logs[2], null, 2));

    if (
      run.status === 'SUCCESS' &&
      logs[0].output?.conditionMatched === true &&
      logs[1].output?.sleptSeconds === 1 &&
      logs[2].output?.loopResults?.length === 2 &&
      logs[2].output?.loopResults[0].nestedLogs[0].output.message.includes('Item A')
    ) {
      passedCount++;
      console.log('✅ TEST CASE 2 PASSED: Logical condition split and loops executed correctly with parameter resolution.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 2 FAILED');
    }

    // --- TEST CASE 3: Inbound Webhook API Trigger ---
    console.log('\n--- Test Case 3: Public Webhook API Endpoint Trigger ---');

    const automation2 = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId,
        name: 'Inbound Webhook Automation',
        triggers: [{ type: 'INBOUND_WEBHOOK' }],
        isActive: true,
        actions: [
          {
            type: 'SEND_INTERNAL_PING',
            config: { message: 'Webhook payload received: {{ inputs.event_name }}', channel: 'webhook' }
          }
        ] as any
      }
    });
    automation2Id = automation2.id;

    // Locate endpoint handler inside express router stack
    const webhookRoute = publicRouter.stack.find(s => s.route?.path === '/webhooks/:automationId');
    if (!webhookRoute) throw new Error('Webhook trigger endpoint route not found in publicRoutes.ts');
    
    const routeHandler = webhookRoute.route.stack[0].handle;

    // Call public webhook route handler with mock payload
    const mockReq = {
      params: { automationId: automation2Id },
      body: { event_name: 'payment_checkout_success' }
    } as any;

    let resCode = 0;
    let resBody: any = null;
    const mockRes = {
      status(code: number) { resCode = code; return this; },
      json(data: any) { resBody = data; return this; }
    } as any;

    console.log('Invoking Webhook Router Handler...');
    await routeHandler(mockReq, mockRes);
    console.log(`Response HTTP Status: ${resCode}`);
    console.log(`Response Body:`, resBody);

    // Wait a brief moment for background execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify webhook automation run was logged
    const webhookRuns = await globalPrisma.automationRun.findMany({
      where: { automationId: automation2Id }
    });
    console.log(`Webhook Runs Logged: ${webhookRuns.length}`);
    const wRun = webhookRuns[0];
    console.log(`Webhook Run status: ${wRun?.status}`);
    console.log(`Webhook Step Output:`, JSON.stringify(wRun?.stepLogs, null, 2));

    if (
      resCode === 202 &&
      wRun?.status === 'SUCCESS' &&
      (wRun?.stepLogs as any[])[0].output.message.includes('payment_checkout_success')
    ) {
      passedCount++;
      console.log('✅ TEST CASE 3 PASSED: Public webhook routed successfully to target pipeline.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 3 FAILED');
    }

  } catch (err) {
    console.error('❌ Integration tests crashed:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up test database records...');
    if (automation1Id) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: automation1Id } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: automation1Id } }).catch(() => {});
    }
    if (automation2Id) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: automation2Id } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: automation2Id } }).catch(() => {});
    }
    if (moduleId) {
      await globalPrisma.module.delete({ where: { id: moduleId } }).catch(() => {});
    }
    await globalPrisma.$disconnect();

    console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All advanced automation tests completed successfully!');
    }
  }
}

run();

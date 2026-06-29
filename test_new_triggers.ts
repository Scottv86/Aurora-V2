import { globalPrisma } from './server/lib/prisma';
import { AutomationEngine } from './server/services/automationEngine';
import publicRouter from './server/routes/publicRoutes';
import dataRouter from './server/routes/dataRoutes';

async function run() {
  console.log('🏁 Starting Advanced Automation Triggers & Triage Integration Tests...');
  let passedCount = 0;
  let failedCount = 0;

  let tenantId = '';
  let workspaceId = '';
  let triageModuleId = '';
  let targetModuleId = '';
  let triageAutomationId = '';
  let statusAutomationId = '';
  let assigneeAutomationId = '';
  let mentionAutomationId = '';
  let triageRecordId = '';
  let targetRecordId = '';

  try {
    // 1. Setup Tenant and Workspace
    let tenant = await globalPrisma.tenant.findFirst();
    if (!tenant) {
      tenant = await globalPrisma.tenant.create({
        data: { name: 'Triage Tenant', subdomain: 'triage', status: 'active', planTier: 'standard' }
      });
    }
    tenantId = tenant.id;

    let workspace = await globalPrisma.workspace.findFirst({ where: { tenantId } });
    if (!workspace) {
      workspace = await globalPrisma.workspace.create({ data: { tenantId, name: 'Triage Workspace' } });
    }
    workspaceId = workspace.id;

    // 2. Create Intake Triage module (isIntakeTriage: true)
    const triageModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Central Intake Triage',
        category: 'Core',
        type: 'WORK_ITEM',
        config: { isIntakeTriage: true, layout: [] }
      }
    });
    triageModuleId = triageModule.id;

    // 3. Create target business module
    const targetModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Service Delivery Module',
        category: 'Core',
        type: 'RECORD',
        config: { layout: [] }
      }
    });
    targetModuleId = targetModule.id;

    console.log(`✅ Central Intake Triage module created: ${triageModuleId}`);
    console.log(`✅ Target module created: ${targetModuleId}`);

    // --- TEST CASE 1: Form submission & ROUTE_TO_MODULE action ---
    console.log('\n--- Test Case 1: Form Ingestion & Triage Routing ---');

    // Register a triage rule (Automation)
    const triageAuto = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: triageModuleId,
        name: 'Auto Triage Inbound Requests',
        triggers: [{ type: 'FORM_SUBMITTED', formId: 'public_form' }],
        isActive: true,
        actions: [
          {
            type: 'ROUTE_TO_MODULE',
            config: {
              targetModuleId,
              fieldMapping: {
                name: '{{ trigger.record.name }}',
                description: '{{ trigger.record.issueDescription }}',
                routedFrom: '{{ trigger.record.id }}'
              },
              archiveSource: true
            }
          }
        ] as any
      }
    });
    triageAutomationId = triageAuto.id;

    // Simulate public form submission targeting targetModuleId.
    // Because Intake Triage is active, publicRoutes should reroute the record creation to the Triage module.
    const mockReq = {
      params: { moduleId: targetModuleId },
      body: {
        data: {
          name: 'Critical Leak Reported',
          issueDescription: 'Basement flooding with water',
          applicantEmail: 'john@leak.com'
        }
      }
    } as any;

    let resCode = 0;
    let resBody: any = null;
    const mockRes = {
      status(code: number) { resCode = code; return this; },
      json(data: any) { resBody = data; return this; }
    } as any;

    const submissionRoute = publicRouter.stack.find(s => s.route?.path === '/modules/:moduleId/submissions');
    if (!submissionRoute) throw new Error('Submission route not found');
    const submissionHandler = submissionRoute.route.stack[0].handle;

    console.log('Ingesting external submission...');
    await submissionHandler(mockReq, mockRes);
    console.log(`Response HTTP Status: ${resCode}`);

    triageRecordId = resBody?.id;
    if (resCode === 201 && triageRecordId) {
      console.log(`Ingested Record ID in Triage Module: ${triageRecordId}`);
      
      // Fetch record from triage module to verify it was created there
      const triageRec = await globalPrisma.record.findUnique({ where: { id: triageRecordId } });
      
      // Wait for background execution of ROUTE_TO_MODULE
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the routed record in the target module
      const routedRecs = await globalPrisma.record.findMany({
        where: { moduleId: targetModuleId }
      });
      const routedRec = routedRecs[0];

      // Re-fetch triage record to verify archived status
      const updatedTriageRec = await globalPrisma.record.findUnique({ where: { id: triageRecordId } });

      if (
        triageRec?.moduleId === triageModuleId &&
        routedRec?.data &&
        (routedRec.data as any).name === 'Critical Leak Reported' &&
        updatedTriageRec?.status === 'Archived'
      ) {
        passedCount++;
        targetRecordId = routedRec.id;
        console.log('✅ TEST CASE 1 PASSED: Centralized triage rerouted public form, executed ROUTE_TO_MODULE, and archived the source triage record.');
      } else {
        failedCount++;
        console.error('❌ TEST CASE 1 FAILED');
      }
    } else {
      failedCount++;
      console.error('❌ TEST CASE 1 FAILED (Ingestion failed)');
    }

    // --- TEST CASE 2: STATUS_CHANGED transition trigger ---
    console.log('\n--- Test Case 2: Status Changed Trigger Event ---');

    // Register a status-change automation on Module B (target module)
    const statusAuto = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: targetModuleId,
        name: 'Notify On Status Triage Approved',
        triggers: [{ type: 'STATUS_CHANGED', fromStatus: 'New', toStatus: 'Approved' }],
        isActive: true,
        actions: [
          {
            type: 'SEND_INTERNAL_PING',
            config: { channel: 'status-alerts', message: 'Status transitioned to Approved' }
          }
        ] as any
      }
    });
    statusAutomationId = statusAuto.id;

    // Call PATCH /:id on dataRouter to update status from New to Approved
    const patchReq = {
      params: { id: targetRecordId },
      tenantId,
      db: globalPrisma,
      body: {
        status: 'Approved'
      }
    } as any;

    const patchRoute = dataRouter.stack.find(s => s.route?.path === '/records/:id' && s.route?.methods?.patch);
    if (!patchRoute) throw new Error('PATCH /records/:id route not found in dataRoutes.ts');
    const patchHandler = patchRoute.route.stack[patchRoute.route.stack.length - 1].handle;

    let patchResCode = 0;
    const patchRes = {
      status(code: number) { patchResCode = code; return this; },
      json(data: any) { return this; }
    } as any;

    console.log('Updating record status to Approved...');
    await patchHandler(patchReq, patchRes);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify run log of status-change automation
    const statusRuns = await globalPrisma.automationRun.findMany({
      where: { automationId: statusAutomationId }
    });
    console.log(`Status Runs Logged: ${statusRuns.length}`);
    if (statusRuns.length > 0 && statusRuns[0].status === 'SUCCESS') {
      passedCount++;
      console.log('✅ TEST CASE 2 PASSED: Transition from "New" to "Approved" successfully executed the STATUS_CHANGED automation.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 2 FAILED');
    }

    // --- TEST CASE 3: ASSIGNEE_CHANGED transition trigger ---
    console.log('\n--- Test Case 3: Assignee Changed Trigger Event ---');

    // Register assignee changed automation
    const assigneeAuto = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: targetModuleId,
        name: 'Notify On Reassignment',
        triggers: [{ type: 'ASSIGNEE_CHANGED' }],
        isActive: true,
        actions: [
          {
            type: 'SEND_INTERNAL_PING',
            config: { channel: 'owner-alerts', message: 'Record assignee reassigned' }
          }
        ] as any
      }
    });
    assigneeAutomationId = assigneeAuto.id;

    // PATCH /:id to change assigneeId inside data object
    const patchReq2 = {
      params: { id: targetRecordId },
      tenantId,
      db: globalPrisma,
      body: {
        name: 'Critical Leak Reported',
        assigneeId: 'user-john-doe'
      }
    } as any;

    console.log('Assigning record to user-john-doe...');
    await patchHandler(patchReq2, patchRes);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const assigneeRuns = await globalPrisma.automationRun.findMany({
      where: { automationId: assigneeAutomationId }
    });
    console.log(`Assignee Runs Logged: ${assigneeRuns.length}`);
    if (assigneeRuns.length > 0 && assigneeRuns[0].status === 'SUCCESS') {
      passedCount++;
      console.log('✅ TEST CASE 3 PASSED: Reassigning record to a new user successfully executed the ASSIGNEE_CHANGED automation.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 3 FAILED');
    }

    // --- TEST CASE 4: USER_MENTIONED comment trigger ---
    console.log('\n--- Test Case 4: Activity Comment Mentions Trigger ---');

    // Register user mentioned automation
    const mentionAuto = await globalPrisma.automation.create({
      data: {
        tenantId,
        moduleId: targetModuleId,
        name: 'Mention Alert Trigger',
        triggers: [{ type: 'USER_MENTIONED' }],
        isActive: true,
        actions: [
          {
            type: 'SEND_INTERNAL_PING',
            config: { channel: 'mention-alerts', message: 'Comment has mention: {{ trigger.record.latestComment }}' }
          }
        ] as any
      }
    });
    mentionAutomationId = mentionAuto.id;

    // Call POST /:recordId/comments on dataRouter
    const commentReq = {
      params: { recordId: targetRecordId },
      tenantId,
      db: globalPrisma,
      body: {
        body: 'Please review this request immediately @sarah',
        author: 'John Triage Agent'
      }
    } as any;

    const commentRoute = dataRouter.stack.find(s => s.route?.path === '/:recordId/comments' && s.route?.methods?.post);
    if (!commentRoute) throw new Error('POST /:recordId/comments route not found in dataRoutes.ts');
    const commentHandler = commentRoute.route.stack[commentRoute.route.stack.length - 1].handle;

    let commentResCode = 0;
    const commentRes = {
      status(code: number) { commentResCode = code; return this; },
      json(data: any) { return this; }
    } as any;

    console.log('Posting comment with @mention...');
    await commentHandler(commentReq, commentRes);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const mentionRuns = await globalPrisma.automationRun.findMany({
      where: { automationId: mentionAutomationId }
    });
    console.log(`Mention Runs Logged: ${mentionRuns.length}`);
    if (mentionRuns.length > 0 && mentionRuns[0].status === 'SUCCESS') {
      passedCount++;
      console.log('✅ TEST CASE 4 PASSED: Comment with user mention triggered the USER_MENTIONED automation successfully.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 4 FAILED');
    }

  } catch (err) {
    console.error('❌ Integration tests crashed:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up test database records...');
    if (triageAutomationId) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: triageAutomationId } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: triageAutomationId } }).catch(() => {});
    }
    if (statusAutomationId) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: statusAutomationId } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: statusAutomationId } }).catch(() => {});
    }
    if (assigneeAutomationId) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: assigneeAutomationId } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: assigneeAutomationId } }).catch(() => {});
    }
    if (mentionAutomationId) {
      await globalPrisma.automationRun.deleteMany({ where: { automationId: mentionAutomationId } }).catch(() => {});
      await globalPrisma.automation.delete({ where: { id: mentionAutomationId } }).catch(() => {});
    }
    if (triageRecordId) await globalPrisma.record.delete({ where: { id: triageRecordId } }).catch(() => {});
    if (targetRecordId) await globalPrisma.record.delete({ where: { id: targetRecordId } }).catch(() => {});
    if (triageModuleId) await globalPrisma.module.delete({ where: { id: triageModuleId } }).catch(() => {});
    if (targetModuleId) await globalPrisma.module.delete({ where: { id: targetModuleId } }).catch(() => {});
    
    await globalPrisma.$disconnect();
    console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All new trigger and triage tests completed successfully!');
    }
  }
}

run();

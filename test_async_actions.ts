import { globalPrisma } from './server/lib/prisma';
import { WorkflowEngine } from './server/services/workflowEngine';
import { ActionRegistry } from './server/workflow/actions/core';
import { Workflow } from './src/types/platform';

// Register mock actions for testing retries and failures
let mockRetryAttempts = 0;
ActionRegistry['MOCK_RETRY_ACTION'] = {
  type: 'MOCK_RETRY_ACTION',
  async execute(record, config) {
    if (mockRetryAttempts < 2) {
      mockRetryAttempts++;
      throw new Error(`Simulated mock retry failure #${mockRetryAttempts}`);
    }
    return { success: true, attemptsMade: mockRetryAttempts + 1 };
  }
};

ActionRegistry['MOCK_FAIL_ACTION'] = {
  type: 'MOCK_FAIL_ACTION',
  async execute(record, config) {
    throw new Error('Simulated mock absolute failure');
  }
};

async function run() {
  console.log('🏁 Starting Asynchronous Workflow Action Integration Tests...');
  let passedCount = 0;
  let failedCount = 0;

  let tenantId = '';
  let workspaceId = '';
  let moduleId = '';
  let record1Id = '';
  let record2Id = '';

  try {
    // 1. Find or create a test tenant
    let tenant = await globalPrisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating one...');
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
      console.log('No workspace found. Creating one...');
      workspace = await globalPrisma.workspace.create({
        data: {
          tenantId,
          name: 'Test Workspace'
        }
      });
    }
    workspaceId = workspace.id;

    // 3. Define Retry Workflow (Start -> Action Node with MOCK_RETRY_ACTION -> End Node)
    const retryWorkflow: Workflow = {
      nodes: [
        { id: 'start-node', type: 'START', name: 'Start', config: {} },
        { 
          id: 'action-retry', 
          type: 'ACTION', 
          name: 'Retry Action Node', 
          config: { 
            actionType: 'MOCK_RETRY_ACTION'
          } 
        },
        { id: 'end-node', type: 'END', name: 'Completed Journey', config: {} }
      ],
      edges: [
        { id: 'e1', source: 'start-node', target: 'action-retry' },
        { id: 'e2', source: 'action-retry', target: 'end-node' }
      ]
    };

    // 4. Define Fail Workflow (Start -> Action Node with MOCK_FAIL_ACTION -> End Node)
    const failWorkflow: Workflow = {
      nodes: [
        { id: 'start-node', type: 'START', name: 'Start', config: {} },
        { 
          id: 'action-fail', 
          type: 'ACTION', 
          name: 'Fail Action Node', 
          config: { 
            actionType: 'MOCK_FAIL_ACTION'
          } 
        },
        { id: 'end-node', type: 'END', name: 'Completed Journey', config: {} }
      ],
      edges: [
        { id: 'e1', source: 'start-node', target: 'action-fail' },
        { id: 'e2', source: 'action-fail', target: 'end-node' }
      ]
    };

    // 5. Create a test module
    const testModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Async Action Test Module',
        config: {
          retryWorkflow,
          failWorkflow,
          layout: []
        }
      }
    });
    moduleId = testModule.id;
    console.log(`✅ Created Module: ${testModule.name} (${moduleId})`);

    // --- TEST CASE 1: Retries & Eventual Success ---
    console.log('\n--- Test Case 1: Asynchronous Retries & Eventual Success ---');
    mockRetryAttempts = 0; // Reset attempts

    const initialWorkflowState1 = {
      currentNodeId: 'start-node',
      activeNodeIds: ['start-node'],
      history: [{ nodeId: 'start-node', timestamp: new Date().toISOString(), action: 'Initialized' }]
    };

    let record1 = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId,
        data: {},
        status: 'Start',
        workflowState: initialWorkflowState1
      }
    });
    record1Id = record1.id;

    console.log('Triggering evaluation...');
    const resultState1 = await WorkflowEngine.evaluate(
      { id: record1Id },
      retryWorkflow,
      initialWorkflowState1
    );

    console.log('Initial evaluation returned immediately. Waiting for background execution and retries (approx 2.5s)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Fetch record from database to check final result
    const updatedRecord1 = await globalPrisma.record.findUnique({
      where: { id: record1Id }
    });
    const state1 = updatedRecord1?.workflowState as any;
    console.log(`Final Node ID: "${state1?.currentNodeId}" (Expected: "end-node")`);

    // Locate MOCK_RETRY_ACTION history result
    const actionHist = state1?.history?.find((h: any) => h.nodeId === 'action-retry');
    console.log(`Action Log Result:`, JSON.stringify(actionHist?.result, null, 2));

    if (
      state1?.currentNodeId === 'end-node' &&
      actionHist?.result?.status === 'SUCCESS' &&
      actionHist?.result?.retries === 2
    ) {
      passedCount++;
      console.log('✅ TEST CASE 1 PASSED: Asynchronous action successfully retried 2 times and succeeded on the 3rd attempt.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 1 FAILED: Action did not retry or did not reach success status.');
    }

    // --- TEST CASE 2: Retries & Absolute Failure ---
    console.log('\n--- Test Case 2: Asynchronous Retries & Absolute Failure ---');

    const initialWorkflowState2 = {
      currentNodeId: 'start-node',
      activeNodeIds: ['start-node'],
      history: [{ nodeId: 'start-node', timestamp: new Date().toISOString(), action: 'Initialized' }]
    };

    let record2 = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId,
        data: {},
        status: 'Start',
        workflowState: initialWorkflowState2
      }
    });
    record2Id = record2.id;

    console.log('Triggering evaluation...');
    const resultState2 = await WorkflowEngine.evaluate(
      { id: record2Id },
      failWorkflow,
      initialWorkflowState2
    );

    console.log('Initial evaluation returned immediately. Waiting for background retries to fail (approx 2.5s)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Fetch record from database
    const updatedRecord2 = await globalPrisma.record.findUnique({
      where: { id: record2Id }
    });
    const state2 = updatedRecord2?.workflowState as any;
    console.log(`Final Node ID: "${state2?.currentNodeId}" (Expected: "action-fail" - stopped because it failed)`);

    const failHist = state2?.history?.find((h: any) => h.nodeId === 'action-fail');
    console.log(`Fail Log Result:`, JSON.stringify(failHist?.result, null, 2));

    if (
      state2?.currentNodeId === 'action-fail' &&
      failHist?.result?.status === 'FAILED' &&
      failHist?.result?.retries === 3 &&
      failHist?.result?.error?.includes('Simulated mock absolute failure')
    ) {
      passedCount++;
      console.log('✅ TEST CASE 2 PASSED: Asynchronous action failed after 3 retries and recorded the error.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 2 FAILED: Fail logging or retry count did not match.');
    }

  } catch (err) {
    console.error('❌ Integration tests crashed:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up test database records...');
    if (record1Id) await globalPrisma.record.delete({ where: { id: record1Id } }).catch(() => {});
    if (record2Id) await globalPrisma.record.delete({ where: { id: record2Id } }).catch(() => {});
    if (moduleId) await globalPrisma.module.delete({ where: { id: moduleId } }).catch(() => {});
    await globalPrisma.$disconnect();

    console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 Asynchronous action execution and retry tests completed successfully!');
    }
  }
}

run();

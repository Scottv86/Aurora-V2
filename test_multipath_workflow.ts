import { globalPrisma } from './server/lib/prisma';
import { WorkflowEngine } from './server/services/workflowEngine';
import { Workflow } from './src/types/platform';

async function run() {
  console.log('🏁 Starting Multi-Path Workflow Integration Test...');
  let passedCount = 0;
  let failedCount = 0;

  let tenantId = '';
  let workspaceId = '';
  let moduleId = '';
  let recordId = '';

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
          name: 'Test Workspace'
        }
      });
    }
    workspaceId = workspace.id;
    console.log(`✅ Using Workspace: ${workspace.name} (${workspaceId})`);

    // 3. Define the multi-path workflow structure
    // This workflow splits unconditionally from start-node -> parallel-split -> branch-a AND branch-b
    const sampleWorkflow: Workflow = {
      nodes: [
        { id: 'start-node', type: 'START', name: 'Start', config: {} },
        { id: 'parallel-split', type: 'DECISION', name: 'Split Path', config: {} },
        { id: 'branch-a-status', type: 'STATUS', name: 'Branch A Active', config: {} },
        { id: 'branch-b-status', type: 'STATUS', name: 'Branch B Active', config: {} },
        { id: 'resolved-status', type: 'STATUS', name: 'Fully Resolved', config: {} }
      ],
      edges: [
        { id: 'e1', source: 'start-node', target: 'parallel-split' },
        { id: 'e2', source: 'parallel-split', target: 'branch-a-status', condition: "true" },
        { id: 'e3', source: 'parallel-split', target: 'branch-b-status', condition: "true" },
        // Conditional edges to resolve paths
        { id: 'e4', source: 'branch-a-status', target: 'resolved-status', condition: "resolveA === true" },
        { id: 'e5', source: 'branch-b-status', target: 'resolved-status', condition: "resolveB === true" }
      ]
    };

    // 4. Create a module with this workflow config
    const testModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Multi-Path Workflow Test Module',
        config: {
          workflow: sampleWorkflow,
          layout: [
            { id: 'resolveA', type: 'boolean', label: 'Resolve A' },
            { id: 'resolveB', type: 'boolean', label: 'Resolve B' }
          ]
        }
      }
    });
    moduleId = testModule.id;
    console.log(`✅ Test Module created: ${testModule.name} (${moduleId})`);

    // 5. TEST CASE 1: Record Creation (Unconditional parallel split)
    console.log('\n--- Test Case 1: Record Creation & Parallel Split ---');
    const initialData = { resolveA: false, resolveB: false };
    
    // Setup initial start node
    const startNode = sampleWorkflow.nodes.find(n => n.type === 'START')!;
    const initialWorkflowState = {
      currentNodeId: startNode.id,
      activeNodeIds: [startNode.id],
      history: [{
        nodeId: startNode.id,
        timestamp: new Date().toISOString(),
        action: 'Initialized'
      }]
    };

    let record = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId,
        data: initialData,
        status: 'Start',
        workflowState: initialWorkflowState
      }
    });
    recordId = record.id;
    console.log(`Created record with ID: "${recordId}"`);

    // Run evaluation
    console.log('Evaluating workflow on creation...');
    let evaluatedState = await WorkflowEngine.evaluate(
      { id: recordId, ...initialData },
      sampleWorkflow,
      initialWorkflowState
    );

    console.log(`Evaluated activeNodeIds: ${JSON.stringify(evaluatedState.activeNodeIds)}`);
    console.log(`Evaluated currentNodeId: ${evaluatedState.currentNodeId}`);

    let tc1Passed = false;
    if (
      evaluatedState.activeNodeIds?.includes('branch-a-status') &&
      evaluatedState.activeNodeIds?.includes('branch-b-status') &&
      evaluatedState.activeNodeIds.length === 2
    ) {
      tc1Passed = true;
      passedCount++;
      console.log('✅ TEST CASE 1 PASSED: Workflow split into both parallel status nodes successfully.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 1 FAILED: activeNodeIds does not contain both branch nodes.');
    }

    // Update database record with evaluated state for next test
    record = await globalPrisma.record.update({
      where: { id: recordId },
      data: {
        workflowState: evaluatedState as any
      }
    });

    // 6. TEST CASE 2: Transition from ONE of the active branches
    console.log('\n--- Test Case 2: Transition out of Branch A ---');
    const updatedDataBranchA = { resolveA: true, resolveB: false };

    console.log('Evaluating workflow with resolveA = true...');
    evaluatedState = await WorkflowEngine.evaluate(
      { id: recordId, ...updatedDataBranchA },
      sampleWorkflow,
      record.workflowState as any
    );

    console.log(`Evaluated activeNodeIds: ${JSON.stringify(evaluatedState.activeNodeIds)}`);
    console.log(`Evaluated currentNodeId: ${evaluatedState.currentNodeId}`);

    // Since resolveA === true:
    // branch-a-status should transition to resolved-status
    // branch-b-status has resolveB === false, so it should REMAIN active!
    // Therefore, activeNodeIds should contain both 'resolved-status' and 'branch-b-status'.
    let tc2Passed = false;
    if (
      evaluatedState.activeNodeIds?.includes('resolved-status') &&
      evaluatedState.activeNodeIds?.includes('branch-b-status') &&
      evaluatedState.activeNodeIds.length === 2
    ) {
      tc2Passed = true;
      passedCount++;
      console.log('✅ TEST CASE 2 PASSED: Successfully transitioned out of branch A while branch B remained active.');
    } else {
      failedCount++;
      console.error('❌ TEST CASE 2 FAILED: activeNodeIds incorrect after transitioning one path.');
    }

  } catch (err) {
    console.error('❌ Integration tests crashed:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up test entries...');
    if (recordId) {
      await globalPrisma.record.delete({ where: { id: recordId } }).catch(() => {});
    }
    if (moduleId) {
      await globalPrisma.module.delete({ where: { id: moduleId } }).catch(() => {});
    }
    await globalPrisma.$disconnect();
    console.log('🏁 Integration tests completed.');

    console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 Parallel split and concurrent execution tests completed successfully!');
    }
  }
}

run();

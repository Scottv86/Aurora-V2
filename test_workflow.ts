import { globalPrisma } from './server/lib/prisma';
import { WorkflowEngine } from './server/services/workflowEngine';
import { Workflow } from './src/types/platform';

async function run() {
  console.log('🏁 Starting Workflow Integration Test...');
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
    console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Find or create a workspace
    let workspace = await globalPrisma.workspace.findFirst({
      where: { tenantId: tenant.id }
    });
    if (!workspace) {
      console.log('No workspace found. Creating one...');
      workspace = await globalPrisma.workspace.create({
        data: {
          tenantId: tenant.id,
          name: 'Test Workspace'
        }
      });
    }
    console.log(`✅ Using Workspace: ${workspace.name} (${workspace.id})`);

    // 3. Define the workflow structure
    const sampleWorkflow: Workflow = {
      nodes: [
        { id: 'start-node', type: 'START', name: 'Start', config: {} },
        { id: 'pending-node', type: 'STATUS', name: 'Pending Approval', config: {} },
        { id: 'decision-node', type: 'DECISION', name: 'Value Check', config: {} },
        { id: 'high-priority-node', type: 'STATUS', name: 'High Priority Case', config: {} },
        { id: 'standard-node', type: 'STATUS', name: 'Standard Case', config: {} },
        { 
          id: 'action-notify', 
          type: 'ACTION', 
          name: 'Notify Manager', 
          config: { 
            actionType: 'NOTIFY', 
            message: 'Alert: High value case detected!' 
          } 
        }
      ],
      edges: [
        { id: 'e1', source: 'start-node', target: 'pending-node' },
        { id: 'e2', source: 'pending-node', target: 'decision-node' },
        { id: 'e3', source: 'decision-node', target: 'action-notify', condition: "amount > 10000" },
        { id: 'e4', source: 'decision-node', target: 'standard-node', condition: "amount <= 10000" },
        { id: 'e5', source: 'action-notify', target: 'high-priority-node' }
      ]
    };

    // 4. Create a module with this workflow config
    const testModule = await globalPrisma.module.create({
      data: {
        tenantId: tenant.id,
        workspaceId: workspace.id,
        name: 'Workflow Test Module',
        config: {
          workflow: sampleWorkflow,
          layout: [
            { id: 'amount', type: 'number', label: 'Case Amount' }
          ]
        }
      }
    });
    console.log(`✅ Test Module created: ${testModule.name} (${testModule.id})`);

    // 5. SIMULATE RECORD CREATION
    console.log('\n--- Test Case 1: Record Creation ---');
    const initialData = { amount: 5000 };
    
    // Simulate initial workflowState setup
    let workflowState: any = null;
    const startNode = sampleWorkflow.nodes.find(n => n.type === 'START') || sampleWorkflow.nodes[0];
    workflowState = {
      currentNodeId: startNode.id,
      history: [{
        nodeId: startNode.id,
        timestamp: new Date().toISOString(),
        action: 'Initialized',
        triggeredBy: 'System Test'
      }]
    };

    let record = await globalPrisma.record.create({
      data: {
        tenantId: tenant.id,
        moduleId: testModule.id,
        data: initialData,
        status: workflowState ? (sampleWorkflow.nodes.find(n => n.id === workflowState.currentNodeId)?.name || 'New') : 'New',
        workflowState: workflowState as any
      }
    });
    console.log(`Initial Status: "${record.status}"`);
    console.log(`Initial Node ID: "${(record.workflowState as any)?.currentNodeId}"`);

    // Run creation evaluation
    console.log('Evaluating workflow on creation...');
    let evaluatedState = await WorkflowEngine.evaluate(
      { id: record.id, ...initialData },
      sampleWorkflow,
      workflowState
    );

    if (evaluatedState.currentNodeId !== workflowState.currentNodeId) {
      const targetNode = sampleWorkflow.nodes.find(n => n.id === evaluatedState.currentNodeId);
      const finalStatus = targetNode ? targetNode.name : record.status;
      record = await globalPrisma.record.update({
        where: { id: record.id },
        data: {
          status: finalStatus,
          workflowState: evaluatedState as any
        }
      });
    }
    console.log(`Status After Creation Evaluation: "${record.status}" (Expected: "Pending Approval")`);
    console.log(`Node ID After Creation Evaluation: "${(record.workflowState as any)?.currentNodeId}" (Expected: "pending-node")`);
    
    if (record.status === 'Pending Approval' && (record.workflowState as any)?.currentNodeId === 'pending-node') {
      console.log('✅ TEST CASE 1 PASSED');
    } else {
      console.error('❌ TEST CASE 1 FAILED');
    }

    // 6. SIMULATE RECORD UPDATE - STANDARD CASE (amount <= 10000)
    console.log('\n--- Test Case 2: Record Update (Standard Value) ---');
    const updatedDataStandard = { amount: 8000 };
    let currentWorkflowState = record.workflowState as any;
    
    console.log('Evaluating workflow with amount = 8000...');
    let nextEvaluatedState = await WorkflowEngine.evaluate(
      { id: record.id, ...updatedDataStandard },
      sampleWorkflow,
      currentWorkflowState
    );

    let updatedRecord = await globalPrisma.record.update({
      where: { id: record.id },
      data: {
        data: updatedDataStandard,
        status: sampleWorkflow.nodes.find(n => n.id === nextEvaluatedState.currentNodeId)?.name || record.status,
        workflowState: nextEvaluatedState as any
      }
    });

    console.log(`Status After Standard Update Evaluation: "${updatedRecord.status}" (Expected: "Standard Case")`);
    console.log(`Node ID After Standard Update Evaluation: "${(updatedRecord.workflowState as any)?.currentNodeId}" (Expected: "standard-node")`);

    if (updatedRecord.status === 'Standard Case' && (updatedRecord.workflowState as any)?.currentNodeId === 'standard-node') {
      console.log('✅ TEST CASE 2 PASSED');
    } else {
      console.error('❌ TEST CASE 2 FAILED');
    }

    // 7. SIMULATE RECORD UPDATE - HIGH PRIORITY CASE (amount > 10000 + action triggers)
    console.log('\n--- Test Case 3: Record Update (High Value with Action Execution) ---');
    // Move record back to pending for test setup
    record = await globalPrisma.record.update({
      where: { id: record.id },
      data: {
        status: 'Pending Approval',
        workflowState: {
          currentNodeId: 'pending-node',
          history: [{ nodeId: 'pending-node', timestamp: new Date().toISOString(), action: 'Reset' }]
        }
      }
    });

    const updatedDataHigh = { amount: 25000 };
    currentWorkflowState = record.workflowState as any;
    
    console.log('Evaluating workflow with amount = 25000...');
    let highEvaluatedState = await WorkflowEngine.evaluate(
      { id: record.id, ...updatedDataHigh },
      sampleWorkflow,
      currentWorkflowState
    );

    updatedRecord = await globalPrisma.record.update({
      where: { id: record.id },
      data: {
        data: updatedDataHigh,
        status: sampleWorkflow.nodes.find(n => n.id === highEvaluatedState.currentNodeId)?.name || record.status,
        workflowState: highEvaluatedState as any
      }
    });

    console.log('Waiting for asynchronous actions to resolve...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Refetch the final record state from DB
    updatedRecord = await globalPrisma.record.findUnique({
      where: { id: record.id }
    }) || updatedRecord;

    console.log(`Status After High Update Evaluation: "${updatedRecord.status}" (Expected: "High Priority Case")`);
    console.log(`Node ID After High Update Evaluation: "${(updatedRecord.workflowState as any)?.currentNodeId}" (Expected: "high-priority-node")`);

    if (updatedRecord.status === 'High Priority Case' && (updatedRecord.workflowState as any)?.currentNodeId === 'high-priority-node') {
      console.log('✅ TEST CASE 3 PASSED');
    } else {
      console.error('❌ TEST CASE 3 FAILED');
    }

    // 8. Cleanup test module and records
    console.log('\nCleaning up test entries...');
    await globalPrisma.record.delete({ where: { id: record.id } });
    await globalPrisma.module.delete({ where: { id: testModule.id } });
    console.log('🧹 Cleanup complete.');

  } catch (err) {
    console.error('❌ Test execution error:', err);
  } finally {
    await globalPrisma.$disconnect();
  }
}

run();

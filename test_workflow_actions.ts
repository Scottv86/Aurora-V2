import { globalPrisma } from './server/lib/prisma';
import { WorkflowEngine } from './server/services/workflowEngine';
import { Workflow } from './src/types/platform';

async function run() {
  console.log('🏁 Starting Workflow Action Effector Integration Test...');
  
  let tenantId = '';
  let workspaceId = '';
  let moduleId = '';
  let automationId = '';
  let recordId = '';

  try {
    // 1. Find or create a test tenant
    let tenant = await globalPrisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating one...');
      tenant = await globalPrisma.tenant.create({
        data: {
          name: 'Action Test Tenant',
          subdomain: 'actiontest',
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
          name: 'Action Test Workspace'
        }
      });
    }
    workspaceId = workspace.id;
    console.log(`✅ Using Workspace: ${workspace.name} (${workspaceId})`);

    // 3. Create a test automation rule to be triggered by the RUN_AUTOMATION workflow action
    const automation = await globalPrisma.automation.create({
      data: {
        tenantId,
        name: 'Workflow-triggered Automation Pipeline',
        description: 'Fired by RUN_AUTOMATION node in Workflow',
        isActive: true,
        inputs: {},
        actions: [
          {
            type: 'SEND_EMAIL',
            config: {
              to: 'customer@workflow.com',
              subject: 'Pipeline Automation Executed Successfully',
              body: 'The saved automation pipeline runs fine!'
            }
          }
        ],
        triggers: []
      }
    });
    automationId = automation.id;
    console.log(`✅ Created Automation Rule: ${automation.name} (${automationId})`);

    // 4. Define the workflow structure with all Phase 2 Action Nodes
    const sampleWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: 'Action Effector Test Workflow',
      nodes: [
        { id: 'start-node', type: 'START', name: 'Start', config: {} },
        
        // UPDATE record action
        { 
          id: 'action-update', 
          type: 'ACTION', 
          name: 'Update Record Fields', 
          config: { 
            actionType: 'UPDATE', 
            fields: {
              leadScore: 95,
              stageName: 'Qualified'
            } 
          } 
        },

        // EMAIL action
        { 
          id: 'action-email', 
          type: 'ACTION', 
          name: 'Send Email Notification', 
          config: { 
            actionType: 'EMAIL',
            to: 'manager@company.com',
            subject: 'New Lead: {{leadName}}',
            body: 'Hello Manager, record {{leadName}} has stageName: {{stageName}}.'
          } 
        },

        // SLACK action
        { 
          id: 'action-slack', 
          type: 'ACTION', 
          name: 'Post Slack Alert', 
          config: { 
            actionType: 'SLACK',
            channel: '#pipeline-alerts',
            message: 'Pipeline Alert: Lead stageName is updated to {{stageName}}!'
          } 
        },

        // RUN_AUTOMATION action
        { 
          id: 'action-run-auto', 
          type: 'ACTION', 
          name: 'Trigger Saved Automation', 
          config: { 
            actionType: 'RUN_AUTOMATION',
            automationId: automationId
          } 
        },

        { id: 'end-node', type: 'END', name: 'Completed Journey', config: {} }
      ],
      edges: [
        { id: 'e1', source: 'start-node', target: 'action-update' },
        { id: 'e2', source: 'action-update', target: 'action-email' },
        { id: 'e3', source: 'action-email', target: 'action-slack' },
        { id: 'e4', source: 'action-slack', target: 'action-run-auto' },
        { id: 'e5', source: 'action-run-auto', target: 'end-node' }
      ]
    };

    // 5. Create a test module
    const testModule = await globalPrisma.module.create({
      data: {
        tenantId,
        workspaceId,
        name: 'Action Testing Module',
        config: {
          workflow: sampleWorkflow,
          layout: [
            { id: 'leadName', type: 'text', label: 'Lead Name' },
            { id: 'leadScore', type: 'number', label: 'Lead Score' },
            { id: 'stageName', type: 'text', label: 'Stage Name' }
          ]
        }
      }
    });
    moduleId = testModule.id;
    console.log(`✅ Created Module: ${testModule.name} (${moduleId})`);

    // 6. Create initial record
    const initialData = { leadName: 'John Doe', leadScore: 10, stageName: 'New' };
    const record = await globalPrisma.record.create({
      data: {
        tenantId,
        moduleId,
        data: initialData,
        status: 'Start',
        workflowState: {
          currentNodeId: 'start-node',
          history: [{ nodeId: 'start-node', timestamp: new Date().toISOString(), action: 'Initialized' }]
        }
      }
    });
    recordId = record.id;
    console.log(`✅ Created Record: John Doe (${recordId})`);

    // 7. Evaluate Workflow (triggers chained execution of all action nodes)
    console.log('\n🚀 Triggering Workflow Engine Evaluation...');
    const resultState = await WorkflowEngine.evaluate(
      { id: recordId, ...initialData },
      sampleWorkflow,
      record.workflowState as any,
      testModule.config.layout
    );

    console.log('\n📋 Evaluating Execution Results:');
    console.log(`Current Node: ${resultState.currentNodeId} (Expected: end-node)`);

    // 8. Fetch record from DB to verify updates
    const updatedRecord = await globalPrisma.record.findUnique({
      where: { id: recordId }
    });

    const updatedData = (updatedRecord?.data as any) || {};
    console.log(`Updated leadScore: ${updatedData.leadScore} (Expected: 95)`);
    console.log(`Updated stageName: ${updatedData.stageName} (Expected: Qualified)`);

    let passed = true;
    if (resultState.currentNodeId !== 'end-node') {
      console.error('❌ Failed: Workflow did not reach the end node.');
      passed = false;
    }
    if (updatedData.leadScore !== 95 || updatedData.stageName !== 'Qualified') {
      console.error('❌ Failed: UPDATE action did not successfully update fields in the database.');
      passed = false;
    }

    if (passed) {
      console.log('\n🎉 ALL WORKFLOW ACTION EFFECTOR TESTS PASSED!');
    } else {
      console.error('\n❌ WORKFLOW ACTION EFFECTOR TESTS FAILED!');
    }

  } catch (err) {
    console.error('❌ Error executing integration tests:', err);
  } finally {
    // 9. Cleanup
    console.log('\n🧹 Cleaning up test database records...');
    if (recordId) {
      await globalPrisma.record.delete({ where: { id: recordId } }).catch(() => {});
    }
    if (moduleId) {
      await globalPrisma.module.delete({ where: { id: moduleId } }).catch(() => {});
    }
    if (automationId) {
      await globalPrisma.automation.delete({ where: { id: automationId } }).catch(() => {});
    }
    await globalPrisma.$disconnect();
    console.log('🏁 Verification test complete.');
  }
}

run();

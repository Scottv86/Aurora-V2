import { Workflow, WorkflowNode, WorkflowEdge } from '../../src/types/platform';
import { ActionRegistry } from '../workflow/actions/core';

export interface WorkflowState {
  currentNodeId: string;
  history: {
    nodeId: string;
    timestamp: string;
    action?: string;
    result?: any;
  }[];
}

export class WorkflowEngine {
  /**
   * Evaluates a record against a workflow definition and transitions to the next state if possible.
   */
  static async evaluate(
    record: any,
    workflow: Workflow,
    currentState?: WorkflowState
  ): Promise<WorkflowState> {
    const state: WorkflowState = currentState || {
      currentNodeId: this.findStartNode(workflow).id,
      history: [{ nodeId: this.findStartNode(workflow).id, timestamp: new Date().toISOString() }]
    };

    // Use a queue to handle potentially multiple active paths (Phase 2)
    const activeNodes = [state.currentNodeId];
    
    // For now, we'll track a single primary path in the state, 
    // but the engine will process all available transitions.
    // In a full implementation, we might have multiple 'active' nodes.

    let changed = true;
    while (changed) {
      changed = false;
      const nextNodesToProcess: string[] = [];

      for (const currentId of activeNodes) {
        const currentNode = workflow.nodes.find(n => n.id === currentId);
        if (!currentNode) continue;

        const nextNodes = this.findNextNodes(record, currentId, workflow);

        for (const nextNode of nextNodes) {
          // If we've already visited this node in this jump cycle, avoid loops
          if (state.history.some(h => h.nodeId === nextNode.id && h.timestamp === new Date().toISOString())) continue;

          state.history.push({
            nodeId: nextNode.id,
            timestamp: new Date().toISOString()
          });
          state.currentNodeId = nextNode.id; // Update "last" active node

          // Execute Side-Effects (Phase 3)
          if (nextNode.type === 'ACTION') {
            await this.executeAction(record, nextNode);
          }

          // Decide whether to keep jumping
          if (nextNode.type === 'DECISION' || nextNode.type === 'ACTION') {
            nextNodesToProcess.push(nextNode.id);
            changed = true;
          }
        }
      }

      if (nextNodesToProcess.length > 0) {
        // Update active nodes for next iteration
        activeNodes.splice(0, activeNodes.length, ...nextNodesToProcess);
      }
    }

    return state;
  }

  private static async executeAction(record: any, node: WorkflowNode) {
    const actionType = node.config?.actionType;
    const action = ActionRegistry[actionType];
    
    if (action) {
      console.log(`[ACTION] Executing ${actionType} for node ${node.name}`);
      try {
        await action.execute(record, node.config);
      } catch (error) {
        console.error(`[ACTION ERROR] Failed to execute ${actionType}:`, error);
      }
    } else {
      console.warn(`[ACTION] No action handler found for type: ${actionType}`);
    }
  }

  private static findStartNode(workflow: Workflow): WorkflowNode {
    const startNode = workflow.nodes.find(n => n.type === 'START');
    if (startNode) return startNode;
    const firstStatus = workflow.nodes.find(n => n.type === 'STATUS');
    if (firstStatus) return firstStatus;
    throw new Error('No start node or status node found in workflow');
  }

  private static findNextNodes(record: any, currentNodeId: string, workflow: Workflow): WorkflowNode[] {
    const edges = workflow.edges.filter(e => e.source === currentNodeId);
    const nextNodes: WorkflowNode[] = [];

    for (const edge of edges) {
      if (this.evaluateCondition(record, edge.condition)) {
        const node = workflow.nodes.find(n => n.id === edge.target);
        if (node) nextNodes.push(node);
      }
    }

    return nextNodes;
  }

  private static evaluateCondition(record: any, condition?: string): boolean {
    if (!condition || condition.trim() === '') return true;

    try {
      // Robust evaluation for Aurora expressions
      // Support basic comparison: record.amount > 1000, record.status == 'Urgent'
      // Replace record.field with record['field'] to handle spaces/dots if needed
      const sanitized = condition.replace(/record\.(\w+)/g, "record['$1']");
      const fn = new Function('record', `return ${sanitized}`);
      return !!fn(record);
    } catch (e) {
      console.error('Error evaluating condition:', condition, e);
      return false;
    }
  }

}

import { Workflow, WorkflowNode } from '../../src/types/platform';
import { ActionRegistry } from '../workflow/actions/core';


export interface WorkflowState {
  currentNodeId: string;
  history: {
    nodeId: string;
    timestamp: string;
    action?: string;
    result?: any;
    triggerCondition?: string;
    triggeredBy?: string;
  }[];
}

export class WorkflowEngine {
  /**
   * Evaluates a record against a workflow definition and transitions to the next state if possible.
   */
  static async evaluate(
    record: any,
    workflow: Workflow,
    currentState?: WorkflowState,
    layout?: any[]
  ): Promise<WorkflowState> {
    const state: WorkflowState = currentState
      ? {
          currentNodeId: currentState.currentNodeId,
          history: [...(currentState.history || [])]
        }
      : {
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

        const nextTransitions = this.findNextTransitions(record, currentId, workflow, layout);

        for (const transition of nextTransitions) {
          const nextNode = transition.node;
          // If we've already visited this node in this jump cycle, avoid loops
          if (state.history.some(h => h.nodeId === nextNode.id && h.timestamp === new Date().toISOString())) continue;

          state.history.push({
            nodeId: nextNode.id,
            timestamp: new Date().toISOString(),
            action: 'Auto-transitioned',
            triggerCondition: transition.condition || undefined
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

  private static findNextTransitions(record: any, currentNodeId: string, workflow: Workflow, layout?: any[]): { node: WorkflowNode; condition?: string }[] {
    const edges = workflow.edges.filter(e => e.source === currentNodeId);
    const nextTransitions: { node: WorkflowNode; condition?: string }[] = [];

    for (const edge of edges) {
      if (this.evaluateCondition(record, edge.condition, layout)) {
        const node = workflow.nodes.find(n => n.id === edge.target);
        if (node) nextTransitions.push({ node, condition: edge.condition });
      }
    }

    return nextTransitions;
  }

  public static evaluateCondition(record: any, condition?: string, layout?: any[]): boolean {
    if (!condition || condition.trim() === '') return true;

    try {
      const context: Record<string, any> = {};
      
      // Inject record properties
      if (record && typeof record === 'object') {
        Object.entries(record).forEach(([key, val]) => {
          context[key] = val;
        });
      }
      
      const mappedRecord = { ...record };
      
      // If layout is provided, map field keys/slugs (f.name) to their values from the record
      if (layout && Array.isArray(layout)) {
        const flatten = (fields: any[]): any[] => {
          const res: any[] = [];
          (fields || []).forEach(f => {
            res.push(f);
            if (f.fields && Array.isArray(f.fields)) {
              res.push(...flatten(f.fields));
            }
          });
          return res;
        };

        const allFields = flatten(layout);
        
        // Helper to recursively find a field value inside record data
        const getVal = (obj: any, fieldId: string): any => {
          if (!obj) return undefined;
          if (obj[fieldId] !== undefined) return obj[fieldId];
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
              const nestedVal = getVal(obj[key], fieldId);
              if (nestedVal !== undefined) return nestedVal;
            }
          }
          return undefined;
        };

        allFields.forEach(f => {
          if (f.name) {
            const val = getVal(record, f.id);
            if (val !== undefined) {
              context[f.name] = val;
              mappedRecord[f.name] = val; // Also allow record.slug
            }
          }
        });
      }

      // Ensure 'record' prefix is also supported for backward compatibility
      context.record = mappedRecord;

      // Filter context to only valid JavaScript identifier keys to prevent syntax errors
      const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
      const validKeys: string[] = [];
      const validValues: any[] = [];
      
      Object.entries(context).forEach(([key, val]) => {
        if (identifierRegex.test(key)) {
          validKeys.push(key);
          validValues.push(val);
        }
      });

      const fn = new Function(...validKeys, `return ${condition}`);
      return !!fn(...validValues);
    } catch (e) {
      console.error('Error evaluating condition:', condition, e);
      return false;
    }
  }

}

import { Workflow, WorkflowNode } from '../../src/types/platform';
import { ActionRegistry } from '../workflow/actions/core';
import { globalPrisma } from '../lib/prisma';
import { emitTenantUpdate } from '../socket';

export interface WorkflowState {
  currentNodeId: string;
  activeNodeIds?: string[];
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
          activeNodeIds: currentState.activeNodeIds || [currentState.currentNodeId],
          history: [...(currentState.history || [])]
        }
      : {
          currentNodeId: this.findStartNode(workflow).id,
          activeNodeIds: [this.findStartNode(workflow).id],
          history: [{ nodeId: this.findStartNode(workflow).id, timestamp: new Date().toISOString() }]
        };

    const activeNodes = [...(state.activeNodeIds || [state.currentNodeId])];
    const currentActive = new Set<string>(activeNodes);
    
    // Collect actions to execute after evaluation completes
    const actionsToRun: { node: WorkflowNode; historyIndex: number }[] = [];

    let changed = true;
    while (changed) {
      changed = false;
      const nextNodesToProcess: string[] = [];

      for (const currentId of activeNodes) {
        const currentNode = workflow.nodes.find(n => n.id === currentId);
        if (!currentNode) continue;

        const nextTransitions = this.findNextTransitions(record, currentId, workflow, layout);

        if (nextTransitions.length > 0) {
          currentActive.delete(currentId);
          changed = true;
        }

        for (const transition of nextTransitions) {
          const nextNode = transition.node;
          if (state.history.some(h => h.nodeId === nextNode.id && h.timestamp === new Date().toISOString())) continue;

          if (nextNode.type === 'DECISION') {
            state.history.push({
              nodeId: nextNode.id,
              timestamp: new Date().toISOString(),
              action: 'Auto-transitioned',
              triggerCondition: transition.condition || undefined
            });
            nextNodesToProcess.push(nextNode.id);
          } else if (nextNode.type === 'ACTION') {
            currentActive.add(nextNode.id);
            const historyIndex = state.history.push({
              nodeId: nextNode.id,
              timestamp: new Date().toISOString(),
              action: 'Auto-transitioned',
              triggerCondition: transition.condition || undefined,
              result: { status: 'RUNNING', retries: 0 }
            }) - 1;

            actionsToRun.push({ node: nextNode, historyIndex });
          } else if (nextNode.type === 'STATUS' || nextNode.type === 'START' || nextNode.type === 'END') {
            state.history.push({
              nodeId: nextNode.id,
              timestamp: new Date().toISOString(),
              action: 'Auto-transitioned',
              triggerCondition: transition.condition || undefined
            });

            const outgoingActionTransitions = this.findNextTransitions(record, nextNode.id, workflow, layout)
              .filter(t => t.node.type === 'ACTION');
            
            if (outgoingActionTransitions.length > 0) {
              for (const actTrans of outgoingActionTransitions) {
                currentActive.add(actTrans.node.id);
                const historyIndex = state.history.push({
                  nodeId: actTrans.node.id,
                  timestamp: new Date().toISOString(),
                  action: 'Auto-transitioned (Action Hook)',
                  triggerCondition: actTrans.condition || undefined,
                  result: { status: 'RUNNING', retries: 0 }
                }) - 1;

                actionsToRun.push({ node: actTrans.node, historyIndex });
              }
            } else {
              currentActive.add(nextNode.id);
            }
          }
        }
      }

      if (nextNodesToProcess.length > 0) {
        activeNodes.splice(0, activeNodes.length, ...nextNodesToProcess);
      } else {
        activeNodes.splice(0, activeNodes.length);
      }
    }

    state.activeNodeIds = Array.from(currentActive);
    if (state.activeNodeIds.length > 0) {
      state.currentNodeId = state.activeNodeIds[state.activeNodeIds.length - 1];
    }

    // Save state to DB atomically BEFORE executing actions in the background
    if (record.id && actionsToRun.length > 0) {
      this.updateStateInDb(record.id, state).then(() => {
        for (const act of actionsToRun) {
          this.runAsyncAction(record.id, act.node, act.historyIndex, workflow, layout).catch(err => {
            console.error(`[WorkflowEngine] Background action failed to launch:`, err);
          });
        }
      }).catch(err => {
        console.error(`[WorkflowEngine] Failed to save intermediate state:`, err);
      });
    }

    return state;
  }

  private static async updateStateInDb(recordId: string, state: WorkflowState) {
    await globalPrisma.record.update({
      where: { id: recordId },
      data: {
        workflowState: state as any
      }
    });
  }

  private static async runAsyncAction(
    recordId: string,
    node: WorkflowNode,
    historyIndex: number,
    workflow: Workflow,
    layout?: any[]
  ) {
    const actionType = node.config?.actionType;
    const action = ActionRegistry[actionType];
    
    let tenantId = '';
    try {
      const dbRecord = await globalPrisma.record.findUnique({
        where: { id: recordId },
        select: { tenantId: true }
      });
      if (dbRecord) {
        tenantId = dbRecord.tenantId;
      }
    } catch (err) {
      console.error(`[WorkflowEngine] Error resolving tenantId for action:`, err);
    }

    if (!action) {
      console.warn(`[ACTION] No action handler found for type: ${actionType}`);
      await this.updateActionHistory(recordId, historyIndex, {
        status: 'FAILED',
        error: `No action handler found for type: ${actionType}`
      });
      return;
    }

    const maxRetries = 3;
    let attempt = 0;
    let success = false;
    let resultOutput: any = null;
    let errorMessage: string | null = null;
    const startTime = Date.now();

    while (attempt < maxRetries && !success) {
      attempt++;
      try {
        console.log(`[ACTION] Executing ${actionType} for node ${node.name} (Attempt ${attempt}/${maxRetries})`);
        
        const dbRecord = await globalPrisma.record.findUnique({
          where: { id: recordId }
        });
        
        if (!dbRecord) {
          throw new Error(`Record ${recordId} not found during action execution`);
        }

        const recordContext = {
          id: dbRecord.id,
          status: dbRecord.status,
          ...(dbRecord.data as Record<string, any> || {})
        };

        resultOutput = await action.execute(recordContext, node.config);
        success = true;
      } catch (error: any) {
        errorMessage = error.message || 'Unknown action error';
        console.error(`[ACTION ERROR] Attempt ${attempt} failed for ${actionType}:`, errorMessage);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    const duration = Date.now() - startTime;

    if (success) {
      const updatedState = await this.updateActionHistory(recordId, historyIndex, {
        status: 'SUCCESS',
        durationMs: duration,
        retries: attempt - 1,
        output: resultOutput
      });

      if (updatedState) {
        try {
          const dbRecord = await globalPrisma.record.findUnique({
            where: { id: recordId }
          });
          
          if (dbRecord) {
            const recordContext = {
              id: dbRecord.id,
              status: dbRecord.status,
              ...(dbRecord.data as Record<string, any> || {})
            };

            const evaluatedState = await WorkflowEngine.evaluate(
              recordContext,
              workflow,
              updatedState,
              layout
            );

            const activeNodeIds = evaluatedState.activeNodeIds || [evaluatedState.currentNodeId];
            const fallbackStatus = dbRecord.status;
            
            const statusNames: string[] = [];
            for (const nodeId of activeNodeIds) {
              let tNode = workflow.nodes.find(n => n.id === nodeId);
              if (tNode && (tNode.type === 'ACTION' || tNode.type === 'DECISION')) {
                const history = evaluatedState.history || [];
                for (let i = history.length - 1; i >= 0; i--) {
                  const histNode = workflow.nodes.find(n => n.id === history[i].nodeId);
                  if (histNode && (histNode.type === 'STATUS' || histNode.type === 'START' || histNode.type === 'END')) {
                    tNode = histNode;
                    break;
                  }
                }
              }
              if (tNode && tNode.name && !statusNames.includes(tNode.name)) {
                statusNames.push(tNode.name);
              }
            }
            const finalStatus = statusNames.length > 0 ? statusNames.join(' / ') : fallbackStatus;

            await globalPrisma.record.update({
              where: { id: recordId },
              data: {
                status: finalStatus,
                workflowState: evaluatedState as any
              }
            });

            if (tenantId) {
              emitTenantUpdate(tenantId, 'record_updated', {
                id: recordId,
                moduleId: dbRecord.moduleId
              });
            }
          }
        } catch (evalErr) {
          console.error('[WorkflowEngine] Error in post-action evaluation:', evalErr);
        }
      }
    } else {
      await this.updateActionHistory(recordId, historyIndex, {
        status: 'FAILED',
        durationMs: duration,
        retries: attempt,
        error: errorMessage
      });
      
      const dbRecord = await globalPrisma.record.findUnique({
        where: { id: recordId }
      });
      if (dbRecord && tenantId) {
        emitTenantUpdate(tenantId, 'record_updated', {
          id: recordId,
          moduleId: dbRecord.moduleId
        });
      }
    }
  }

  private static async updateActionHistory(
    recordId: string,
    historyIndex: number,
    result: any
  ): Promise<WorkflowState | null> {
    try {
      const record = await globalPrisma.record.findUnique({
        where: { id: recordId },
        select: { workflowState: true }
      });

      if (!record || !record.workflowState) return null;

      const state = { ...(record.workflowState as any) } as WorkflowState;
      if (state.history && state.history[historyIndex]) {
        state.history[historyIndex].result = result;
        
        await globalPrisma.record.update({
          where: { id: recordId },
          data: {
            workflowState: state as any
          }
        });
        
        return state;
      }
      return null;
    } catch (error) {
      console.error('[WorkflowEngine] Error in updateActionHistory:', error);
      return null;
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
      
      if (record && typeof record === 'object') {
        Object.entries(record).forEach(([key, val]) => {
          context[key] = val;
        });
      }
      
      const mappedRecord = { ...record };
      
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
              mappedRecord[f.name] = val;
            }
          }
        });
      }

      context.record = mappedRecord;

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

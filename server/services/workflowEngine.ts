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
    const currentNode = workflow.nodes.find(n => n.id === currentNodeId);
    const edges = workflow.edges.filter(e => e.source === currentNodeId);
    const nextTransitions: { node: WorkflowNode; condition?: string }[] = [];

    for (const edge of edges) {
      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;

      // If current node is a STATUS node and target node is also a STATUS node,
      // it represents a manual workflow stage progression unless an explicit automated condition is specified.
      // Unconditional edges between STATUS stages require an explicit user action (transitionTo)
      // and must never auto-transition during ordinary field updates (e.g. changing assignee).
      if (currentNode?.type === 'STATUS' && targetNode.type === 'STATUS') {
        if (!edge.condition || edge.condition.trim() === '') {
          continue;
        }
      }

      if (this.evaluateCondition(record, edge.condition, layout)) {
        nextTransitions.push({ node: targetNode, condition: edge.condition });
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

      return this.safeEvaluateExpression(condition.trim(), context);
    } catch (e) {
      console.error('Error evaluating condition:', condition, e);
      return false;
    }
  }

  private static safeEvaluateExpression(expr: string, context: Record<string, any>): boolean {
    const clean = expr.trim();
    if (!clean || clean === 'true') return true;
    if (clean === 'false') return false;

    // Strip outer balanced parentheses
    if (clean.startsWith('(') && clean.endsWith(')')) {
      let depth = 0;
      let balanced = true;
      for (let i = 0; i < clean.length - 1; i++) {
        if (clean[i] === '(') depth++;
        else if (clean[i] === ')') depth--;
        if (depth === 0) {
          balanced = false;
          break;
        }
      }
      if (balanced) {
        return this.safeEvaluateExpression(clean.slice(1, -1), context);
      }
    }

    // Split top-level || then &&
    const orParts = this.splitTopLevel(clean, '||');
    if (orParts.length > 1) {
      return orParts.some(p => this.safeEvaluateExpression(p, context));
    }

    const andParts = this.splitTopLevel(clean, '&&');
    if (andParts.length > 1) {
      return andParts.every(p => this.safeEvaluateExpression(p, context));
    }

    // Unary negation
    if (clean.startsWith('!!')) {
      return Boolean(this.resolveOperand(clean.slice(2).trim(), context));
    }
    if (clean.startsWith('!')) {
      return !this.safeEvaluateExpression(clean.slice(1).trim(), context);
    }

    // String method calls: String(x).includes('y') or x.includes('y')
    const includesMatch = clean.match(/^(?:String\(([^)]+)\)|([a-zA-Z0-9_$.]+))\.(includes|startsWith|endsWith)\((.+)\)$/);
    if (includesMatch) {
      const targetKey = (includesMatch[1] || includesMatch[2]).trim();
      const method = includesMatch[3];
      const argVal = String(this.resolveOperand(includesMatch[4].trim(), context) ?? '');
      const targetVal = String(this.resolveOperand(targetKey, context) ?? '');
      if (method === 'includes') return targetVal.includes(argVal);
      if (method === 'startsWith') return targetVal.startsWith(argVal);
      if (method === 'endsWith') return targetVal.endsWith(argVal);
    }

    // Comparison operators
    const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
    for (const op of operators) {
      const parts = this.splitTopLevel(clean, op);
      if (parts.length === 2) {
        const left = this.resolveOperand(parts[0].trim(), context);
        const right = this.resolveOperand(parts[1].trim(), context);
        switch (op) {
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '>=': return Number(left) >= Number(right);
          case '<=': return Number(left) <= Number(right);
          case '>': return Number(left) > Number(right);
          case '<': return Number(left) < Number(right);
        }
      }
    }

    return Boolean(this.resolveOperand(clean, context));
  }

  private static splitTopLevel(expr: string, delimiter: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let quote: string | null = null;
    let lastIdx = 0;

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (quote) {
        if (ch === quote && expr[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === "'" || ch === '"') {
        quote = ch;
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0 && expr.slice(i, i + delimiter.length) === delimiter) {
        // Avoid matching '==' inside '===' or '!=' inside '!=='
        if ((delimiter === '==' || delimiter === '!=') && expr[i + 2] === '=') {
          continue;
        }
        result.push(expr.slice(lastIdx, i));
        i += delimiter.length - 1;
        lastIdx = i + 1;
      }
    }
    if (result.length > 0) {
      result.push(expr.slice(lastIdx));
      return result;
    }
    return [expr];
  }

  private static resolveOperand(token: string, context: Record<string, any>): any {
    const t = token.trim();
    if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
      return t.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (t === 'null') return null;
    if (t === 'undefined') return undefined;
    if (t !== '' && !isNaN(Number(t))) return Number(t);

    // Support bracket notation e.g. record['case-amount'] or record["case-amount"] along with dot notation
    const normalized = t.replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
    const parts = normalized.split('.').filter(Boolean);
    let current: any = context;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
      current = current[part];
    }
    return current;
  }

}

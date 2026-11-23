import React, { useState, useMemo } from 'react';
import {
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  RotateCcw,
  Code,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Workflow } from '../../../types/platform';
import { cn } from '../../../lib/utils';

export interface WorkflowStepTrace {
  nodeId: string;
  label: string;
  nodeType: string;
  status: 'passed' | 'failed';
  timestamp: string;
  durationMs: number;
  triggerCondition?: string;
  error?: string;
  output?: any;
}

export interface WorkflowRunRecord {
  id: string;
  status: 'passed' | 'failed';
  startedAt: string;
  durationMs: number;
  payload: Record<string, any>;
  steps: WorkflowStepTrace[];
  failedNodeId?: string | null;
}

export interface WorkflowState {
  currentNodeId: string;
  activeNodeIds?: string[];
  history: {
    nodeId: string;
    timestamp: string;
    action?: string;
    triggerCondition?: string;
    result?: any;
  }[];
}

class ClientWorkflowEngine {
  static evaluateWithTrace(record: any, workflow: Workflow): {
    steps: WorkflowStepTrace[];
    status: 'passed' | 'failed';
    failedNodeId: string | null;
  } {
    const startNode =
      workflow.nodes.find((n) => n.type === 'START') ||
      workflow.nodes.find((n) => n.type === 'STATUS');

    if (!startNode) {
      throw new Error('No Entry Point or State node found in workflow.');
    }

    const steps: WorkflowStepTrace[] = [
      {
        nodeId: startNode.id,
        label: startNode.label || 'Start',
        nodeType: startNode.type,
        status: 'passed',
        timestamp: new Date().toISOString(),
        durationMs: 4,
        output: { triggered: true },
      },
    ];

    const visited = new Set<string>([startNode.id]);
    const queue: string[] = [startNode.id];
    let failedNodeId: string | null = null;

    while (queue.length > 0 && steps.length < 50) {
      const currentId = queue.shift()!;
      const nextTransitions = this.findNextTransitions(record, currentId, workflow);

      for (const transition of nextTransitions) {
        const nextNode = transition.node;
        if (visited.has(nextNode.id)) continue;
        visited.add(nextNode.id);

        if (nextNode.type === 'ACTION' && !nextNode.actionType) {
          steps.push({
            nodeId: nextNode.id,
            label: nextNode.label || 'Action',
            nodeType: nextNode.type,
            status: 'failed',
            timestamp: new Date().toISOString(),
            durationMs: 2,
            triggerCondition: transition.condition || undefined,
            error: 'No action type configured on this Action node.',
          });
          failedNodeId = nextNode.id;
          return { steps, status: 'failed', failedNodeId };
        }

        steps.push({
          nodeId: nextNode.id,
          label: nextNode.label || nextNode.type,
          nodeType: nextNode.type,
          status: 'passed',
          timestamp: new Date().toISOString(),
          durationMs: nextNode.type === 'ACTION' ? 18 : 6,
          triggerCondition: transition.condition || undefined,
          output:
            nextNode.type === 'ACTION'
              ? { action: nextNode.actionType, simulated: true }
              : { entered: true },
        });

        queue.push(nextNode.id);
      }
    }

    return { steps, status: 'passed', failedNodeId: null };
  }

  private static findNextTransitions(
    record: any,
    currentNodeId: string,
    workflow: Workflow
  ): { node: any; condition?: string }[] {
    const edges = workflow.edges.filter((e) => e.source === currentNodeId);
    const nextTransitions: { node: any; condition?: string }[] = [];

    for (const edge of edges) {
      if (this.evaluateCondition(record, edge.condition)) {
        const node = workflow.nodes.find((n) => n.id === edge.target);
        if (node) nextTransitions.push({ node, condition: edge.condition });
      }
    }

    return nextTransitions;
  }

  private static evaluateCondition(record: any, condition?: string): boolean {
    if (!condition || condition.trim() === '') return true;

    try {
      const context: Record<string, any> = { ...record };
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
    } catch {
      return false;
    }
  }
}

export interface WorkflowIssue {
  id: string;
  severity: 'error' | 'warning';
  nodeId?: string;
  title: string;
  detail: string;
}

interface WorkflowDebuggerProps {
  workflow: Workflow;
  fields?: any[];
  onHighlightPath?: (passedNodeIds: string[], failedNodeId?: string | null) => void;
  onSelectNode?: (nodeId: string) => void;
}

export const WorkflowDebugger: React.FC<WorkflowDebuggerProps> = ({
  workflow,
  fields = [],
  onHighlightPath,
  onSelectNode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'test' | 'runs' | 'checker'>('test');
  const [inputMode, setInputMode] = useState<'fields' | 'json'>('fields');
  const [formValues, setFormValues] = useState<Record<string, any>>(() => ({
    status: 'New',
    priority: 'High',
  }));
  const [mockJson, setMockJson] = useState<string>(
    '{\n  "status": "New",\n  "priority": "High"\n}'
  );
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testableFields = useMemo(
    () =>
      (fields || [])
        .filter((f: any) => !['heading', 'divider', 'spacer', 'alert', 'group', 'fieldGroup'].includes(f.type))
        .slice(0, 8),
    [fields]
  );

  // Flow Checker: static validation of the workflow graph
  const issues = useMemo<WorkflowIssue[]>(() => {
    const list: WorkflowIssue[] = [];
    const startNodes = workflow.nodes.filter((n) => n.type === 'START');
    const endNodes = workflow.nodes.filter((n) => n.type === 'END');

    if (startNodes.length === 0) {
      list.push({
        id: 'missing-start',
        severity: 'error',
        title: 'Missing Entry Point',
        detail: 'Add an Entry Point (Start) node so records have a starting stage.',
      });
    }
    if (endNodes.length === 0) {
      list.push({
        id: 'missing-end',
        severity: 'warning',
        title: 'No Exit Point',
        detail: 'Consider adding an Exit Point node to mark workflow completion.',
      });
    }

    // Reachability from start
    const reachable = new Set<string>();
    const queue = startNodes.map((n) => n.id);
    queue.forEach((id) => reachable.add(id));
    while (queue.length > 0) {
      const curr = queue.shift()!;
      workflow.edges
        .filter((e) => e.source === curr)
        .forEach((e) => {
          if (!reachable.has(e.target)) {
            reachable.add(e.target);
            queue.push(e.target);
          }
        });
    }

    workflow.nodes.forEach((node) => {
      if (node.type === 'ZONE') return;
      if (startNodes.length > 0 && !reachable.has(node.id)) {
        list.push({
          id: `unreachable-${node.id}`,
          severity: 'warning',
          nodeId: node.id,
          title: `Unreachable: ${node.label || node.type}`,
          detail: 'This node has no incoming path from an Entry Point.',
        });
      }
      if (node.type === 'ACTION' && !node.actionType) {
        list.push({
          id: `unconfigured-action-${node.id}`,
          severity: 'error',
          nodeId: node.id,
          title: `Unconfigured Action: ${node.label || 'Action'}`,
          detail: 'Select an action type in Properties before deploying.',
        });
      }
      if (node.type === 'DECISION') {
        const outgoing = workflow.edges.filter((e) => e.source === node.id);
        if (outgoing.length < 2) {
          list.push({
            id: `decision-branches-${node.id}`,
            severity: 'warning',
            nodeId: node.id,
            title: `Single-path Decision: ${node.label || 'Decision'}`,
            detail: 'Decision gates typically branch to 2 or more paths.',
          });
        }
      }
    });

    return list;
  }, [workflow]);

  const executeTest = (payloadOverride?: Record<string, any>) => {
    setError(null);
    const t0 = performance.now();
    try {
      const payload =
        payloadOverride ??
        (inputMode === 'json' ? JSON.parse(mockJson) : { ...formValues });

      const { steps, status, failedNodeId } = ClientWorkflowEngine.evaluateWithTrace(
        payload,
        workflow
      );
      const durationMs = Math.max(1, Math.round(performance.now() - t0 + steps.reduce((a, s) => a + s.durationMs, 0)));

      const newRun: WorkflowRunRecord = {
        id: `run-${Date.now()}`,
        status,
        startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        durationMs,
        payload,
        steps,
        failedNodeId,
      };

      setRuns((prev) => [newRun, ...prev].slice(0, 20));
      setSelectedRunId(newRun.id);
      setActiveSubTab('runs');

      onHighlightPath?.(
        steps.filter((s) => s.status === 'passed').map((s) => s.nodeId),
        failedNodeId
      );
    } catch (e: any) {
      setError(e.message || 'Failed to evaluate workflow test.');
    }
  };

  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Sub-navigation: Test | Runs | Checker */}
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex-1 grid grid-cols-3 gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('test')}
            className={cn(
              'py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
              activeSubTab === 'test'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('runs')}
            className={cn(
              'py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
              activeSubTab === 'runs'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            Runs {runs.length > 0 ? `(${runs.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('checker')}
            className={cn(
              'py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1',
              activeSubTab === 'checker'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <span>Checker</span>
            {issues.length > 0 && (
              <span
                className={cn(
                  'px-1 rounded-full text-[9px] font-semibold',
                  errorCount > 0
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                {issues.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {activeSubTab === 'test' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">Test payload</span>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setInputMode('fields')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer',
                    inputMode === 'fields'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500'
                  )}
                >
                  <SlidersHorizontal size={10} />
                  Fields
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMockJson(JSON.stringify(formValues, null, 2));
                    setInputMode('json');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer',
                    inputMode === 'json'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500'
                  )}
                >
                  <Code size={10} />
                  JSON
                </button>
              </div>
            </div>

            {inputMode === 'fields' ? (
              <div className="space-y-2.5">
                {testableFields.length === 0 ? (
                  <p className="text-[11px] text-zinc-500">
                    No module fields yet. Switch to JSON to test custom properties.
                  </p>
                ) : (
                  testableFields.map((f: any) => {
                    const key = f.id;
                    const val = formValues[key] ?? '';
                    return (
                      <div key={f.id} className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block truncate">
                          {f.label || f.id}
                        </label>
                        {Array.isArray(f.options) && f.options.length > 0 ? (
                          <select
                            value={val}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">(Empty)</option>
                            {f.options.map((opt: any, i: number) => {
                              const optVal = typeof opt === 'string' ? opt : opt.value || opt.label;
                              const optLabel = typeof opt === 'string' ? opt : opt.label || opt.value;
                              return (
                                <option key={i} value={optVal}>
                                  {optLabel}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            type={f.type === 'number' || f.type === 'currency' ? 'number' : 'text'}
                            value={val}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [key]:
                                  f.type === 'number' || f.type === 'currency'
                                    ? e.target.value === ''
                                      ? ''
                                      : Number(e.target.value)
                                    : e.target.value,
                              }))
                            }
                            placeholder={`Enter ${String(f.label || f.id).toLowerCase()}...`}
                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-indigo-500"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <textarea
                value={mockJson}
                onChange={(e) => setMockJson(e.target.value)}
                className="w-full h-44 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-800 dark:text-indigo-300 focus:outline-none focus:border-indigo-500 resize-none"
                spellCheck={false}
              />
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => executeTest()}
                className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Play size={12} fill="currentColor" />
                <span>Run test</span>
              </button>
              <button
                type="button"
                onClick={() => onHighlightPath?.([], null)}
                className="h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Clear canvas highlights"
              >
                Clear
              </button>
            </div>
          </>
        )}

        {activeSubTab === 'runs' && (
          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="py-10 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-2">
                <Clock size={22} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No runs recorded yet</p>
                <p className="text-[11px] text-zinc-400">
                  Run a test to inspect step-by-step execution, timings, and failures.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {runs.map((run) => {
                    const isSelected = activeRun?.id === run.id;
                    return (
                      <div
                        key={run.id}
                        onClick={() => {
                          setSelectedRunId(run.id);
                          onHighlightPath?.(
                            run.steps.filter((s) => s.status === 'passed').map((s) => s.nodeId),
                            run.failedNodeId
                          );
                        }}
                        className={cn(
                          'px-2.5 py-2 rounded-lg border cursor-pointer transition-colors flex items-center justify-between gap-2',
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
                            : 'bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {run.status === 'passed' ? (
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-rose-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                              <span className="capitalize">{run.status}</span>
                              <span className="text-[10px] text-zinc-400 font-normal">
                                · {run.steps.length} steps
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {run.startedAt} · {run.durationMs}ms
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            executeTest(run.payload);
                          }}
                          className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600 transition-colors"
                          title="Re-run with same payload"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {activeRun && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500">Step trace</span>
                      <button
                        type="button"
                        onClick={() => onHighlightPath?.([], null)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        Clear canvas
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {activeRun.steps.map((step, idx) => (
                        <div
                          key={`${step.nodeId}-${idx}`}
                          onClick={() => onSelectNode?.(step.nodeId)}
                          className="p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 hover:border-indigo-400/50 cursor-pointer space-y-1 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {step.status === 'passed' ? (
                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle size={12} className="text-rose-500 shrink-0" />
                              )}
                              <span className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                                {step.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                              {step.durationMs}ms
                            </span>
                          </div>
                          {step.triggerCondition && (
                            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 truncate">
                              if: {step.triggerCondition}
                            </div>
                          )}
                          {step.error && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400">
                              {step.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeSubTab === 'checker' && (
          <div className="space-y-2.5">
            {issues.length === 0 ? (
              <div className="py-10 px-4 border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl text-center space-y-1.5">
                <CheckCircle2 size={22} className="mx-auto text-emerald-500" />
                <p className="text-xs font-medium text-zinc-900 dark:text-white">No issues found</p>
                <p className="text-[11px] text-zinc-500">
                  All nodes are reachable and properly configured.
                </p>
              </div>
            ) : (
              issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => issue.nodeId && onSelectNode?.(issue.nodeId)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-2.5',
                    issue.severity === 'error'
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 hover:border-amber-400',
                    issue.nodeId ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  <ShieldAlert
                    size={14}
                    className={cn(
                      'shrink-0 mt-0.5',
                      issue.severity === 'error' ? 'text-rose-500' : 'text-amber-500'
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-900 dark:text-white">
                      {issue.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {issue.detail}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

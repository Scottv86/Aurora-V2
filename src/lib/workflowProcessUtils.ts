import { Workflow, WorkflowNode, WorkflowEdge, ModuleField } from '../types/platform';

export interface NextStepAction {
  edgeId?: string;
  targetNodeId: string;
  targetNodeName: string;
  label: string;
  variant?: 'primary' | 'success' | 'destructive' | 'outline';
  isStart?: boolean;
  requiredFieldIds?: string[];
}

export type ScheduledActivityType = 'call' | 'email' | 'meeting' | 'todo' | 'document' | 'reminder';

export interface ScheduledActivity {
  id: string;
  type: ScheduledActivityType;
  summary: string;
  dueDate: string; // YYYY-MM-DD or ISO string
  assignedToName?: string;
  assignedToId?: string;
  note?: string;
  done?: boolean;
  createdAt?: string;
}

export type SlaStatusLevel = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NONE';

export interface SlaTrafficLightInfo {
  level: SlaStatusLevel;
  label: string;
  color: 'rose' | 'amber' | 'emerald' | 'zinc';
  nearestDate?: string;
  nearestActivity?: ScheduledActivity;
  isSlaDeadline?: boolean;
  totalPendingActivities: number;
}

export interface ProcessStage {
  id: string;
  name: string;
  type: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isUpcoming: boolean;
  isDirectNext?: boolean;
  actionLabel?: string;
  variant?: 'primary' | 'success' | 'destructive' | 'outline';
  requiredFieldIds?: string[];
  description?: string;
  isFork?: boolean;
  forkBranches?: ForkBranch[];
  // Automation & Rule metadata
  condition?: string;
  decisionName?: string;
  automatedActions?: Array<{ id: string; name: string; type: string }>;
}

export interface PipelineStep {
  id: string;
  isFork: boolean;
  stages: ProcessStage[];
}

export interface ForkBranch {
  id: string;
  edgeId?: string;
  targetNodeId: string;
  targetNodeName: string;
  label: string;
  variant?: 'primary' | 'success' | 'destructive' | 'outline';
  requiredFieldIds?: string[];
  description?: string;
  condition?: string;
  decisionName?: string;
  automatedActions?: Array<{ id: string; name: string; type: string }>;
}

export interface NextStepResolution {
  hasWorkflow: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  currentStageName: string;
  activeNodeIds: string[];
  primaryAction: NextStepAction | null;
  alternativeActions: NextStepAction[];
  availableTransitions: NextStepAction[];
  forkBranches: ForkBranch[];
  stages: ProcessStage[];
  steps: PipelineStep[];
}

function isStageNode(node: WorkflowNode | undefined): boolean {
  if (!node) return false;
  if (node.isStage !== undefined) return node.isStage;
  return node.type === 'STATUS' || node.type === 'START' || node.type === 'END';
}

function getStageDirectActions(
  stageNodeId: string,
  workflow: Workflow
): Array<{ id: string; name: string; type: string }> {
  const outgoing = workflow.edges.filter(e => e.source === stageNodeId);
  const actions: Array<{ id: string; name: string; type: string }> = [];
  for (const edge of outgoing) {
    const target = workflow.nodes.find(n => n.id === edge.target);
    if (target && target.type === 'ACTION') {
      actions.push({
        id: target.id,
        name: target.name,
        type: (target.config as any)?.actionType || target.type
      });
    }
  }
  return actions;
}

function getDownstreamStageTargets(
  fromNodeId: string,
  workflow: Workflow
): Array<{
  stageNode: WorkflowNode;
  edge: WorkflowEdge;
  condition?: string;
  decisionName?: string;
  actions: Array<{ id: string; name: string; type: string }>;
}> {
  const results: Array<{
    stageNode: WorkflowNode;
    edge: WorkflowEdge;
    condition?: string;
    decisionName?: string;
    actions: Array<{ id: string; name: string; type: string }>;
  }> = [];

  const initialEdges = workflow.edges.filter(e => e.source === fromNodeId);
  for (const edge of initialEdges) {
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    if (!targetNode) continue;

    if (isStageNode(targetNode)) {
      results.push({
        stageNode: targetNode,
        edge,
        condition: edge.condition,
        actions: getStageDirectActions(targetNode.id, workflow)
      });
      continue;
    }

    // Traverse through non-stage nodes (DECISION, ACTION, etc.)
    const queue: Array<{
      currId: string;
      condition?: string;
      decisionName?: string;
      actions: Array<{ id: string; name: string; type: string }>;
    }> = [{
      currId: targetNode.id,
      condition: edge.condition,
      decisionName: targetNode.type === 'DECISION' ? targetNode.name : undefined,
      actions: targetNode.type === 'ACTION' ? [{ id: targetNode.id, name: targetNode.name, type: (targetNode.config as any)?.actionType || targetNode.type }] : []
    }];

    const visited = new Set<string>([targetNode.id]);
    while (queue.length > 0) {
      const item = queue.shift()!;
      const outgoing = workflow.edges.filter(e => e.source === item.currId);
      for (const outEdge of outgoing) {
        if (!visited.has(outEdge.target)) {
          visited.add(outEdge.target);
          const nextNode = workflow.nodes.find(n => n.id === outEdge.target);
          if (nextNode) {
            const nextCondition = outEdge.condition || item.condition;
            const nextDecision = nextNode.type === 'DECISION' ? nextNode.name : item.decisionName;
            const nextActions = nextNode.type === 'ACTION'
              ? [...item.actions, { id: nextNode.id, name: nextNode.name, type: (nextNode.config as any)?.actionType || nextNode.type }]
              : item.actions;

            if (isStageNode(nextNode)) {
              if (!results.some(r => r.stageNode.id === nextNode.id)) {
                results.push({
                  stageNode: nextNode,
                  edge: outEdge,
                  condition: nextCondition,
                  decisionName: nextDecision,
                  actions: [...nextActions, ...getStageDirectActions(nextNode.id, workflow)]
                });
              }
            } else {
              queue.push({
                currId: nextNode.id,
                condition: nextCondition,
                decisionName: nextDecision,
                actions: nextActions
              });
            }
          }
        }
      }
    }
  }

  return results;
}

function mapNodeToProcessStage(
  node: WorkflowNode,
  workflow: Workflow
): ProcessStage {
  const incomingEdges = workflow.edges.filter(e => e.target === node.id);
  const primaryIncoming = incomingEdges.find(e => e.isPrimary) || incomingEdges[0];

  let condition = primaryIncoming?.condition;
  let decisionName: string | undefined;
  const actionsCollected: Array<{ id: string; name: string; type: string }> = [...getStageDirectActions(node.id, workflow)];

  for (const inEdge of incomingEdges) {
    const sourceNode = workflow.nodes.find(n => n.id === inEdge.source);
    if (sourceNode?.type === 'DECISION') {
      decisionName = sourceNode.name;
      if (inEdge.condition) condition = inEdge.condition;
    } else if (sourceNode?.type === 'ACTION') {
      actionsCollected.push({
        id: sourceNode.id,
        name: sourceNode.name,
        type: (sourceNode.config as any)?.actionType || sourceNode.type
      });
    }
  }

  const uniqueActions = actionsCollected.filter((act, index, self) =>
    index === self.findIndex(a => a.id === act.id)
  );

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    isCurrent: false,
    isCompleted: false,
    isUpcoming: false,
    description: node.stageDescription,
    condition,
    decisionName,
    automatedActions: uniqueActions.length > 0 ? uniqueActions : undefined,
    requiredFieldIds: primaryIncoming?.requiredFieldIds || []
  };
}

function resolveDownstreamStageNode(
  nodeId: string,
  workflow: Workflow
): WorkflowNode | null {
  const node = workflow.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  if (isStageNode(node)) return node;

  const queue = [nodeId];
  const visited = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const currId = queue.shift()!;
    const outgoing = workflow.edges.filter(e => e.source === currId);
    outgoing.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        const target = workflow.nodes.find(n => n.id === edge.target);
        if (target && isStageNode(target)) {
          return target;
        }
        queue.push(edge.target);
      }
    }
  }
  return null;
}

function resolvePrecedingStageNode(
  nodeId: string,
  workflow: Workflow,
  history: Array<{ nodeId: string }>
): WorkflowNode | null {
  const node = workflow.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  if (isStageNode(node)) return node;

  // Search history backwards for preceding stage node
  const histIndex = history.findIndex(h => h.nodeId === nodeId);
  const searchHistory = histIndex !== -1 ? history.slice(0, histIndex) : history;
  for (let i = searchHistory.length - 1; i >= 0; i--) {
    const histNode = workflow.nodes.find(n => n.id === searchHistory[i].nodeId);
    if (isStageNode(histNode)) {
      return histNode;
    }
  }

  // Search incoming edges backwards (BFS)
  const queue = [nodeId];
  const visited = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const currId = queue.shift()!;
    const incoming = workflow.edges.filter(e => e.target === currId);
    for (const edge of incoming) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        const sourceNode = workflow.nodes.find(n => n.id === edge.source);
        if (isStageNode(sourceNode)) {
          return sourceNode;
        }
        queue.push(edge.source);
      }
    }
  }

  return null;
}

function canReachNode(
  startId: string,
  targetId: string,
  downstreamMap: Map<string, Array<{ stageNode: WorkflowNode }>>,
  visited = new Set<string>()
): boolean {
  if (startId === targetId) return true;
  visited.add(startId);
  const targets = downstreamMap.get(startId) || [];
  for (const t of targets) {
    if (!visited.has(t.stageNode.id)) {
      if (canReachNode(t.stageNode.id, targetId, downstreamMap, visited)) {
        return true;
      }
    }
  }
  return false;
}

export function buildPipelineSteps(
  workflow: Workflow,
  currentStageIds: Set<string>,
  availableActionTargetIds: Set<string>,
  isCompletedWorkflow: boolean
): { steps: PipelineStep[]; stages: ProcessStage[] } {
  const stageNodes = workflow.nodes.filter(isStageNode);
  if (stageNodes.length === 0) {
    return { steps: [], stages: [] };
  }

  // Pre-calculate downstream stage connections for each stage
  const stageDownstreamMap = new Map<string, ReturnType<typeof getDownstreamStageTargets>>();
  for (const s of stageNodes) {
    stageDownstreamMap.set(s.id, getDownstreamStageTargets(s.id, workflow));
  }

  // Find START node (or node with in-degree 0 from other stages)
  const startNode = stageNodes.find(n => n.type === 'START') || stageNodes[0];

  // Assign topological rank (levels) to each stage in DAG
  const levels = new Map<string, number>();
  levels.set(startNode.id, 0);

  const queue: string[] = [startNode.id];
  const maxVisits = stageNodes.length * 2;
  const visitCount = new Map<string, number>();

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currLevel = levels.get(currId)!;
    const downstream = stageDownstreamMap.get(currId) || [];

    for (const item of downstream) {
      const targetId = item.stageNode.id;
      // Cycle detection: If targetId can reach currId, this edge is a back-edge/loop -> skip forward leveling
      if (canReachNode(targetId, currId, stageDownstreamMap, new Set())) {
        continue;
      }

      const currentTargetLevel = levels.get(targetId);
      const candidateLevel = currLevel + 1;
      const visits = (visitCount.get(targetId) || 0) + 1;
      visitCount.set(targetId, visits);

      if (visits > maxVisits) {
        continue;
      }

      if (currentTargetLevel === undefined || candidateLevel > currentTargetLevel) {
        levels.set(targetId, candidateLevel);
        queue.push(targetId);
      }
    }
  }

  // Any unreachable stage nodes get placed at the end
  let maxLvl = Math.max(-1, ...Array.from(levels.values()));
  for (const s of stageNodes) {
    if (!levels.has(s.id)) {
      levels.set(s.id, ++maxLvl);
    }
  }

  // Group stage nodes by their level
  const levelGroups = new Map<number, WorkflowNode[]>();
  for (const s of stageNodes) {
    const lvl = levels.get(s.id) ?? 0;
    if (!levelGroups.has(lvl)) {
      levelGroups.set(lvl, []);
    }
    levelGroups.get(lvl)!.push(s);
  }

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  // Identify current level in pipeline
  let currentLevel = -1;
  for (const s of stageNodes) {
    if (currentStageIds.has(s.id)) {
      currentLevel = levels.get(s.id) ?? -1;
      break;
    }
  }

  const steps: PipelineStep[] = [];
  const stages: ProcessStage[] = [];

  for (const lvl of sortedLevels) {
    const nodesInLevel = levelGroups.get(lvl)!;
    const isFork = nodesInLevel.length > 1;

    const stepStages: ProcessStage[] = nodesInLevel.map(node => {
      const mapped = mapNodeToProcessStage(node, workflow);
      const isCurrent = currentStageIds.has(node.id);
      const isCompletedStage = isCompletedWorkflow || (currentLevel !== -1 && lvl < currentLevel);
      const isUpcoming = !isCurrent && !isCompletedStage;
      const isDirectNext = !isCurrent && !isCompletedStage && availableActionTargetIds.has(node.id);

      const stageObj: ProcessStage = {
        ...mapped,
        isCurrent,
        isCompleted: isCompletedStage,
        isUpcoming,
        isDirectNext,
        isFork
      };
      stages.push(stageObj);
      return stageObj;
    });

    steps.push({
      id: `step_${lvl}`,
      isFork,
      stages: stepStages
    });
  }

  return { steps, stages };
}

export function resolveRecordNextStep(
  record: any,
  workflow: Workflow | null | undefined,
  _allFields?: ModuleField[]
): NextStepResolution {
  if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
    return {
      hasWorkflow: false,
      isStarted: false,
      isCompleted: false,
      currentStageName: record?.status || '',
      activeNodeIds: [],
      primaryAction: null,
      alternativeActions: [],
      availableTransitions: [],
      forkBranches: [],
      stages: [],
      steps: []
    };
  }

  const wState = record?.workflowState as any;
  const rawActiveIds: string[] = wState?.activeNodeIds || (wState?.currentNodeId ? [wState.currentNodeId] : []);
  const history: Array<{ nodeId: string; timestamp?: string }> = wState?.history || [];

  // Determine stage nodes for the workflow
  const allStageNodes = workflow.nodes.filter(isStageNode);

  // If workflow has not started yet
  if (rawActiveIds.length === 0) {
    const startNode = workflow.nodes.find(n => n.type === 'START') || workflow.nodes[0];
    const { steps, stages } = buildPipelineSteps(
      workflow,
      new Set(startNode ? [startNode.id] : []),
      new Set(),
      false
    );

    return {
      hasWorkflow: true,
      isStarted: false,
      isCompleted: false,
      currentStageName: 'Not Started',
      activeNodeIds: [],
      primaryAction: startNode ? {
        targetNodeId: startNode.id,
        targetNodeName: startNode.name,
        label: 'Start Workflow',
        variant: 'primary',
        isStart: true
      } : null,
      alternativeActions: [],
      availableTransitions: [],
      forkBranches: [],
      stages,
      steps
    };
  }

  // 1. Identify current active stage node(s)
  const currentStageNodes: WorkflowNode[] = [];
  for (const nodeId of rawActiveIds) {
    const stage = resolvePrecedingStageNode(nodeId, workflow, history);
    if (stage && !currentStageNodes.some(s => s.id === stage.id)) {
      currentStageNodes.push(stage);
    }
  }

  // Fallback: match by record.status if active nodes didn't yield a stage
  if (currentStageNodes.length === 0 && record?.status) {
    const matchingNode = allStageNodes.find(
      n => n.name.trim().toLowerCase() === String(record.status).trim().toLowerCase()
    );
    if (matchingNode) {
      currentStageNodes.push(matchingNode);
    }
  }

  const currentStageNames = currentStageNodes.map(s => s.name);
  const currentStageName = currentStageNames.length > 0 ? currentStageNames.join(' / ') : (record?.status || 'Active');

  // Check if all active nodes are END nodes
  const isCompleted = rawActiveIds.every(id => {
    const n = workflow.nodes.find(node => node.id === id);
    return n?.type === 'END';
  });

  const currentStageIds = new Set(currentStageNodes.map(s => s.id));

  // Collect available transitions from raw active nodes
  const candidateEdges: WorkflowEdge[] = [];
  for (const nodeId of rawActiveIds) {
    const nodeEdges = wState?.transitions || workflow.edges?.filter(e => e.source === nodeId) || [];
    for (const edge of nodeEdges) {
      if (!candidateEdges.some(e => e.id === edge.id)) {
        candidateEdges.push(edge);
      }
    }
  }

  // Fallback: If no candidate edges were found from rawActiveIds, check currentStageNodes
  if (candidateEdges.length === 0 && currentStageNodes.length > 0) {
    for (const st of currentStageNodes) {
      const nodeEdges = workflow.edges?.filter(e => e.source === st.id) || [];
      for (const edge of nodeEdges) {
        if (!candidateEdges.some(e => e.id === edge.id)) {
          candidateEdges.push(edge);
        }
      }
    }
  }

  // Transform edges into NextStepActions
  const actions: NextStepAction[] = [];
  for (const edge of candidateEdges) {
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    const stageNode = targetNode && isStageNode(targetNode)
      ? targetNode
      : (targetNode ? resolveDownstreamStageNode(targetNode.id, workflow) : null);

    if (stageNode) {
      const label = edge.actionButtonLabel || edge.label || (stageNode ? `Move to ${stageNode.name}` : 'Next Step');
      let variant = edge.buttonVariant;
      if (!variant) {
        const lower = (label + ' ' + stageNode.name).toLowerCase();
        if (lower.includes('reject') || lower.includes('cancel') || lower.includes('decline') || lower.includes('fail') || lower.includes('close')) {
          variant = 'destructive';
        } else if (lower.includes('approve') || lower.includes('complete') || lower.includes('done') || lower.includes('finish') || lower.includes('publish') || lower.includes('accept')) {
          variant = 'success';
        } else {
          variant = 'primary';
        }
      }

      actions.push({
        edgeId: edge.id,
        targetNodeId: stageNode.id,
        targetNodeName: stageNode.name,
        label,
        variant,
        requiredFieldIds: edge.requiredFieldIds || []
      });
    }
  }

  // Deduplicate branches targeting the same stage
  const uniqueBranchStages = new Map<string, ForkBranch>();
  for (const a of actions) {
    if (!uniqueBranchStages.has(a.targetNodeId)) {
      uniqueBranchStages.set(a.targetNodeId, {
        id: `branch_${a.targetNodeId}`,
        edgeId: a.edgeId,
        targetNodeId: a.targetNodeId,
        targetNodeName: a.targetNodeName,
        label: a.label,
        variant: a.variant,
        requiredFieldIds: a.requiredFieldIds,
        description: workflow.nodes.find(n => n.id === a.targetNodeId)?.stageDescription
      });
    }
  }
  const forkBranches: ForkBranch[] = Array.from(uniqueBranchStages.values());
  const isFork = forkBranches.length > 1;

  // Pick primary action
  let primaryAction: NextStepAction | null = null;
  const nonPrimaryActions: NextStepAction[] = [];

  const explicitPrimaryIndex = candidateEdges.findIndex(e => e.isPrimary);
  if (explicitPrimaryIndex >= 0 && actions[explicitPrimaryIndex]) {
    primaryAction = actions[explicitPrimaryIndex];
    actions.forEach((a, i) => {
      if (i !== explicitPrimaryIndex) nonPrimaryActions.push(a);
    });
  } else {
    const firstNonDestructiveIndex = actions.findIndex(a => a.variant !== 'destructive');
    if (firstNonDestructiveIndex >= 0) {
      primaryAction = actions[firstNonDestructiveIndex];
      actions.forEach((a, i) => {
        if (i !== firstNonDestructiveIndex) nonPrimaryActions.push(a);
      });
    } else if (actions.length > 0) {
      primaryAction = actions[0];
      actions.slice(1).forEach(a => nonPrimaryActions.push(a));
    }
  }

  const availableActionTargetIds = new Set(actions.map(a => a.targetNodeId));
  const { steps, stages } = buildPipelineSteps(
    workflow,
    currentStageIds,
    availableActionTargetIds,
    isCompleted
  );

  return {
    hasWorkflow: true,
    isStarted: true,
    isCompleted,
    currentStageName,
    activeNodeIds: rawActiveIds,
    primaryAction,
    alternativeActions: nonPrimaryActions,
    availableTransitions: actions,
    forkBranches,
    stages,
    steps
  };
}

/**
 * Checks whether any required fields on a transition edge are missing/empty on the record.
 * Returns an array of ModuleField objects (or synthetic fields) that need values.
 */
export function checkMissingRequiredFields(
  requiredFieldIds: string[] | undefined,
  record: any,
  allFields?: ModuleField[]
): ModuleField[] {
  if (!requiredFieldIds || requiredFieldIds.length === 0) return [];

  const missing: ModuleField[] = [];

  for (const fieldId of requiredFieldIds) {
    const fieldDef = allFields?.find(f => f.id === fieldId || f.name === fieldId);
    
    // Check if value exists on record root or record.data
    const val = record?.[fieldId] ?? 
                record?.data?.[fieldId] ?? 
                (fieldDef ? (record?.[fieldDef.name] ?? record?.data?.[fieldDef.name]) : undefined);

    const isFilled = val !== undefined && 
                     val !== null && 
                     val !== '' && 
                     !(Array.isArray(val) && val.length === 0);

    if (!isFilled) {
      if (fieldDef) {
        missing.push(fieldDef);
      } else {
        missing.push({
          id: fieldId,
          name: fieldId,
          label: fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text'
        } as ModuleField);
      }
    }
  }

  return missing;
}

/**
 * Evaluates record's pending scheduled activities and SLA deadline to determine traffic light status:
 * 🔴 OVERDUE: Task/SLA due date was before today
 * 🟡 TODAY: Task/SLA is due today
 * 🟢 UPCOMING: Task/SLA is due in the future
 */
export function resolveRecordSlaStatus(record: any): SlaTrafficLightInfo {
  if (!record) {
    return { level: 'NONE', label: '', color: 'zinc', totalPendingActivities: 0 };
  }

  // 1. Gather pending activities from record._activities or record.data._activities
  const rawActivities: ScheduledActivity[] = 
    record._activities || 
    record.data?._activities || 
    (Array.isArray(record.activities) ? record.activities : []);

  const pendingActivities = rawActivities.filter(a => !a.done);

  // 2. Candidate items with dates
  interface DateCandidate {
    date: Date;
    dateStr: string;
    isSlaDeadline: boolean;
    activity?: ScheduledActivity;
  }

  const candidates: DateCandidate[] = [];

  // Check SLA deadline
  if (record.slaDeadline) {
    const slaDate = new Date(record.slaDeadline);
    if (!isNaN(slaDate.getTime())) {
      candidates.push({
        date: slaDate,
        dateStr: record.slaDeadline,
        isSlaDeadline: true
      });
    }
  }

  // Check activities
  for (const act of pendingActivities) {
    if (act.dueDate) {
      const d = new Date(act.dueDate);
      if (!isNaN(d.getTime())) {
        candidates.push({
          date: d,
          dateStr: act.dueDate,
          isSlaDeadline: false,
          activity: act
        });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      level: 'NONE',
      label: '',
      color: 'zinc',
      totalPendingActivities: 0
    };
  }

  // Sort candidates by date ascending (most urgent first)
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const urgent = candidates[0];

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(urgent.date.getFullYear(), urgent.date.getMonth(), urgent.date.getDate());

  const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / 86400000);

  if (diffDays < 0) {
    // Overdue
    const absDays = Math.abs(diffDays);
    const dayText = absDays === 1 ? '1d' : `${absDays}d`;
    const label = urgent.isSlaDeadline 
      ? `SLA Overdue (${dayText})` 
      : `${urgent.activity?.summary || 'Activity'} (${dayText} overdue)`;

    return {
      level: 'OVERDUE',
      label,
      color: 'rose',
      nearestDate: urgent.dateStr,
      nearestActivity: urgent.activity,
      isSlaDeadline: urgent.isSlaDeadline,
      totalPendingActivities: pendingActivities.length
    };
  } else if (diffDays === 0) {
    // Due Today
    const label = urgent.isSlaDeadline 
      ? 'SLA Due Today' 
      : `${urgent.activity?.summary || 'Activity'} (Due today)`;

    return {
      level: 'TODAY',
      label,
      color: 'amber',
      nearestDate: urgent.dateStr,
      nearestActivity: urgent.activity,
      isSlaDeadline: urgent.isSlaDeadline,
      totalPendingActivities: pendingActivities.length
    };
  } else {
    // Upcoming
    const dayText = diffDays === 1 ? 'Tomorrow' : `in ${diffDays}d`;
    const label = urgent.isSlaDeadline 
      ? `SLA due ${dayText}` 
      : `${urgent.activity?.summary || 'Activity'} (${dayText})`;

    return {
      level: 'UPCOMING',
      label,
      color: 'emerald',
      nearestDate: urgent.dateStr,
      nearestActivity: urgent.activity,
      isSlaDeadline: urgent.isSlaDeadline,
      totalPendingActivities: pendingActivities.length
    };
  }
}

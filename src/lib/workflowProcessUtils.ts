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
  description?: string;
}

export interface NextStepResolution {
  hasWorkflow: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  currentStageName: string;
  activeNodeIds: string[];
  primaryAction: NextStepAction | null;
  alternativeActions: NextStepAction[];
  stages: ProcessStage[];
}

function isStageNode(node: WorkflowNode | undefined): boolean {
  if (!node) return false;
  if (node.isStage !== undefined) return node.isStage;
  return node.type === 'STATUS' || node.type === 'START' || node.type === 'END';
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
      stages: []
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
    
    // Trace planned path downstream from start node
    const plannedStages: WorkflowNode[] = [];
    if (startNode) {
      if (isStageNode(startNode)) plannedStages.push(startNode);
      const queue = [startNode.id];
      const visited = new Set<string>([startNode.id]);
      while (queue.length > 0) {
        const currId = queue.shift()!;
        const outgoing = workflow.edges.filter(e => e.source === currId);
        // Follow primary edges first
        outgoing.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
        for (const edge of outgoing) {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            const targetNode = workflow.nodes.find(n => n.id === edge.target);
            if (targetNode && isStageNode(targetNode) && !plannedStages.some(s => s.id === targetNode.id)) {
              plannedStages.push(targetNode);
            }
            queue.push(edge.target);
          }
        }
      }
    }

    const stagesToRender = plannedStages.length > 0 ? plannedStages : allStageNodes;
    const stages: ProcessStage[] = stagesToRender.map((n, idx) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      isCurrent: idx === 0,
      isCompleted: false,
      isUpcoming: idx > 0,
      description: n.stageDescription
    }));

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
      stages
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

  // 2. Collect History Stages (actually traversed path, in chronological order)
  const currentStageIds = new Set(currentStageNodes.map(s => s.id));
  const historyStages: WorkflowNode[] = [];

  for (const h of history) {
    const stage = resolvePrecedingStageNode(h.nodeId, workflow, history);
    if (stage && !currentStageIds.has(stage.id)) {
      if (!historyStages.some(s => s.id === stage.id)) {
        historyStages.push(stage);
      }
    }
  }

  // If history was empty but currentStageNodes is downstream of START, include START
  if (historyStages.length === 0 && currentStageNodes.length > 0) {
    const startNode = workflow.nodes.find(n => n.type === 'START');
    if (startNode && !currentStageIds.has(startNode.id)) {
      historyStages.push(startNode);
    }
  }

  // 3. Collect Reachable Downstream Stages (forward BFS along active branch only)
  const downstreamStages: WorkflowNode[] = [];
  const visitedForward = new Set<string>();
  const forwardQueue: string[] = [];

  [...rawActiveIds, ...currentStageNodes.map(s => s.id)].forEach(id => {
    if (!visitedForward.has(id)) {
      visitedForward.add(id);
      forwardQueue.push(id);
    }
  });

  while (forwardQueue.length > 0) {
    const currId = forwardQueue.shift()!;
    const outgoing = workflow.edges.filter(e => e.source === currId);
    
    // Follow primary edges first
    outgoing.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

    for (const edge of outgoing) {
      if (!visitedForward.has(edge.target)) {
        visitedForward.add(edge.target);
        const targetNode = workflow.nodes.find(n => n.id === edge.target);
        if (targetNode) {
          if (isStageNode(targetNode)) {
            if (
              !currentStageIds.has(targetNode.id) &&
              !historyStages.some(s => s.id === targetNode.id) &&
              !downstreamStages.some(s => s.id === targetNode.id)
            ) {
              downstreamStages.push(targetNode);
            }
          }
          forwardQueue.push(edge.target);
        }
      }
    }
  }

  // 4. Assemble the Path-Aware Pipeline
  const stages: ProcessStage[] = [
    ...historyStages.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      isCurrent: false,
      isCompleted: true,
      isUpcoming: false,
      description: n.stageDescription
    })),
    ...currentStageNodes.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      isCurrent: true,
      isCompleted: isCompleted,
      isUpcoming: false,
      description: n.stageDescription
    })),
    ...downstreamStages.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      isCurrent: false,
      isCompleted: false,
      isUpcoming: true,
      description: n.stageDescription
    }))
  ];

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

  // Transform edges into NextStepActions
  const actions: NextStepAction[] = candidateEdges.map(edge => {
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    const label = edge.actionButtonLabel || edge.label || (targetNode ? `Move to ${targetNode.name}` : 'Next Step');
    
    let variant = edge.buttonVariant;
    if (!variant) {
      const lower = label.toLowerCase();
      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('decline') || lower.includes('fail')) {
        variant = 'destructive';
      } else if (lower.includes('approve') || lower.includes('complete') || lower.includes('done') || lower.includes('finish') || lower.includes('publish')) {
        variant = 'success';
      } else {
        variant = 'primary';
      }
    }

    return {
      edgeId: edge.id,
      targetNodeId: edge.target,
      targetNodeName: targetNode?.name || 'Next Step',
      label,
      variant,
      requiredFieldIds: edge.requiredFieldIds || []
    };
  });

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

  return {
    hasWorkflow: true,
    isStarted: true,
    isCompleted,
    currentStageName,
    activeNodeIds: rawActiveIds,
    primaryAction,
    alternativeActions: nonPrimaryActions,
    stages
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

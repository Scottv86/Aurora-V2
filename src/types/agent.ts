import { ContextSource } from './solutions';

export type AgentStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type AgentToolType = 
  | 'CONNECTOR' 
  | 'DATABASE_QUERY' 
  | 'WORKFLOW_TRIGGER' 
  | 'WEBHOOK' 
  | 'REST_API' 
  | 'FILE_PARSER' 
  | 'SUB_AGENT';

export interface AgentCustomToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface AgentCustomToolConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  bodyTemplate?: string;
  parameterSchema: AgentCustomToolParameter[];
}

export interface AgentSubAgentConfig {
  targetAgentId: string;
  targetAgentName: string;
  targetAgentRole?: string;
  delegationPromptTemplate?: string;
}

export interface AgentToolBinding {
  id: string;
  name: string;
  type: AgentToolType;
  description: string;
  enabled: boolean;
  requiresApproval?: boolean;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  config?: Record<string, any>;
  customConfig?: AgentCustomToolConfig;
  subAgentConfig?: AgentSubAgentConfig;
  icon?: string;
}

export interface AgentGuardrails {
  confidenceThreshold: number; // 0.0 - 1.0 (e.g. 0.85 requires approval below this)
  requireHumanApproval: boolean;
  approvalThresholdAmount?: number; // e.g. actions with value > $500 require approval
  readOnlyMode: boolean; // if true, mutations are blocked
  maxTokensPerExecution: number;
  allowedDomains: string[];
  sensitiveDataFilter: boolean;
}

export interface AgentModelConfig {
  model: string; // e.g. 'gemini-2.5-flash', 'gemini-2.5-pro', 'claude-3-7-sonnet', 'gpt-4o'
  temperature: number; // 0.0 - 1.0
  topP: number;
  maxOutputTokens: number;
  systemPersona: string; // e.g. 'Analytical, precise, and supportive'
}

export interface AgentFewShotExample {
  id: string;
  userInput: string;
  expectedThought?: string;
  expectedToolCall?: string;
  expectedOutput: string;
}

export interface AgentTraceStep {
  id: string;
  type: 'thought' | 'tool_call' | 'context_retrieval' | 'guardrail_check' | 'sub_agent_call' | 'memory_retrieval' | 'memory_write' | 'final_response';
  title: string;
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  subAgentName?: string;
  childTraces?: AgentTraceStep[];
  status: 'running' | 'success' | 'warning' | 'error';
  latencyMs?: number;
  timestamp: string;
}

export interface AgentSandboxMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  traces?: AgentTraceStep[];
  tokensUsed?: number;
  confidenceScore?: number;
  requiresApproval?: boolean;
  isStreaming?: boolean;
}

export interface AgentArchitectChatMessage {
  id: string;
  role: 'architect' | 'user';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  appliedChangesSummary?: string;
  proposedBlueprintDelta?: Partial<AgentBlueprint>;
}

export interface AgentWorkforceMapping {
  assignedMemberId?: string;
  teamId?: string;
  teamName?: string;
  role: string; // e.g. 'Operations Copilot'
  licenceType: string; // e.g. 'AI Agent Seat'
}

export interface AgentQueueAutoPilotConfig {
  enabled: boolean;
  queueId?: string;
  queueName?: string;
  autoProcessNewItems: boolean;
  pollingIntervalMinutes: number;
  autoResolveConfidenceThreshold: number;
  filterTags?: string[];
}

export interface AgentMemoryEntry {
  id: string;
  userId?: string;
  userName?: string;
  category: 'PREFERENCE' | 'FACT' | 'PREVIOUS_INTERACTION' | 'ACCOUNT_STATE';
  key: string;
  value: string;
  confidence: number;
  createdAt: string;
  lastAccessedAt?: string;
}

export interface AgentMemoryConfig {
  enabled: boolean;
  memoryType: 'EPISODIC' | 'SEMANTIC_USER_PROFILES' | 'FULL_HYBRID';
  retentionDays: number; // e.g. 30, 90, 365, 0 = indefinite
  autoExtractEntities: boolean;
  maxMemoriesInjected: number;
  entries: AgentMemoryEntry[];
}

export interface AgentRunLog {
  id: string;
  timestamp: string;
  trigger: 'MANUAL' | 'WORKFLOW' | 'QUEUE' | 'SUBAGENT';
  status: 'SUCCESS' | 'ESCALATED' | 'FAILED';
  tokensUsed: number;
  latencyMs: number;
  query: string;
  response: string;
  toolsUsed: string[];
  traces: AgentTraceStep[];
}

export interface AgentAnalyticsMetrics {
  totalExecutions: number;
  successRate: number; // 0 - 100
  avgLatencyMs: number;
  totalTokens: number;
  hitlEscalationsCount: number;
  recentRunLogs: AgentRunLog[];
}

export interface AgentVersionSnapshot {
  version: string;
  createdAt: string;
  changelog?: string;
  blueprint: AgentBlueprint;
}

export interface AgentBlueprint {
  id: string;
  name: string;
  roleTitle: string;
  description: string;
  avatarUrl?: string;
  status: AgentStatus;
  version: string;
  author?: string;
  updatedAt: string;
  modelConfig: AgentModelConfig;
  systemInstructions: string;
  fewShotExamples: AgentFewShotExample[];
  knowledgeSources: ContextSource[];
  tools: AgentToolBinding[];
  guardrails: AgentGuardrails;
  workforceMapping: AgentWorkforceMapping;
  queueAutoPilot?: AgentQueueAutoPilotConfig;
  memory?: AgentMemoryConfig;
  analytics?: AgentAnalyticsMetrics;
  versionHistory?: AgentVersionSnapshot[];
  chatHistory?: AgentArchitectChatMessage[];
  sandboxMessages?: AgentSandboxMessage[];
}

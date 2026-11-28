export type RoleType = 'SYSTEM' | 'SOLUTION' | 'CUSTOM' | 'PORTAL';
export type RoleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type RowScope = 'ALL' | 'TEAM' | 'OWNED';
export type FieldVisibility = 'editable' | 'readonly' | 'masked' | 'hidden';
export type AIPolicyDecision = 'ALLOW' | 'DENY' | 'INHERIT';

export interface FieldPolicyConfig {
  visibility: FieldVisibility;
}

export interface ModulePolicy {
  access: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  rowScope: RowScope;
  fields?: Record<string, FieldPolicyConfig>;
}

export interface WorkflowPolicy {
  allowedQueueIds?: string[];
  allowedWorkflowIds?: string[];
  allowedTransitions?: Record<string, string[]>; // workflowId -> transition/node IDs
  canApprove?: boolean;
  maxApprovalAmount?: number | null;
}

export interface RolePolicy {
  id: string;
  tenantId?: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  type: RoleType;
  status: RoleStatus;
  icon?: string | null;
  color?: string | null;
  capabilities: string[];
  modulePolicies: Record<string, ModulePolicy>;
  workflowPolicies: WorkflowPolicy;
  aiPolicies: Record<string, AIPolicyDecision>;
  parentGroupId?: string | null;
  parentGroup?: { id: string; name: string; color?: string | null } | null;
  solutionId?: string | null;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EffectivePolicyTrace {
  sourceRoleId: string;
  sourceRoleName: string;
  inherited: boolean;
}

export interface RoleSimulationResult {
  roleId: string;
  roleName: string;
  inheritanceChain: Array<{ id: string; name: string }>;
  effectiveCapabilities: Array<{ key: string; sourceRoleId: string; sourceRoleName: string; inherited: boolean }>;
  effectiveModulePolicies: Record<string, ModulePolicy & { sourceRoleName: string; inherited: boolean }>;
  effectiveWorkflowPolicies: WorkflowPolicy;
  effectiveAIPolicies: Record<string, { decision: AIPolicyDecision; sourceRoleName: string; inherited: boolean }>;
}

export interface CapabilityItem {
  key: string;
  label: string;
  description: string;
}

export interface CapabilityCategory {
  id: string;
  category: string;
  wildcardKey: string;
  items: CapabilityItem[];
}

export const PLATFORM_CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    id: 'staff',
    category: 'Staff & Workforce',
    wildcardKey: 'staff:*',
    items: [
      { key: 'view:staff', label: 'View Employee Directory', description: 'See all staff profiles, teams, and contact details.' },
      { key: 'manage:staff', label: 'Modify Personnel Records', description: 'Edit profiles, change job titles, and update member details.' },
      { key: 'invite:staff', label: 'Invite & Onboard', description: 'Send workspace invitations and provision new members.' },
      { key: 'decommission:staff', label: 'Decommission Staff', description: 'Disable accounts and offboard staff members.' }
    ]
  },
  {
    id: 'teams',
    category: 'Teams & Positions',
    wildcardKey: 'teams:*',
    items: [
      { key: 'view:teams', label: 'View Teams', description: 'Browse organizational structure and team memberships.' },
      { key: 'manage:teams', label: 'Manage Teams', description: 'Create teams, change managers, and reassign members.' },
      { key: 'view:positions', label: 'View Positions', description: 'Browse position descriptions and pay grades.' },
      { key: 'manage:positions', label: 'Manage Positions', description: 'Create and refine position definitions across the org.' }
    ]
  },
  {
    id: 'platform',
    category: 'Platform & Security',
    wildcardKey: 'platform:*',
    items: [
      { key: 'view:settings', label: 'View Platform Settings', description: 'Access workspace configuration and builder libraries.' },
      { key: 'manage:settings', label: 'Manage Platform Settings', description: 'Modify branding, roles, integrations, and global defaults.' },
      { key: 'view:audit_logs', label: 'View Audit Logs', description: 'Inspect system-wide activity, security events, and change history.' },
      { key: 'manage:billing', label: 'Billing & Financials', description: 'Manage subscriptions, invoices, and plan upgrades.' }
    ]
  },
  {
    id: 'data',
    category: 'Data & Builders',
    wildcardKey: 'data:*',
    items: [
      { key: 'manage:modules', label: 'Application & Schema Builder', description: 'Create and modify modules, forms, workflows, and pages.' },
      { key: 'create:records', label: 'Create Records', description: 'General permission to add new entries across active modules.' },
      { key: 'delete:records', label: 'Delete Records', description: 'Permanently remove or trash data entries.' },
      { key: 'export:records', label: 'Export Data', description: 'Export module records, searches, and reports to CSV/PDF.' }
    ]
  }
];

export const AI_GOVERNANCE_FEATURES: Array<{ key: string; label: string; category: string }> = [
  { key: 'ai:antigravity_agent', label: 'Aurora AI Assistant', category: 'Core AI' },
  { key: 'ai:agent_builder', label: 'Autonomous Agent Builder', category: 'Builders' },
  { key: 'ai:solution_builder', label: 'AI Solution Orchestrator', category: 'Builders' },
  { key: 'ai:form_builder', label: 'AI Form Generation', category: 'Builders' },
  { key: 'ai:page_builder', label: 'AI Page Generation', category: 'Builders' },
  { key: 'ai:report_generator', label: 'AI Report & Chart Generator', category: 'Analytics' },
  { key: 'ai:ask_aurora_filter', label: 'Natural Language Search & Filters', category: 'Analytics' },
  { key: 'ai:record_summary', label: 'AI Record Summarization', category: 'Workspace' },
  { key: 'ai:workflow_actions', label: 'AI Workflow Actions', category: 'Automation' },
  { key: 'ai:document_template', label: 'AI Document Templates', category: 'Content' },
  { key: 'ai:document_ocr', label: 'Document OCR & Extraction', category: 'Content' },
  { key: 'ai:document_redaction', label: 'AI PII Detection & Redaction', category: 'Content' },
  { key: 'ai:smart_inbox', label: 'Smart Inbox Triage', category: 'Workspace' },
  { key: 'ai:public_portal_chat', label: 'Public Portal AI Chat', category: 'External' }
];

export const DEFAULT_MODULE_POLICY: ModulePolicy = {
  access: true,
  create: true,
  read: true,
  update: true,
  delete: false,
  export: false,
  rowScope: 'ALL',
  fields: {}
};

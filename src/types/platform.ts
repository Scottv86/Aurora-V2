/**
 * Aurora Platform Types
 */

export type Environment = 'DEV' | 'QA' | 'UAT' | 'PROD';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  createdAt: string;
  environments: Environment[];
  currentEnvironment: Environment;
  enabledApps?: string[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    faviconUrl?: string;
  };
  localization?: {
    timezone?: string;
    language?: string;
    currency?: string;
    dateFormat?: string;
  };
  metadata?: {
    industry?: string;
    website?: string;
    contactEmail?: string;
    siteTitle?: string;
    metaDescription?: string;
    socialImage?: string;
  };
  workspaceSettings?: {
    defaultModuleVisibility?: 'public' | 'private';
    autoCategorization?: boolean;
    archivingPolicyDays?: number;
  };
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  icon: string;
  suites: Suite[];
}

export interface Suite {
  id: string;
  name: string;
  description: string;
  modules: Module[];
}

export type FieldType = 
  | 'text' | 'longText' | 'number' | 'checkbox' | 'currency' | 'email' | 'phone' | 'address' | 'lookup' | 'user' | 'calculation' | 'ai_summary' | 'date' | 'select'
  | 'radio' | 'checkboxGroup' | 'toggle' | 'slider' | 'time' | 'button' | 'buttonGroup' | 'icon' | 'card' | 'richtext' | 'accordion' | 'datatable' | 'stepper' 
  | 'timeline' | 'duallist' | 'treeview' | 'signature' | 'payment' | 'colorpicker' | 'map' | 'html' | 'qr_scanner' | 'canvas' | 'chat' | 'tabs_nested' 
  | 'rating' | 'progress' | 'tag' | 'video' | 'audio' | 'heading' | 'divider' | 'spacer' | 'alert' | 'url' | 'fieldGroup' | 'group' | 'repeatableGroup' | 'connector';

export interface ModuleField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  helperText?: string;
  calculationLogic?: string;
  targetModuleId?: string;
  targetPlatformModuleId?: string;
  globalListId?: string;
  connectorId?: string;
  lookupSource?: 'module_records' | 'global_list' | 'tenant_users' | 'platform' | 'connector';
  platformEntity?: 'users' | 'teams' | 'roles' | 'security_groups' | 'modules' | 'records';
  lookupFilters?: LookupFilter[];
  optionsSource?: 'manual' | 'global_list' | 'platform' | 'module_records' | 'connector';
  fields?: ModuleField[]; // For nested structures like fieldGroup or repeatableGroup
  
  // Lookup enhancements
  lookupDisplayField?: string;
  lookupOutputMappings?: { id: string; sourceFieldId: string; targetFieldId: string }[];
  
  // Layout metadata (Modern Grid)
  colSpan?: number; // 1-12
  startCol?: number; // 1-12
  rowIndex?: number; // 0-indexed
  tabId?: string;
  visibilityRule?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
    value: any;
  };
}

export type ModuleType = 'RECORD' | 'WORK_ITEM' | 'REGISTRY' | 'LOG' | 'FINANCIAL';

export interface LookupFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty';
  value: any;
}

export interface ModuleConfig {
  titleFieldId?: string;
  [key: string]: any;
}

export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description: string;
  icon: any; // Can be a string (Lucide icon name) or a component
  category: string;
  enabled: boolean;
  isCustom?: boolean;
  layout: ModuleField[];
  fields?: ModuleField[]; // Deprecated: use layout instead
  tabs?: { id: string; label: string }[];
  workflow?: Workflow;
  workflows?: Workflow[];

  // Record Key Configuration
  recordKeyPrefix?: string;
  recordKeySuffix?: string;
  nextKeyNumber?: number;

  config?: ModuleConfig;
}


export type WorkflowNodeType = 'STATUS' | 'DECISION' | 'ACTION' | 'DELAY' | 'START' | 'END' | 'ZONE';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config?: Record<string, any>;
  position?: { x: number; y: number }; // Visual positioning
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // Aurora expression syntax
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}


export interface GlobalObject {
  id: string;
  type: 'CONTACT' | 'ORG' | 'ADDRESS' | 'NOTE' | 'TASK';
  data: Record<string, any>;
}

export interface BusinessLogic {
  id: string;
  name: string;
  type: 'FORMULA' | 'PROCEDURE' | 'TRIGGER' | 'SCHEDULE';
  expression: string;
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF' | 'EXTERNAL' | string;
  licenceType: 'Developer' | 'Standard' | string;
  isSuperAdmin?: boolean;
  tenantId?: string;
  avatarUrl?: string;
  position?: string;
  capabilities?: string[];
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  moduleId?: string;
  content: string;
  status: 'Draft' | 'Published' | 'Archived';
  version: number;
  createdAt?: string | number | { seconds: number; nanoseconds: number };
  updatedAt?: string | number | { seconds: number; nanoseconds: number };
  createdBy?: string;
}

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  templateId: string;
  templateVersion?: number;
  recordId?: string;
  moduleId?: string;
  name: string;
  url?: string;
  status: 'Draft' | 'Final' | 'Issued' | 'Approved';
  generatedAt: string | number | { seconds: number; nanoseconds: number };
  generatedBy?: string;
  dataSnapshot?: Record<string, any>;
  content?: string;
}
export interface PlanQuota {
  developerSeats: number;
  standardSeats: number;
  price: number;
}

export interface BillingUsage {
  plan: string;
  quota: PlanQuota;
  usage: {
    developer: number;
    standard: number;
  };
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  downloadUrl: string;
}

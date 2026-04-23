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

export type FieldType = 'text' | 'longText' | 'number' | 'checkbox' | 'currency' | 'email' | 'phone' | 'address' | 'lookup' | 'user' | 'calculation' | 'ai_summary' | 'date' | 'select';

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
  fields?: ModuleField[]; // For nested structures if needed in the future
  colSpan?: number; // 1-12
  startCol?: number; // 1-12
}

export interface ModuleColumn {
  id: string;
  fields: ModuleField[];
}

export interface ModuleLayout {
  id: string;
  columnCount: number;
  tabId?: string;
  columns: ModuleColumn[];
}

export type ModuleType = 'RECORD' | 'WORK_ITEM' | 'REGISTRY' | 'LOG' | 'FINANCIAL';

export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  isCustom?: boolean;
  layout: ModuleLayout[];
  tabs?: { id: string; label: string }[];
  workflow?: { statuses: { name: string }[] };
  workflows?: Workflow[];
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'MANUAL' | 'AUTOMATED' | 'AI_ASSISTED';
  assignee?: string;
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

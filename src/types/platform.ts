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

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  schema?: any;
  tabs?: { id: string; label: string }[];
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
  data: any;
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
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF' | 'EXTERNAL';
  tenantId?: string;
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
  createdAt?: any;
  updatedAt?: any;
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
  generatedAt: any;
  generatedBy?: string;
  dataSnapshot?: any;
  content?: string;
}

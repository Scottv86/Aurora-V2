export type EntityDomain =
  | 'module_record'       // Dynamic Module Record
  | 'directory_person'    // People Directory (Individual)
  | 'directory_org'       // Organization Directory (Company)
  | 'workforce_member'    // Tenant Member / Employee
  | 'workforce_team'      // Team / Department
  | 'workforce_position'  // Org Chart Position
  | 'triage_submission'   // Inbound Triage Submission
  | 'approval_item'       // Pending Approval Request
  | 'service_ticket'      // Support Ticket / Live Chat Session
  | 'document'            // Docs App Document / Drive File
  | 'financial_invoice'   // Invoice / Bill / Credit Note
  | 'builder_module'      // Studio Module Definition
  | 'builder_page';       // Workspace Page Definition

export interface ActiveEntityContext {
  domain: EntityDomain;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  slaStatus?: string;
  activeTab?: string;              // e.g. 'overview' | 'workflow' | 'activity' | 'notes' | 'files'
  isEditing?: boolean;
  module?: {
    id: string;
    name: string;
    slug?: string;
  };
  keyAttributes: Record<string, string | number | boolean | null>;
  relatedCounts?: {
    activities?: number;
    notes?: number;
    tasks?: number;
    documents?: number;
    relationships?: number;
  };
  rawUrl?: string;
  timestamp?: string;
}

export interface RegisterEntityOptions {
  priority?: number; // 30 = Modal, 20 = Split / Inspector, 10 = Page View
  enabled?: boolean;
}

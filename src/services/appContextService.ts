import { ContextSource } from '../types/solutions';
import { DriveService } from './driveService';

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  lastUpdated: string;
}

export interface AppContextItem {
  id: string;
  title: string;
  category: 'KNOWLEDGE_BASE' | 'DRIVE' | 'REPORT' | 'APP';
  typeLabel: string;
  content: string;
  updatedAt: string;
  iconName?: string;
}

const DEFAULT_KB_ARTICLES: KBArticle[] = [
  {
    id: 'kb-1',
    title: 'HR Operations & Employee Handbook',
    category: 'Operations',
    content: `Aurora Operations & Employee Policy Guidelines:
1. Working Hours: Core operational hours are 9:00 AM to 5:00 PM local time. Remote work is fully supported based on role arrangement.
2. Benefits & Paid Time Off: Standard employees receive 20 days of annual leave and 10 days of sick leave. Leave requests must be submitted through the Workforce hub at least 5 business days in advance.
3. Payroll: Processed monthly on the 25th. If the 25th falls on a weekend, payment is disbursed on the preceding Friday.
4. Business Expense Reimbursement: All business-related expenses must be submitted via the Finance module with matching receipts within 30 days of the transaction.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-2',
    title: 'Aurora Platform API & Schema Specifications',
    category: 'Engineering',
    content: `Technical documentation for the Aurora Operating Platform:
1. REST API Base URL: http://localhost:3001/api
2. Authentication: Calls must contain the "Authorization: Bearer <token>" header. Developers should generate API keys in Settings > API.
3. Tenant Context: All tenant-specific data operations require the "x-tenant-id" header.
4. Record Schemas: Modules define data collections. Every record contains a JSON "data" object matching the module fields layout. System triggers automatically execute calculation rules and SLA deadline timers upon record creation or updates.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-3',
    title: 'Customer Support Escalation SOP',
    category: 'Customer Success',
    content: `Standard Operating Procedures (SOP) for Customer Care:
1. SLA Tiers: Response times are graded by priority:
   - Priority 1 (System Outage): 2 hours.
   - Priority 2 (Severe Degradation): 8 hours.
   - Priority 3 (General Query): 24 hours.
2. Escalation Matrix: If a ticket is unresolved within 50% of its SLA timeframe, automatically escalate to the Team Lead.
3. Refunds and Billing adjustments: Support staff can approve refunds up to $50. Adjustments above $50 require written authorization from the Finance Manager.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-4',
    title: 'Business Development & Pricing Playbook',
    category: 'Sales',
    content: `Aurora Product Offering & Licensing structures:
1. Subscription Tiers:
   - Standard Seat: $29/user/month. Access to basic modules and personal assistant features.
   - Developer Seat: $79/user/month. Access to custom module builder, formula engine, and workflow designer.
   - AI Agent Seat: $19/agent/month. Provisioning rate for digital coworkers.
2. Value Proposition: Aurora unifies CRM, project tracking, custom logic builder, and AI automations in a single secure environment, reducing software spend by up to 40%.`,
    lastUpdated: new Date().toLocaleDateString()
  }
];

export const AppContextService = {
  /**
   * Fetches all Knowledge Base articles as context items
   */
  getKnowledgeBaseArticles: (): AppContextItem[] => {
    let localArticles = DEFAULT_KB_ARTICLES;
    try {
      const saved = localStorage.getItem('aurora_kb_articles');
      if (saved) {
        localArticles = JSON.parse(saved);
      }
    } catch (e) {}

    return localArticles.map(art => ({
      id: art.id,
      title: art.title,
      category: 'KNOWLEDGE_BASE',
      typeLabel: `KB Article (${art.category})`,
      content: art.content,
      updatedAt: art.lastUpdated || 'Recently'
    }));
  },

  /**
   * Fetches all Drive Documents & Files as context items
   */
  getDriveDocuments: (): AppContextItem[] => {
    try {
      const items = DriveService.getAllItems();
      const files = items.filter(i => i.type === 'FILE');

      return files.map(file => ({
        id: file.id,
        title: file.name,
        category: 'DRIVE',
        typeLabel: `Aurora Drive Document (${file.driveType === 'PERSONAL' ? 'Personal' : 'Tenant Shared'})`,
        content: `Aurora Drive Document: "${file.name}" (Drive: ${file.driveType}, Updated: ${file.updatedAt}). Content specification: ${file.name} document data model.`,
        updatedAt: new Date(file.updatedAt).toLocaleDateString()
      }));
    } catch (e) {
      return [
        {
          id: 'drive_doc_1',
          title: 'Project Architecture Blueprint.docx',
          category: 'DRIVE',
          typeLabel: 'Aurora Drive (Tenant Shared)',
          content: 'Aurora Drive Shared Blueprint: Comprehensive architecture specification for project triage, escalation paths, and intake routing.',
          updatedAt: 'Today'
        },
        {
          id: 'drive_doc_2',
          title: 'Financial Audit Matrix.xlsx',
          category: 'DRIVE',
          typeLabel: 'Aurora Drive (Tenant Shared)',
          content: 'Aurora Drive Shared Spreadsheet: Invoice reconciliation, vendor verification rules, tax validation rules, and purchase order workflow matrix.',
          updatedAt: 'Yesterday'
        }
      ];
    }
  },

  /**
   * Fetches Platform App & Subsystem items (Reports, Work Queue, Analytics)
   */
  getPlatformAppSources: (): AppContextItem[] => {
    return [
      {
        id: 'app_report_1',
        title: 'Executive SLA & Incident Metrics Report',
        category: 'REPORT',
        typeLabel: 'Reports & Analytics App',
        content: 'Report Metric Context: Monthly incident volume breakdown, average SLA escalation time, resolution rates by department, and customer satisfaction scores.',
        updatedAt: 'Active'
      },
      {
        id: 'app_queue_1',
        title: 'Customer Intake & Work Distribution Queue',
        category: 'APP',
        typeLabel: 'Work Distribution / Inbox App',
        content: 'Inbox & Triage Rules: Automatic round-robin assignment based on workload capacity, priority score thresholding, and automated email trigger notifications.',
        updatedAt: 'Active'
      }
    ];
  },

  /**
   * Converts an AppContextItem to a Solution ContextSource
   */
  convertToContextSource: (item: AppContextItem): ContextSource => {
    let type: ContextSource['type'] = 'txt';
    let origin: ContextSource['sourceOrigin'] = 'LOCAL_FILE';

    if (item.category === 'KNOWLEDGE_BASE') {
      type = 'txt';
      origin = 'KNOWLEDGE_BASE';
    } else if (item.category === 'DRIVE') {
      const ext = item.title.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') type = 'pdf';
      else if (ext === 'docx' || ext === 'doc') type = 'docx';
      else if (ext === 'json') type = 'json';
      origin = 'DRIVE';
    } else if (item.category === 'REPORT') {
      type = 'json';
      origin = 'REPORT';
    } else {
      type = 'txt';
      origin = 'APP';
    }

    return {
      id: `ctx_${item.category.toLowerCase()}_${item.id}_${Date.now()}`,
      name: item.title,
      type,
      size: `${Math.round(item.content.length / 1024) || 1} KB`,
      uploadedAt: 'Just now',
      status: 'PROCESSED',
      contentSummary: item.typeLabel,
      rawText: item.content,
      sourceOrigin: origin
    };
  }
};

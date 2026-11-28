import {
  Layers,
  ListTodo,
  ShieldCheck,
  Shield,
  Database,
  Search,
  Target,
  FileText,
  Layout,
  Globe,
  Compass,
  Mail,
  BarChart2,
  Palette,
  GitBranch,
  Zap,
  ListOrdered,
  Bot,
  Plug,
  Bookmark,
  LucideIcon,
} from 'lucide-react';
import {
  SolutionArtifact,
  SolutionArtifactOrigin,
  SolutionArtifactType,
  SolutionComponentColumn,
} from '../../../types/solutions';

export interface SolutionComponentMeta {
  type: SolutionArtifactType;
  label: string;
  singularLabel: string;
  description: string;
  column: SolutionComponentColumn;
  icon: LucideIcon;
  builderRoute: string;
  supportsCoreLink?: boolean;
}

export const SOLUTION_COMPONENT_COLUMNS: Array<{
  id: SolutionComponentColumn;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'DATA_LOGIC',
    title: 'Data & Logic',
    subtitle: 'Modules, lists, rules, roles, queries, searches & metrics',
  },
  {
    id: 'INTERFACES_OUTPUTS',
    title: 'Interfaces & Outputs',
    subtitle: 'Forms, pages, sites, menus, content, reports & brands',
  },
  {
    id: 'PROCESS_AI',
    title: 'Process & AI',
    subtitle: 'Workflows, automations, queues, agents & integrations',
  },
];

/**
 * Canonical 19 builders under Aurora's "Build & Customize" menu.
 */
export const SOLUTION_COMPONENT_CATALOG: SolutionComponentMeta[] = [
  // DATA & LOGIC (7)
  {
    type: 'MODULE',
    label: 'Modules',
    singularLabel: 'Module',
    description: 'Data tables, fields, relationships, and record views',
    column: 'DATA_LOGIC',
    icon: Layers,
    builderRoute: '/workspace/settings/platform-modules',
    supportsCoreLink: true,
  },
  {
    type: 'GLOBAL_LIST',
    label: 'Lists',
    singularLabel: 'List',
    description: 'Reusable choice sets, lookup tables, and option lists',
    column: 'DATA_LOGIC',
    icon: ListTodo,
    builderRoute: '/workspace/settings/platform-modules/global-lists',
    supportsCoreLink: true,
  },
  {
    type: 'VALIDATION',
    label: 'Rules',
    singularLabel: 'Rule',
    description: 'Field and cross-entity validation rulesets',
    column: 'DATA_LOGIC',
    icon: ShieldCheck,
    builderRoute: '/workspace/settings/platform-modules/validations-library',
  },
  {
    type: 'PERMISSION',
    label: 'Roles',
    singularLabel: 'Role',
    description: 'RBAC/ABAC access policies, field masking, and AI guardrails',
    column: 'DATA_LOGIC',
    icon: Shield,
    builderRoute: '/workspace/settings/platform-modules/roles-library',
    supportsCoreLink: true,
  },
  {
    type: 'QUERY',
    label: 'Queries',
    singularLabel: 'Query',
    description: 'Parameterized multi-table SQL queries and datasets',
    column: 'DATA_LOGIC',
    icon: Database,
    builderRoute: '/workspace/settings/platform-modules/queries-library',
  },
  {
    type: 'SEARCH',
    label: 'Searches',
    singularLabel: 'Search',
    description: 'Self-service cross-module searches with exposed filters',
    column: 'DATA_LOGIC',
    icon: Search,
    builderRoute: '/workspace/settings/platform-modules/searches-library',
  },
  {
    type: 'KPI',
    label: 'Metrics',
    singularLabel: 'Metric',
    description: 'Calculated KPIs, targets, and threshold alert rules',
    column: 'DATA_LOGIC',
    icon: Target,
    builderRoute: '/workspace/settings/platform-modules/kpi-management',
  },
  {
    type: 'VIEW',
    label: 'Views',
    singularLabel: 'Saved View',
    description: 'Saved module and queue filter views, sorting, and column layouts',
    column: 'DATA_LOGIC',
    icon: Bookmark,
    builderRoute: '/workspace/settings/platform-modules',
  },

  // INTERFACES & OUTPUTS (7)
  {
    type: 'FORM',
    label: 'Forms',
    singularLabel: 'Form',
    description: 'Interactive intake, workspace, and public portal forms',
    column: 'INTERFACES_OUTPUTS',
    icon: FileText,
    builderRoute: '/workspace/settings/platform-modules/forms-library',
  },
  {
    type: 'PAGE',
    label: 'Pages',
    singularLabel: 'Page',
    description: 'Custom workspace pages, dashboards, and widget layouts',
    column: 'INTERFACES_OUTPUTS',
    icon: Layout,
    builderRoute: '/workspace/settings/pages',
  },
  {
    type: 'SITE',
    label: 'Sites',
    singularLabel: 'Site',
    description: 'External portals, client sites, and public pages',
    column: 'INTERFACES_OUTPUTS',
    icon: Globe,
    builderRoute: '/workspace/settings/platform-modules/sites',
  },
  {
    type: 'NAVIGATION',
    label: 'Menus',
    singularLabel: 'Menu',
    description: 'Solution sidebar and top-bar navigation architecture',
    column: 'INTERFACES_OUTPUTS',
    icon: Compass,
    builderRoute: '/workspace/settings/navigation',
  },
  {
    type: 'CONTENT',
    label: 'Content',
    singularLabel: 'Content',
    description: 'Document, email, letter, and notification templates',
    column: 'INTERFACES_OUTPUTS',
    icon: Mail,
    builderRoute: '/workspace/settings/platform-modules/document-generation',
  },
  {
    type: 'REPORT',
    label: 'Reports',
    singularLabel: 'Report',
    description: 'Visual charts, BI dashboards, and scheduled exports',
    column: 'INTERFACES_OUTPUTS',
    icon: BarChart2,
    builderRoute: '/workspace/settings/platform-modules/report-management',
  },
  {
    type: 'BRAND',
    label: 'Brands',
    singularLabel: 'Brand',
    description: 'Color palettes, typography, logos, and voice guidelines',
    column: 'INTERFACES_OUTPUTS',
    icon: Palette,
    builderRoute: '/workspace/settings/brand-builder',
  },

  // PROCESS & AI (5)
  {
    type: 'WORKFLOW',
    label: 'Workflows',
    singularLabel: 'Workflow',
    description: 'Visual lifecycle states, approvals, and process graphs',
    column: 'PROCESS_AI',
    icon: GitBranch,
    builderRoute: '/workspace/settings/platform-modules/workflows-library',
  },
  {
    type: 'AUTOMATION',
    label: 'Automations',
    singularLabel: 'Automation',
    description: 'Event triggers, SLA escalations, and automated actions',
    column: 'PROCESS_AI',
    icon: Zap,
    builderRoute: '/workspace/settings/platform-modules/automation-management',
  },
  {
    type: 'QUEUE',
    label: 'Queues',
    singularLabel: 'Queue',
    description: 'Work queues, unified triage lists, and SLA routing',
    column: 'PROCESS_AI',
    icon: ListOrdered,
    builderRoute: '/workspace/settings/platform-modules/queues-management',
  },
  {
    type: 'AGENT',
    label: 'Agents',
    singularLabel: 'Agent',
    description: 'Autonomous AI digital coworkers, skills, and guardrails',
    column: 'PROCESS_AI',
    icon: Bot,
    builderRoute: '/workspace/settings/platform-modules/agents',
  },
  {
    type: 'INTEGRATION',
    label: 'Integrations',
    singularLabel: 'Integration',
    description: 'Third-party connectors, webhooks, and API syncs',
    column: 'PROCESS_AI',
    icon: Plug,
    builderRoute: '/workspace/settings/platform-modules/integration-management',
    supportsCoreLink: true,
  },
];

const TYPE_ALIAS_MAP: Partial<Record<SolutionArtifactType, SolutionArtifactType>> = {
  METRIC: 'KPI',
  TEMPLATE: 'CONTENT',
  API: 'INTEGRATION',
  RECORDS: 'MODULE',
};

export function normalizeArtifactType(type: SolutionArtifactType): SolutionArtifactType {
  return TYPE_ALIAS_MAP[type] || type;
}

export function getComponentMeta(type: SolutionArtifactType): SolutionComponentMeta {
  const normalized = normalizeArtifactType(type);
  return (
    SOLUTION_COMPONENT_CATALOG.find((c) => c.type === normalized) ||
    SOLUTION_COMPONENT_CATALOG[0]
  );
}

export function getOriginBadgeMeta(origin?: SolutionArtifactOrigin): {
  label: string;
  className: string;
} {
  switch (origin) {
    case 'CORE':
      return {
        label: 'Core',
        className:
          'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
      };
    case 'TEMPLATE':
      return {
        label: 'Blueprint',
        className:
          'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/25',
      };
    case 'AI_GEN':
      return {
        label: 'AI Gen',
        className:
          'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      };
    case 'CUSTOM':
    default:
      return {
        label: 'Custom',
        className:
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      };
  }
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'component';
}

export function normalizeSolutionArtifact(raw: SolutionArtifact): SolutionArtifact {
  const normalizedType = normalizeArtifactType(raw.type);
  return {
    ...raw,
    type: normalizedType,
    slug: raw.slug || slugifyName(raw.name || normalizedType),
    origin: raw.origin || (raw.isSharedCore ? 'CORE' : 'AI_GEN'),
    lastEditedBy: raw.lastEditedBy || 'AI',
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function createDefaultArtifactScaffold(
  type: SolutionArtifactType,
  name: string,
  options?: {
    origin?: SolutionArtifactOrigin;
    isSharedCore?: boolean;
    coreExtensionOnly?: boolean;
    sourceTemplateId?: string;
    description?: string;
  }
): SolutionArtifact {
  const normalizedType = normalizeArtifactType(type);
  const meta = getComponentMeta(normalizedType);
  const id = `art_${normalizedType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const slug = slugifyName(name);
  const now = new Date().toISOString();

  let content: any = { name, slug };

  switch (normalizedType) {
    case 'MODULE':
      content = {
        id,
        name,
        slug,
        layout: [
          { id: 'title', label: 'Title', type: 'text', required: true },
          { id: 'status', label: 'Status', type: 'select', options: ['New', 'In Progress', 'Completed'] },
        ],
      };
      break;
    case 'FORM':
      content = {
        id,
        name,
        title: name,
        usage: 'workspace_create',
        fields: [
          { id: 'full_name', label: 'Full Name', type: 'text', required: true, width: 'half' },
          { id: 'email', label: 'Email Address', type: 'email', required: true, width: 'half' },
        ],
      };
      break;
    case 'WORKFLOW':
      content = {
        id,
        name,
        triggerType: 'RECORD_EVENT',
        nodes: [
          { id: 'start', label: 'Submitted', type: 'TRIGGER' },
          { id: 'review', label: 'In Review', type: 'ACTION' },
          { id: 'done', label: 'Approved', type: 'END' },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'review' },
          { id: 'e2', source: 'review', target: 'done' },
        ],
      };
      break;
    case 'PERMISSION':
      content = {
        id,
        name,
        slug,
        type: 'SOLUTION',
        status: 'DRAFT',
        capabilities: ['create:records'],
        modulePolicies: {},
        workflowPolicies: { canApprove: false },
        aiPolicies: {},
      };
      break;
    case 'VALIDATION':
      content = { id, name, scope: 'MODULE', rules: [] };
      break;
    case 'AUTOMATION':
      content = { id, name, triggers: [], actions: [], isActive: true };
      break;
    case 'PAGE':
      content = { id, name, slug, widgets: [] };
      break;
    case 'NAVIGATION':
      content = { id, name, items: [] };
      break;
    case 'GLOBAL_LIST':
      content = { id, name, options: ['Option 1', 'Option 2'] };
      break;
    case 'VIEW':
      content = {
        id,
        name,
        scopeType: 'MODULE',
        scopeId: '',
        isShared: true,
        isDefault: false,
        filterState: { sortBy: 'updatedAt', sortDir: 'desc' },
      };
      break;
    default:
      content = { id, name, slug };
      break;
  }

  return {
    id,
    slug,
    name,
    type: normalizedType,
    description: options?.description || meta.description,
    content,
    origin: options?.origin || 'CUSTOM',
    isSharedCore: Boolean(options?.isSharedCore),
    coreExtensionOnly: Boolean(options?.coreExtensionOnly ?? options?.isSharedCore),
    sourceTemplateId: options?.sourceTemplateId,
    lastEditedBy: 'USER',
    manualEditVersion: 1,
    updatedAt: now,
  };
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

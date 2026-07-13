export interface PlatformModule {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  isCore: boolean;
  description: string;
  path: string;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: 'people-organisations',
    name: 'People & Organisations',
    slug: 'people-organisations',
    iconName: 'Users',
    isCore: true,
    description: 'Manage core entity taxonomies and global relationship rules.',
    path: '/workspace/platform/people-organisations'
  },
  {
    id: 'work-distribution',
    name: 'Work Distribution',
    slug: 'work-distribution',
    iconName: 'Inbox',
    isCore: true,
    description: 'Configure routing rules to automatically intake and distribute work across modules.',
    path: '/workspace/platform/work-distribution'
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    slug: 'knowledge-base',
    iconName: 'BookOpen',
    isCore: true,
    description: 'Central repository for institutional knowledge, documentation, training materials, and AI agent reference context.',
    path: '/workspace/platform/knowledge-base'
  },
  {
    id: 'pricing-catalog',
    name: 'Pricing Catalog',
    slug: 'pricing-catalog',
    iconName: 'Tag',
    isCore: true,
    description: 'Centralized registry of products, service rates, application fees, subscriptions, and penalties.',
    path: '/workspace/platform/pricing-catalog'
  },
  {
    id: 'inventory-manager',
    name: 'Inventory Manager',
    slug: 'inventory-manager',
    iconName: 'Boxes',
    isCore: true,
    description: 'Real-time stock tracking, alert thresholds, and quantity adjustments for catalog products.',
    path: '/workspace/platform/inventory-manager'
  },
  {
    id: 'global-lists',
    name: 'Global Lists',
    slug: 'global-lists',
    iconName: 'ListTodo',
    isCore: true,
    description: 'Enterprise-grade lookup tables with full SCD Type 2 versioning.',
    path: '/workspace/platform/global-lists'
  },
  {
    id: 'workforce-management',
    name: 'Workforce Management',
    slug: 'workforce-management',
    iconName: 'Users',
    isCore: true,
    description: 'Organize workspace members, teams, positions, and control access permissions.',
    path: '/workspace/platform/workforce'
  },
  {
    id: 'integration-management',
    name: 'Integration Management',
    slug: 'integration-management',
    iconName: 'Plug',
    isCore: true,
    description: 'Connect and sync data with third-party tools, APIs, and databases.',
    path: '/workspace/platform/integrations'
  },
  {
    id: 'sites',
    name: 'Sites',
    slug: 'sites',
    iconName: 'Globe',
    isCore: true,
    description: 'Manage external pages, citizen portals, and public forms.',
    path: '/workspace/platform/sites'
  },
  {
    id: 'automation-management',
    name: 'Automation Management',
    slug: 'automation-management',
    iconName: 'Zap',
    isCore: true,
    description: 'Build automated workflow rules, triggers, actions, and audit logs.',
    path: '/workspace/platform/automations'
  },
  {
    id: 'document-generation',
    name: 'Document generation',
    slug: 'document-generation',
    iconName: 'FileText',
    isCore: true,
    description: 'Configure automated document templates, PDF creation, and email merging.',
    path: '/workspace/platform/templates'
  },
  {
    id: 'report-management',
    name: 'Report Management',
    slug: 'report-management',
    iconName: 'BarChart2',
    isCore: true,
    description: 'Create custom data visualizations, scheduled reports, and export dashboards.',
    path: '/workspace/platform/reports'
  },
  {
    id: 'api-management',
    name: 'API Management',
    slug: 'api-management',
    iconName: 'Key',
    isCore: true,
    description: 'Manage programmatic API keys, endpoints, and developer access logs.',
    path: '/workspace/platform/api'
  },
  {
    id: 'financial-management',
    name: 'Financial Management',
    slug: 'financial-management',
    iconName: 'Banknote',
    isCore: true,
    description: 'Financial settings, tax configurations, and payment processing rules.',
    path: '/workspace/platform/finance'
  },
  {
    id: 'records-management',
    name: 'Records Management',
    slug: 'records-management',
    iconName: 'Archive',
    isCore: true,
    description: 'Configure compliance retention schedules, legal holds, and auto-disposition policies.',
    path: '/workspace/platform/records-management'
  }
];

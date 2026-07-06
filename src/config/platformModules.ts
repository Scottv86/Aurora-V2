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
    path: '/workspace/platform/intake'
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
  }
];

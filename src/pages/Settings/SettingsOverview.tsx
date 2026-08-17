import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { 
  Search, 
  ArrowRight,
  Activity,
  FilePlus,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof LucideIcons;
  to: string;
  category: string;
  tags: string[];
}

const SETTINGS_ITEMS: SettingItem[] = [
  // General & Security
  {
    id: 'organization',
    label: 'Organisation',
    description: 'General info and company branding settings.',
    icon: 'Building',
    to: '/workspace/settings/organization',
    category: 'General & Security',
    tags: ['branding', 'general', 'seo', 'social', 'company']
  },
  {
    id: 'workforce-management',
    label: 'Workforce & Access',
    description: 'Organize workspace members, teams, positions, and control access permissions.',
    icon: 'Users',
    to: '/workspace/settings/platform-modules/workforce-management',
    category: 'General & Security',
    tags: ['members', 'users', 'teams', 'positions', 'roles', 'permissions', 'access', 'security']
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Manage platform software seat licenses, invoices, and payment methods.',
    icon: 'CreditCard',
    to: '/workspace/settings/subscription',
    category: 'General & Security',
    tags: ['subscription', 'payment', 'invoices', 'licenses', 'seats']
  },
  {
    id: 'ai-services',
    label: 'AI Services',
    description: 'Bring your own API keys (BYOK), tier routing, usage cost tracking, and data privacy.',
    icon: 'Sparkles',
    to: '/workspace/settings/ai-services',
    category: 'General & Security',
    tags: ['ai', 'byok', 'openai', 'anthropic', 'gemini', 'grok', 'deepseek', 'privacy', 'keys', 'tokens']
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, brand colors, and customization themes.',
    icon: 'Palette',
    to: '/workspace/settings/branding',
    category: 'General & Security',
    tags: ['theme', 'colors', 'dark mode', 'branding', 'logo']
  },

  // Build & Customize (All Platform Builders)
  {
    id: 'solutions',
    label: 'Solutions',
    description: 'Package, deploy, and manage end-to-end solution blueprints and application bundles.',
    icon: 'Boxes',
    to: '/workspace/settings/platform-modules/solutions',
    category: 'Build & Customize',
    tags: ['solutions', 'blueprints', 'bundles', 'packages', 'deploy']
  },
  {
    id: 'navigation',
    label: 'Menus',
    description: 'Layout style and navigation menu architect.',
    icon: 'Compass',
    to: '/workspace/settings/navigation',
    category: 'Build & Customize',
    tags: ['layout', 'menu', 'sidebar', 'top menu', 'navigation']
  },

  {
    id: 'platform-modules',
    label: 'Modules',
    description: 'Build and configure custom data modules, tables, and schemas.',
    icon: 'Layers',
    to: '/workspace/settings/platform-modules',
    category: 'Build & Customize',
    tags: ['system', 'custom', 'modules', 'builder', 'data models', 'entities']
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Manage custom pages, dashboard widgets, and layouts.',
    icon: 'Layout',
    to: '/workspace/settings/pages',
    category: 'Build & Customize',
    tags: ['pages', 'dashboards', 'widgets', 'layouts']
  },
  {
    id: 'queues-management',
    label: 'Queues',
    description: 'Build and configure work queues, unified queue views, filter rules, and display columns.',
    icon: 'ListOrdered',
    to: '/workspace/settings/platform-modules/queues-management',
    category: 'Build & Customize',
    tags: ['queues', 'work queue', 'unified', 'filter', 'columns', 'distribution']
  },
  {
    id: 'sites',
    label: 'Sites',
    description: 'Manage external web pages, citizen portals, and public forms.',
    icon: 'Globe',
    to: '/workspace/settings/platform-modules/sites',
    category: 'Build & Customize',
    tags: ['sites', 'portals', 'pages', 'public', 'external', 'builder']
  },
  {
    id: 'forms-library',
    label: 'Forms',
    description: 'Centralized hub for managing standalone embeddable forms across your workspace, site pages, and portals.',
    icon: 'FileText',
    to: '/workspace/settings/platform-modules/forms-library',
    category: 'Build & Customize',
    tags: ['forms', 'builder', 'intake', 'fields', 'inputs']
  },
  {
    id: 'workflows-library',
    label: 'Workflows',
    description: 'Visual graph studio for building and managing automated process chains across your platform.',
    icon: 'GitBranch',
    to: '/workspace/settings/platform-modules/workflows-library',
    category: 'Build & Customize',
    tags: ['workflows', 'process', 'graph', 'approval', 'automation']
  },
  {
    id: 'validations-library',
    label: 'Rules',
    description: 'Create and maintain reusable field and cross-entity validation rulesets.',
    icon: 'ShieldCheck',
    to: '/workspace/settings/platform-modules/validations-library',
    category: 'Build & Customize',
    tags: ['rules', 'validations', 'governance', 'checks', 'data quality', 'logic']
  },
  {
    id: 'automation-management',
    label: 'Automations',
    description: 'Build automated workflow rules, triggers, actions, and audit logs.',
    icon: 'Zap',
    to: '/workspace/settings/platform-modules/automation-management',
    category: 'Build & Customize',
    tags: ['automations', 'workflows', 'triggers', 'actions', 'logic', 'rules']
  },
  {
    id: 'integration-management',
    label: 'Integrations',
    description: 'Connect and sync data with third-party tools, APIs, and databases.',
    icon: 'Plug',
    to: '/workspace/settings/platform-modules/integration-management',
    category: 'Build & Customize',
    tags: ['connectors', 'integrations', 'third-party', 'sync', 'webhooks']
  },
  {
    id: 'report-management',
    label: 'Reports',
    description: 'Create custom data visualizations, scheduled reports, and export dashboards.',
    icon: 'BarChart2',
    to: '/workspace/settings/platform-modules/report-management',
    category: 'Build & Customize',
    tags: ['reports', 'analytics', 'visualizations', 'charts', 'exports', 'dashboards']
  },
  {
    id: 'queries-library',
    label: 'Queries',
    description: 'Author, parameterize, and save reusable multi-table queries and virtual datasets.',
    icon: 'Database',
    to: '/workspace/settings/platform-modules/queries-library',
    category: 'Build & Customize',
    tags: ['queries', 'sql', 'datasets', 'views', 'builder', 'analytics', 'data']
  },
  {
    id: 'document-generation',
    label: 'Templates',
    description: 'Configure automated document templates, PDF creation, and email merging.',
    icon: 'FileText',
    to: '/workspace/settings/platform-modules/document-generation',
    category: 'Build & Customize',
    tags: ['documents', 'templates', 'pdf', 'email merge', 'generation']
  },
  {
    id: 'lists-management',
    label: 'Lists',
    description: 'Build and manage reusable choice datasets, lookup tables, and option sets.',
    icon: 'ListTodo',
    to: '/workspace/settings/platform-modules/global-lists',
    category: 'Build & Customize',
    tags: ['lists', 'lookups', 'dropdowns', 'choices', 'options', 'tables']
  },

  // Logic & Workflows
  {
    id: 'work-distribution',
    label: 'Work Distribution',
    description: 'Configure routing rules to automatically intake and distribute work across modules.',
    icon: 'Inbox',
    to: '/workspace/settings/platform-modules/work-distribution',
    category: 'Logic & Workflows',
    tags: ['intake', 'routing', 'triage', 'work distribution', 'queues']
  },
  // Develop
  {
    id: 'migration',
    label: 'Data Migration',
    description: 'Import and export platform data and schema definitions.',
    icon: 'ArrowRightLeft',
    to: '/workspace/settings/migration',
    category: 'Develop',
    tags: ['import', 'export', 'transfer', 'migration']
  },
  {
    id: 'api-management',
    label: 'API Management',
    description: 'Manage programmatic API keys, endpoints, and developer access logs.',
    icon: 'Key',
    to: '/workspace/settings/platform-modules/api-management',
    category: 'Develop',
    tags: ['api', 'developer', 'keys', 'endpoints', 'rest', 'access']
  },


  // Configure
  {
    id: 'financial-management',
    label: 'Financial Management',
    description: 'Financial settings, tax configurations, and payment processing rules.',
    icon: 'Banknote',
    to: '/workspace/settings/platform-modules/financial-management',
    category: 'Configure',
    tags: ['finance', 'tax', 'payments', 'accounting', 'billing']
  },
  {
    id: 'pricing-catalog',
    label: 'Pricing Catalog',
    description: 'Centralized registry of products, service rates, application fees, subscriptions, and penalties.',
    icon: 'Tag',
    to: '/workspace/settings/platform-modules/pricing-catalog',
    category: 'Configure',
    tags: ['pricing', 'rates', 'fees', 'catalog', 'products', 'services']
  },
  {
    id: 'inventory-manager',
    label: 'Inventory Manager',
    description: 'Real-time stock tracking, alert thresholds, and quantity adjustments for catalog products.',
    icon: 'Boxes',
    to: '/workspace/settings/platform-modules/inventory-manager',
    category: 'Configure',
    tags: ['inventory', 'stock', 'products', 'supplies', 'tracking']
  },
  {
    id: 'people-organisations',
    label: 'People & Organisations',
    description: 'Manage core entity taxonomies and global relationship rules.',
    icon: 'Users',
    to: '/workspace/settings/platform-modules/people-organisations',
    category: 'Configure',
    tags: ['people', 'organisations', 'entities', 'taxonomies', 'relationships']
  },

  // Analytics & Content
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    description: 'Central repository for institutional knowledge, documentation, training materials, and AI agent reference context.',
    icon: 'BookOpen',
    to: '/workspace/settings/platform-modules/knowledge-base',
    category: 'Analytics & Content',
    tags: ['knowledge', 'documentation', 'wiki', 'training', 'ai context']
  },
  {
    id: 'records-management',
    label: 'Records Management',
    description: 'Configure compliance retention schedules, legal holds, and auto-disposition policies.',
    icon: 'Archive',
    to: '/workspace/settings/platform-modules/records-management',
    category: 'Analytics & Content',
    tags: ['records', 'retention', 'compliance', 'legal hold', 'archive']
  }
];

import { useNewModuleModal } from '../../context/NewModuleModalContext';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'General & Security': return <LucideIcons.ShieldCheck className="w-4 h-4" />;
    case 'Build & Customize': return <LucideIcons.Layout className="w-4 h-4" />;
    case 'Logic & Workflows': return <LucideIcons.Zap className="w-4 h-4" />;
    case 'Develop': return <LucideIcons.Code2 className="w-4 h-4" />;
    case 'Configure': return <LucideIcons.Sliders className="w-4 h-4" />;
    case 'Analytics & Content': return <LucideIcons.BarChart2 className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

import { PageHeader } from '../../components/UI/PageHeader';
import { PageWrapper } from '../../components/Common/PageWrapper';

export const SettingsOverview = () => {
  const navigate = useNavigate();
  const { openNewModuleModal } = useNewModuleModal();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery) return SETTINGS_ITEMS;
    const query = searchQuery.toLowerCase();
    return SETTINGS_ITEMS.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(filteredItems.map(item => item.category)));
    const order = [
      'General & Security',
      'Build & Customize',
      'Logic & Workflows',
      'Develop',
      'Configure',
      'Analytics & Content'
    ];
    return cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [filteredItems]);

  return (
    <PageWrapper className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 relative">
      {/* Standardized Page Header */}
      <PageHeader 
        title="Settings"
        description="Centralized platform configuration, organisation details, subscription seats, AI services, navigation, and custom modules."
        actions={
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input 
              type="text"
              placeholder="Search settings catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-12">
        {/* Prominent Quick Actions */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <QuickActionCard 
          icon={<UserPlus size={24} />}
          title="Add Member"
          description="Invite new users and manage roles in your workforce."
          onClick={() => navigate('/workspace/settings/platform-modules/workforce-management')}
          color="indigo"
        />
        <QuickActionCard 
          icon={<FilePlus size={24} />}
          title="New Module"
          description="Build custom modules and data models."
          onClick={() => openNewModuleModal()}
          color="teal"
        />
        <QuickActionCard 
          icon={<Activity size={24} />}
          title="System Health"
          description="Monitor performance metrics and logs."
          onClick={() => navigate('/admin/health')}
          color="emerald"
        />
      </div>

      {/* Tighter Settings Grid */}
      <div className="relative z-10 space-y-12">
        <AnimatePresence mode="popLayout">
          {categories.map((category, catIdx) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: catIdx * 0.05 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CategoryIcon category={category} />
                </div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  {category}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 dark:from-zinc-800/80 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems
                  .filter(item => item.category === category)
                  .map((item, itemIdx) => {
                    const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Box;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: itemIdx * 0.02 }}
                        onClick={() => navigate(item.to)}
                        className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden justify-between"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div>
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform w-fit mb-4">
                              <Icon size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.label}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                              {item.description}
                            </p>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                            Configure Settings <ArrowRight size={16} className="ml-2" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <div className="w-16 h-16 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-200/50 dark:border-zinc-800/80">
              <Search size={32} className="text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No settings found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No settings matched your query "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 pt-8 border-t border-zinc-200/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10"
      >
        <p className="text-[10px] font-black text-zinc-450 dark:text-zinc-650 uppercase tracking-[0.2em]">
          Aurora Platform &copy; 2026 • Enterprise Governance Suite
        </p>
      </motion.div>
      </div>
    </PageWrapper>
  );
};

const QuickActionCard = ({ 
  icon, 
  title, 
  description, 
  onClick, 
  color 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  color: 'indigo' | 'teal' | 'emerald'
}) => {
  const colorClasses = {
    indigo: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    teal: 'hover:border-teal-500/50 hover:shadow-teal-500/10 text-teal-600 dark:text-teal-400',
    emerald: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  };

  const iconBgClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none cursor-pointer flex flex-col relative overflow-hidden h-full justify-between",
        colorClasses[color]
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className={cn("p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform shadow-sm", iconBgClasses[color])}>
            {icon}
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
          Launch Action <ArrowRight size={16} className="ml-2" />
        </div>
      </div>
    </motion.div>
  );
};

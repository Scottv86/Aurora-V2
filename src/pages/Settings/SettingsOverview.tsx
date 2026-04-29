import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { 
  Search, 
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Layout,
  Users,
  Settings2,
  Database,
  Terminal,
  Activity,
  Plus,
  History,
  FilePlus,
  UserPlus
} from 'lucide-react';
import { Input } from '../../components/UI/Primitives';
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
  // General
  {
    id: 'organization',
    label: 'Organisation',
    description: 'General info and company branding.',
    icon: 'Building',
    to: '/workspace/settings/organization',
    category: 'General',
    tags: ['branding', 'general', 'seo', 'social']
  },
  {
    id: 'billing',
    label: 'Billing & Plan',
    description: 'Subscriptions and payments.',
    icon: 'CreditCard',
    to: '/workspace/settings/billing',
    category: 'General',
    tags: ['subscription', 'payment', 'invoices']
  },
  {
    id: 'usage',
    label: 'Model Usage',
    description: 'AI costs and usage limits.',
    icon: 'BarChart2',
    to: '/workspace/settings/usage',
    category: 'General',
    tags: ['ai', 'tokens', 'cost']
  },
  // Look & Feel
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Themes, colors, and layout.',
    icon: 'Palette',
    to: '/workspace/settings/appearance',
    category: 'Look & Feel',
    tags: ['theme', 'colors', 'dark mode', 'branding']
  },
  // Apps & Websites
  {
    id: 'sites',
    label: 'Sites',
    description: 'Public websites and portals.',
    icon: 'Globe',
    to: '/workspace/settings/sites',
    category: 'Apps & Websites',
    tags: ['portals', 'public', 'web']
  },
  // People & Teams
  {
    id: 'workforce',
    label: 'Workforce',
    description: 'Members, teams, and roles.',
    icon: 'UserCircle',
    to: '/workspace/settings/workforce',
    category: 'People & Teams',
    tags: ['people', 'teams', 'hr', 'access']
  },
  // Billing & Payments
  {
    id: 'finance',
    label: 'Finance',
    description: 'Tax and accounting rules.',
    icon: 'Banknote',
    to: '/workspace/settings/finance',
    category: 'Billing & Payments',
    tags: ['accounting', 'tax', 'money']
  },
  {
    id: 'fees-products',
    label: 'Fees & Products',
    description: 'Product catalogs and pricing.',
    icon: 'Tag',
    to: '/workspace/settings/fees-products',
    category: 'Billing & Payments',
    tags: ['pricing', 'service', 'catalog']
  },
  // Platform Features
  {
    id: 'modules',
    label: 'Modules',
    description: 'Platform features and tools.',
    icon: 'Layers',
    to: '/workspace/settings/modules',
    category: 'Modules & Apps',
    tags: ['extensions', 'features', 'catalog']
  },
  {
    id: 'platform-modules',
    label: 'Platform Modules',
    description: 'Core system functionality.',
    icon: 'Cpu',
    to: '/workspace/settings/platform-modules',
    category: 'Modules & Apps',
    tags: ['system', 'advanced', 'core']
  },
  {
    id: 'apps',
    label: 'Apps',
    description: 'Connected third-party tools.',
    icon: 'LayoutGrid',
    to: '/workspace/settings/apps',
    category: 'Modules & Apps',
    tags: ['integrations', 'ecosystem', 'tools']
  },
  // Automations & Sync
  {
    id: 'automations',
    label: 'Automations',
    description: 'Automated workflow rules.',
    icon: 'Zap',
    to: '/workspace/settings/automations',
    category: 'Automations & Sync',
    tags: ['workflows', 'triggers', 'automation']
  },
  {
    id: 'connectors',
    label: 'Connectors',
    description: 'Syncing data with other systems.',
    icon: 'Plug',
    to: '/workspace/settings/connectors',
    category: 'Automations & Sync',
    tags: ['api', 'webhooks', 'sync']
  },
  // Forms & Templates
  {
    id: 'intake',
    label: 'Intake',
    description: 'Data entry and signup forms.',
    icon: 'ClipboardList',
    to: '/workspace/settings/intake',
    category: 'Forms & Templates',
    tags: ['forms', 'capture', 'leads']
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Document and email templates.',
    icon: 'FileText',
    to: '/workspace/settings/templates',
    category: 'Forms & Templates',
    tags: ['docs', 'automation', 'pdf']
  },
  // Data & Logic
  {
    id: 'logic',
    label: 'Logic',
    description: 'Business rules and conditions.',
    icon: 'Terminal',
    to: '/workspace/settings/logic',
    category: 'Data & Logic',
    tags: ['scripting', 'rules', 'engine']
  },
  {
    id: 'database',
    label: 'Database',
    description: 'Direct data management.',
    icon: 'Database',
    to: '/workspace/settings/database',
    category: 'Data & Logic',
    tags: ['raw data', 'schema', 'storage']
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Historical data and audit logs.',
    icon: 'Database',
    to: '/workspace/settings/records',
    category: 'Data & Logic',
    tags: ['history', 'logs', 'entries']
  },
  {
    id: 'lists',
    label: 'Lists',
    description: 'System dropdowns and options.',
    icon: 'ListTodo',
    to: '/workspace/settings/lists',
    category: 'Data & Logic',
    tags: ['data', 'dropdowns', 'choices']
  },
  {
    id: 'migration',
    label: 'Migration Tools',
    description: 'Import and export data.',
    icon: 'ArrowRightLeft',
    to: '/workspace/settings/migration',
    category: 'Data & Logic',
    tags: ['import', 'export', 'transfer']
  },
  // Security & Activity
  {
    id: 'security',
    label: 'Security',
    description: 'Logins, passwords, and SSO.',
    icon: 'Lock',
    to: '/workspace/settings/security',
    category: 'Security & Activity',
    tags: ['auth', 'sso', 'mfa']
  },
  {
    id: 'audit',
    label: 'Audit Log',
    description: 'Complete system activity log.',
    icon: 'History',
    to: '/workspace/settings/audit',
    category: 'Security & Activity',
    tags: ['logs', 'compliance', 'tracking']
  },
  {
    id: 'messaging',
    label: 'Message Logs',
    description: 'Email, SMS, and push history.',
    icon: 'MessageSquare',
    to: '/workspace/settings/messaging',
    category: 'Security & Activity',
    tags: ['communications', 'notifications', 'logs']
  },
  // Reporting
  {
    id: 'reports',
    label: 'Reports',
    description: 'Visual analytics and charts.',
    icon: 'BarChart2',
    to: '/workspace/settings/reports',
    category: 'Reporting',
    tags: ['analytics', 'charts', 'dashboards']
  },
  // Knowledge
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    description: 'Help docs and institutional wiki.',
    icon: 'BookOpen',
    to: '/workspace/settings/knowledge',
    category: 'Knowledge',
    tags: ['docs', 'training', 'wiki']
  },
  // Development
  {
    id: 'api',
    label: 'Developer API',
    description: 'Keys and technical integrations.',
    icon: 'Key',
    to: '/workspace/settings/api',
    category: 'Development',
    tags: ['developer', 'access', 'tokens']
  },
  {
    id: 'testing',
    label: 'Testing',
    description: 'Automated platform tests.',
    icon: 'TestTube',
    to: '/workspace/settings/testing',
    category: 'Development',
    tags: ['qa', 'regression', 'automated']
  },
  {
    id: 'deploy',
    label: 'Releases',
    description: 'Manage updates and deployments.',
    icon: 'CloudUpload',
    to: '/workspace/settings/deploy',
    category: 'Development',
    tags: ['release', 'environments', 'pipelines']
  },
  // Maintenance
  {
    id: 'reset',
    label: 'Factory Reset',
    description: 'Reset settings to defaults.',
    icon: 'RotateCcw',
    to: '/workspace/settings/reset',
    category: 'Maintenance',
    tags: ['danger', 'clear', 'defaults']
  }
];

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'General': return <Settings2 className="w-3.5 h-3.5" />;
    case 'Your Brand': return <LucideIcons.Palette className="w-3.5 h-3.5" />;
    case 'Apps & Websites': return <Layout className="w-3.5 h-3.5" />;
    case 'People & Teams': return <Users className="w-3.5 h-3.5" />;
    case 'Billing & Payments': return <LucideIcons.CreditCard className="w-3.5 h-3.5" />;
    case 'Platform Features': return <Activity className="w-3.5 h-3.5" />;
    case 'Automations & Sync': return <Zap className="w-3.5 h-3.5" />;
    case 'Forms & Templates': return <LucideIcons.ClipboardList className="w-3.5 h-3.5" />;
    case 'Data & Logic': return <Terminal className="w-3.5 h-3.5" />;
    case 'Security & Activity': return <Shield className="w-3.5 h-3.5" />;
    case 'Reporting & Knowledge': return <LucideIcons.BarChart className="w-3.5 h-3.5" />;
    case 'Development': return <LucideIcons.Code2 className="w-3.5 h-3.5" />;
    case 'Maintenance': return <LucideIcons.Wrench className="w-3.5 h-3.5" />;
    default: return <Activity className="w-3.5 h-3.5" />;
  }
};

export const SettingsOverview = () => {
  const navigate = useNavigate();
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
      'General',
      'Look & Feel', 
      'Apps & Websites',
      'People & Teams', 
      'Billing & Payments', 
      'Modules & Apps', 
      'Automations & Sync', 
      'Forms & Templates', 
      'Data & Logic', 
      'Security & Activity', 
      'Reporting', 
      'Knowledge',
      'Development', 
      'Maintenance'
    ];
    return cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [filteredItems]);

  return (
    <div className="flex flex-col w-full px-6 lg:px-10 pt-8 pb-32 min-h-screen max-w-[1600px] mx-auto">
      {/* Compact Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={12} />
            Command Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Settings Overview
          </h1>
          <div className="flex items-center gap-4 pt-1">
            <button className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors flex items-center gap-1.5">
              <LucideIcons.BookOpen size={10} /> Documentation
            </button>
            <div className="w-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <button className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors flex items-center gap-1.5">
              <LucideIcons.History size={10} /> Release Notes
            </button>
            <div className="w-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <button className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors flex items-center gap-1.5">
              <LucideIcons.MessageCircle size={10} /> Support
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 max-w-lg"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Input 
              icon={<Search className="w-4 h-4" />}
              placeholder="Search settings, features, or keywords..."
              className="h-11 rounded-xl border-zinc-200/50 bg-white/40 backdrop-blur-md dark:bg-zinc-900/40 dark:border-zinc-800/50 shadow-sm focus:ring-indigo-500/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
      </div>

      {/* Prominent Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <QuickActionCard 
          icon={<UserPlus className="w-6 h-6" />}
          title="Add Member"
          description="Invite new users to your workspace"
          onClick={() => navigate('/workspace/settings/workforce')}
          color="indigo"
        />
        <QuickActionCard 
          icon={<FilePlus className="w-6 h-6" />}
          title="New Module"
          description="Build a custom platform module"
          onClick={() => navigate('/workspace/settings/builder')}
          color="teal"
        />
        <QuickActionCard 
          icon={<History className="w-6 h-6" />}
          title="Audit Logs"
          description="Review recent system activity"
          onClick={() => navigate('/workspace/settings/audit')}
          color="purple"
        />
        <QuickActionCard 
          icon={<Activity className="w-6 h-6" />}
          title="System Health"
          description="Monitor platform performance"
          onClick={() => navigate('/admin/health')}
          color="emerald"
        />
      </div>

      {/* Tighter Settings Grid */}
      <div className="space-y-10">
        <AnimatePresence mode="popLayout">
          {categories.map((category, catIdx) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: catIdx * 0.05 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <CategoryIcon category={category} />
                </div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                  {category}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-200 dark:from-zinc-800 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems
                  .filter(item => item.category === category)
                  .map((item) => {
                    const Icon = (LucideIcons as any)[item.icon] || LucideIcons.Box;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.to)}
                        className="group flex items-start gap-4 p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm border border-zinc-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800/80 hover:border-indigo-500/30 hover:shadow-lg transition-all text-left"
                      >
                        <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {item.label}
                          </h3>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all shrink-0 mt-1" />
                      </button>
                    );
                  })}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No settings found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Subtle Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 pt-10 border-t border-zinc-200/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">
          Aurora Platform &copy; 2024 • Enterprise Governance Suite
        </p>
      </motion.div>
    </div>
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
  color: 'indigo' | 'teal' | 'purple' | 'emerald'
}) => {
  const colorClasses = {
    indigo: 'from-indigo-500/20 to-indigo-600/5 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400',
    teal: 'from-teal-500/20 to-teal-600/5 hover:border-teal-500/40 text-teal-600 dark:text-teal-400',
    purple: 'from-purple-500/20 to-purple-600/5 hover:border-purple-500/40 text-purple-600 dark:text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
  };

  const iconBgClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-600',
    teal: 'bg-teal-500/10 text-teal-600',
    purple: 'bg-purple-500/10 text-purple-600',
    emerald: 'bg-emerald-500/10 text-emerald-600'
  };

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col p-5 rounded-3xl bg-gradient-to-br border border-white/20 dark:border-white/5 backdrop-blur-xl shadow-xl transition-all text-left group overflow-hidden h-full",
        colorClasses[color]
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500">
        {icon}
      </div>
      
      <div className={cn("p-2.5 rounded-2xl mb-4 w-fit transition-colors", iconBgClasses[color])}>
        {icon}
      </div>
      
      <div className="space-y-1">
        <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          {title}
          <Zap size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
          {description}
        </p>
      </div>
    </motion.button>
  );
};

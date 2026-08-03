import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { 
  Search, 
  ArrowRight,
  Layout,
  Settings2,
  Terminal,
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
  // General
  {
    id: 'organization',
    label: 'Organisation',
    description: 'General info and company branding settings.',
    icon: 'Building',
    to: '/workspace/settings/organization',
    category: 'General',
    tags: ['branding', 'general', 'seo', 'social']
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Manage platform software seat licenses, invoices, and payment methods.',
    icon: 'CreditCard',
    to: '/workspace/settings/subscription',
    category: 'General',
    tags: ['subscription', 'payment', 'invoices', 'licenses', 'seats']
  },
  {
    id: 'ai-services',
    label: 'AI Services',
    description: 'Bring your own API keys (BYOK), tier routing, usage cost tracking, and data privacy.',
    icon: 'Sparkles',
    to: '/workspace/settings/ai-services',
    category: 'General',
    tags: ['ai', 'byok', 'openai', 'anthropic', 'gemini', 'grok', 'deepseek', 'privacy', 'keys', 'tokens']
  },

  
  // Look & Feel
  {
    id: 'branding',
    label: 'Branding',
    description: 'Logo, brand colors, and customization themes.',
    icon: 'Palette',
    to: '/workspace/settings/branding',
    category: 'Look & Feel',
    tags: ['theme', 'colors', 'dark mode', 'branding', 'logo']
  },
  {
    id: 'navigation',
    label: 'Navigation',
    description: 'Layout style and navigation menu architect.',
    icon: 'Compass',
    to: '/workspace/settings/navigation',
    category: 'Look & Feel',
    tags: ['layout', 'menu', 'sidebar', 'top menu', 'navigation']
  },

  // Modules & Apps
  {
    id: 'platform-modules',
    label: 'Modules',
    description: 'Manage core system features and custom builder modules.',
    icon: 'Cpu',
    to: '/workspace/settings/platform-modules',
    category: 'Modules & Apps',
    tags: ['system', 'custom', 'modules', 'builder']
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

  // Data & Logic
  {
    id: 'migration',
    label: 'Migration',
    description: 'Import and export data.',
    icon: 'ArrowRightLeft',
    to: '/workspace/settings/migration',
    category: 'Data & Logic',
    tags: ['import', 'export', 'transfer']
  },
];

import { useNewModuleModal } from '../../context/NewModuleModalContext';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'General': return <Settings2 className="w-4 h-4" />;
    case 'Look & Feel': return <LucideIcons.Palette className="w-4 h-4" />;
    case 'Modules & Apps': return <Layout className="w-4 h-4" />;
    case 'Data & Logic': return <Terminal className="w-4 h-4" />;
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
      'General',
      'Look & Feel', 
      'Modules & Apps', 
      'Data & Logic'
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

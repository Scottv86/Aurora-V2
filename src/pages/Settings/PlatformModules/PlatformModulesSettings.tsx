import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Cpu,
  ArrowLeft
} from 'lucide-react';
import { PageHeader } from '../../../components/UI/PageHeader';
import { Button } from '../../../components/UI/Primitives';
import { motion } from 'motion/react';

interface ModuleItem {
  id: string;
  name: string;
  slug: string;
  icon: React.ElementType;
  isCore: boolean;
  description: string;
}

const PLATFORM_MODULES: ModuleItem[] = [
  {
    id: 'people-organisations',
    name: 'People & Organisations',
    slug: 'people-organisations',
    icon: Users,
    isCore: true,
    description: 'Manage core entity taxonomies and global relationship rules.'
  }
];

export const PlatformModulesSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isIndex = location.pathname === '/workspace/settings/platform-modules' || location.pathname === '/workspace/settings/platform-modules/';

  const activeModule = !isIndex ? PLATFORM_MODULES.find(m => location.pathname.includes(m.slug)) : null;

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {isIndex ? (
        <>
          <PageHeader 
            title="Platform Modules"
            description="Configure global modules that define the core data structures and governance rules across all tenant workspaces. These settings establish the foundational architecture for your platform ecosystem."
          />
          <div className="flex-1 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLATFORM_MODULES.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/workspace/settings/platform-modules/${mod.slug}`)}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <mod.icon size={24} />
                      </div>
                      {mod.isCore && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                          Core Module
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {mod.name}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                      Configure Settings <ArrowLeft size={16} className="ml-2 rotate-180" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader 
            title={activeModule?.name || 'Module Settings'}
            description={activeModule?.description || 'Configure module settings.'}
            actions={
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => navigate('/workspace/settings/platform-modules')}
                className="gap-2 font-bold"
              >
                <ArrowLeft size={16} /> Back to Modules
              </Button>
            }
          />
          <div className="flex-1">
            <Outlet />
          </div>
        </>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Database, 
  LayoutGrid, 
  Cpu, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Loader2, 
  Sparkles, 
  HelpCircle,
  Layers,
  Wand2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNewModuleModal } from '../../context/NewModuleModalContext';
import { MODULES } from '../../constants/modules';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const NewModuleModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, closeNewModuleModal, view, setView } = useNewModuleModal();
  const { tenant, refreshModules } = usePlatform();
  const { session } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Auto-close modal once target route has mounted
  React.useEffect(() => {
    if (isOpen && (location.pathname.includes('/builder/') || location.pathname.includes('/ai-builder'))) {
      closeNewModuleModal();
    }
  }, [location.pathname, isOpen, closeNewModuleModal]);

  const selectableTemplates = MODULES.filter(t => t.id !== 'people_org');

  const filteredTemplates = selectableTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstallTemplate = async (template: any) => {
    if (!tenant?.id) {
      toast.error('Workspace tenant not identified.');
      return;
    }
    setLoading(true);
    setInstallingId(template.id);
    toast.info(`Provisioning ${template.name} module template...`);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const { icon, isEnabled, ...serializableMod } = template;
      
      const response = await fetch(`http://localhost:3001/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...serializableMod,
          id: undefined,
          templateId: template.id,
          isTemplate: false,
          isGlobal: template.id === 'people_org',
          category: template.category || 'Custom',
          iconName: template.icon?.name || 'Layers',
          enabled: true,
          status: 'ACTIVE'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to install module template');
      }

      const createdMod = await response.json();
      await refreshModules();
      toast.success(`${template.name} template installed successfully!`);
      navigate(`/workspace/settings/builder/${createdMod.id || createdMod.module?.id || ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to install template');
    } finally {
      setLoading(false);
      setInstallingId(null);
    }
  };

  const handleStartBlank = () => {
    navigate('/workspace/settings/builder/new');
  };

  const handleStartAI = () => {
    navigate('/workspace/settings/ai-builder');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeNewModuleModal}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Ambient Background Radial Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  {view === 'templates' ? 'Solution Library' : 'Create New Module'}
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  {view === 'templates' 
                    ? 'Pick a pre-configured template to deploy into your workspace.' 
                    : 'Choose how you want to architect your next data model and workflow.'}
                </p>
              </div>
            </div>

            <button
              onClick={closeNewModuleModal}
              className="p-2.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Section */}
          <div className="p-8 pt-4 overflow-y-auto relative z-10">
            {view === 'choices' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Blank Canvas */}
                <button
                  onClick={handleStartBlank}
                  className="group relative p-7 bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl text-left hover:border-emerald-500/60 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-13 h-13 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                      <Database size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                      Manual
                    </span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      Start Blank
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                      Take total control. Build custom fields, schemas, and automation triggers step-by-step.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
                    <span>Start Blank Canvas</span>
                    <ArrowRight size={14} />
                  </div>
                </button>

                {/* 2. Template */}
                <button
                  onClick={() => setView('templates')}
                  className="group relative p-7 bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl text-left hover:border-amber-500/60 transition-all hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-13 h-13 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                      <LayoutGrid size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                      Prebuilt
                    </span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      Start from Template
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                      Select from industry blueprints (CRM, Support Tickets, Assets) and customize instantly.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
                    <span>Browse Templates</span>
                    <ArrowRight size={14} />
                  </div>
                </button>

                {/* 3. AI */}
                <button
                  onClick={handleStartAI}
                  className="group relative p-7 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-500/30 rounded-3xl text-left hover:border-indigo-500/70 transition-all hover:shadow-2xl hover:shadow-indigo-500/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-13 h-13 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                      <Cpu size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-2 inline-block flex items-center gap-1 w-fit">
                      <Wand2 size={10} /> AI Powered
                    </span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      Build with AI
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                      Describe your workflow in plain English and let Aurora AI generate schema and forms for you.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
                    <span>Generate with AI</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              </div>
            ) : (
              /* Template Selection View */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <button
                    onClick={() => setView('choices')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold transition-colors w-fit"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Creation Options</span>
                  </button>

                  <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search template library..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-100/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto pr-1">
                  {filteredTemplates.map((template) => {
                    const IconComponent = template.icon || HelpCircle;
                    const isBeingInstalled = installingId === template.id;

                    return (
                      <div
                        key={template.id}
                        onClick={() => !loading && handleInstallTemplate(template)}
                        className={cn(
                          "group p-5 bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-indigo-500/60 transition-all shadow-sm cursor-pointer flex flex-col justify-between relative overflow-hidden",
                          isBeingInstalled && "border-indigo-500 ring-2 ring-indigo-500/20"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                              <IconComponent size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                              {template.category || 'General'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {template.name}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                            {template.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {isBeingInstalled ? (
                            <span className="flex items-center gap-2 text-indigo-500">
                              <Loader2 size={14} className="animate-spin" /> Provisioning...
                            </span>
                          ) : (
                            <>
                              <span>Install Template</span>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredTemplates.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-400 space-y-2">
                      <Layers size={32} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                      <p className="text-xs font-medium">No templates match your search query.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

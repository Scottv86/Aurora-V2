import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Layers
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNewModuleModal } from '../../context/NewModuleModalContext';
import { MODULES } from '../../constants/modules';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

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

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body content */}
          <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {view === 'choices' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* 1. Blank Canvas */}
                <div 
                  onClick={handleStartBlank}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Database size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Manual
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start Blank</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Take total control. Build custom fields, schemas, and automation triggers step-by-step.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Start Blank Canvas</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

                {/* 2. Template Library */}
                <div 
                  onClick={() => setView('templates')}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Prebuilt
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start from Template</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Select from industry blueprints (CRM, Support Tickets, Assets) and customize instantly.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Browse Templates</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

                {/* 3. AI Architect */}
                <div 
                  onClick={handleStartAI}
                  className="group relative p-6 bg-indigo-500/10 dark:bg-indigo-500/15 hover:bg-indigo-500/20 border border-indigo-500/30 dark:border-indigo-500/40 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        AI Powered
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Build with AI</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Describe your workflow in plain English and let Aurora AI generate schema and forms for you.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Generate with AI</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setView('choices')}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Options</span>
                  </button>

                  {/* Search filter */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTemplates.map((template) => {
                    const TemplateIcon = template.icon || Layers;
                    const isInstalling = installingId === template.id;

                    return (
                      <div
                        key={template.id}
                        className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 hover:border-indigo-500/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <TemplateIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{template.name}</h4>
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {template.category || 'General'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed mt-1 line-clamp-2">
                              {template.description || 'Pre-configured module template with fields and actions.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {(template as any).fields?.length || 0} fields preconfigured
                          </span>
                          <button
                            onClick={() => handleInstallTemplate(template)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isInstalling ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Installing...</span>
                              </>
                            ) : (
                              <>
                                <span>Install Template</span>
                                <ArrowRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredTemplates.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-zinc-400 text-xs">
                      No templates match "{searchQuery}"
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

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

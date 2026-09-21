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
  Sparkles, 
  Layers
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNewModuleModal } from '../../context/NewModuleModalContext';
import { MODULES } from '../../constants/modules';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { queryTemplateCatalog, getTemplateById, getCachedTemplateCatalog } from '../../services/templateService';

export const NewModuleModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, closeNewModuleModal, view, setView } = useNewModuleModal();
  const { tenant } = usePlatform();
  const { session } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [dbTemplates, setDbTemplates] = useState<any[]>(() => {
    const cached = getCachedTemplateCatalog({ builderType: 'MODULE', includePayload: true }, tenant?.id);
    if (cached?.templates && cached.templates.length > 0) {
      return cached.templates
        .filter((t: any) => t.slug !== 'mod-people_org')
        .map((t: any) => {
          const payload = (t.payload || t.schemaPayload || {}) as any;
          const fields = payload.layout || payload.fields || [];
          return {
            id: t.slug.replace(/^mod-/, ''),
            slug: t.slug,
            name: t.name,
            description: t.description,
            category: t.category || payload.category || 'General',
            fields: fields,
            layout: fields,
            icon: payload.icon || undefined,
            schemaPayload: payload,
            payload: payload
          };
        });
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => dbTemplates.length === 0);

  // Auto-close modal once target route has mounted
  React.useEffect(() => {
    if (isOpen && (location.pathname.includes('/builder/') || location.pathname.includes('/ai-builder'))) {
      closeNewModuleModal();
    }
  }, [location.pathname, isOpen, closeNewModuleModal]);

  // Dynamically load module templates from database
  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const loadDbTemplates = async () => {
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await queryTemplateCatalog({ builderType: 'MODULE', includePayload: true }, token, tenant?.id);
        if (isMounted && res.templates && res.templates.length > 0) {
          const mapped = res.templates
            .filter((t: any) => t.slug !== 'mod-people_org')
            .map((t: any) => {
              const payload = (t.payload || t.schemaPayload || {}) as any;
              const fields = payload.layout || payload.fields || [];
              return {
                id: t.slug.replace(/^mod-/, ''),
                slug: t.slug,
                name: t.name,
                description: t.description,
                category: t.category || payload.category || 'General',
                fields: fields,
                layout: fields,
                icon: payload.icon || undefined,
                schemaPayload: payload,
                payload: payload
              };
            });
          setDbTemplates(mapped);
        }
      } catch (err) {
        console.error('Failed to load module templates from DB catalog:', err);
        if (isMounted && dbTemplates.length === 0) {
          const fallback = MODULES.filter(t => t.id !== 'people_org');
          setDbTemplates(fallback);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDbTemplates();
    return () => {
      isMounted = false;
    };
  }, [isOpen, session?.access_token, tenant?.id]);

  const filteredTemplates = dbTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = async (template: any) => {
    let payload = template.payload || template.schemaPayload;
    if (!payload || (!payload.layout?.length && !payload.fields?.length)) {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const full = await getTemplateById(template.slug || template.id, token, tenant?.id);
      if (full?.payload) {
        payload = full.payload;
      }
    }
    const { icon, isEnabled, ...serializableMod } = template;
    const modData = payload || serializableMod;
    const resolvedFields = (modData.layout?.length > 0 ? modData.layout : (modData.fields || []));
    
    closeNewModuleModal();
    navigate('/workspace/settings/builder/new', {
      state: {
        templateData: {
          name: template.name,
          description: template.description || '',
          category: template.category || modData.category || 'Custom',
          iconName: template.icon?.name || modData.iconName || 'Layers',
          type: modData.type || 'RECORD',
          fields: resolvedFields,
          layout: resolvedFields,
          tabs: modData.tabs || [],
          forms: modData.forms || [],
          connectorMappings: modData.connectorMappings || [],
          dataPopulationRules: modData.dataPopulationRules || [],
          workflows: modData.workflows || [],
          recordKeyPrefix: modData.recordKeyPrefix || '',
          recordKeySuffix: modData.recordKeySuffix || '',
          nextKeyNumber: modData.nextKeyNumber || 1,
          config: modData.config || {}
        }
      }
    });
    toast.success(`Loaded "${template.name}" template into builder draft`);
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
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
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

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 animate-pulse"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-full" />
                            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-4/5" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                          <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-24" />
                          <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTemplates.map((template) => {
                      const TemplateIcon = template.icon || Layers;

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
                              onClick={() => handleSelectTemplate(template)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/20"
                            >
                              <span>Use Template</span>
                              <ArrowRight size={14} />
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
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

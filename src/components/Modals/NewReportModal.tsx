import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  LayoutGrid, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Sparkles,
  Info,
  Layers,
  BarChart3,
  Loader2
} from 'lucide-react';

export interface ReportTemplateOption {
  id: string;
  name: string;
  description: string;
  config: any;
}

export interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: ReportTemplateOption) => void;
  onGenerateAI: (prompt: string) => void;
  templates?: ReportTemplateOption[];
  generatingAI?: boolean;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectTemplate,
  onGenerateAI,
  templates = [],
  generatingAI = false,
}) => {
  const [view, setView] = useState<'choices' | 'templates' | 'ai'>('choices');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setSearchQuery('');
      setAiPrompt('');
    }
  }, [isOpen]);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalNode = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="new-report-modal-container" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Modal Window Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
            {/* Ambient Radial Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    {view === 'templates' 
                      ? 'Report Template Library' 
                      : view === 'ai' 
                        ? 'AI Report Architect' 
                        : 'Create New Analytics Dashboard'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {view === 'templates'
                      ? 'Select a pre-configured dashboard layout to customize in the report builder.'
                      : view === 'ai'
                        ? 'Describe your desired dashboard layout and let Gemini build it.'
                        : 'Select one of the creation mechanisms to formulate your dashboard.'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Content */}
            <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
              {view === 'choices' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                  {/* 1. Start Blank */}
                  <div
                    onClick={onSelectBlank}
                    className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div>
                        <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                          Blank Canvas
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start From Blank</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                          Begin with a clean canvas, connect to any database tables or connectors, and design manually.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <span>Open Blank Studio</span>
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>

                  {/* 2. Choose from Template */}
                  <div
                    onClick={() => setView('templates')}
                    className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LayoutGrid size={24} />
                      </div>
                      <div>
                        <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                          Prebuilt Template
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Choose from Template</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                          Deploy preconfigured, beautiful dashboard layouts for workforce distribution, records activity, or audit logs.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                      <span>Browse Templates</span>
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>

                  {/* 3. AI Dashboard Builder */}
                  <div
                    onClick={() => setView('ai')}
                    className="group relative p-6 bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/40 rounded-3xl transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20 animate-pulse">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold tracking-wider uppercase mb-2">
                          AI Dashboard Builder
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">AI Report Architect</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                          Write a prompt (e.g. "active cases by status") and let Gemini craft the dataset mappings and charts automatically.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <span>Launch AI Builder</span>
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              ) : view === 'templates' ? (
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setView('choices')}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Options</span>
                    </button>

                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search report templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 hover:border-amber-500/40 hover:bg-amber-500/[0.02] transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                            <BarChart3 size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                              {template.name}
                            </h4>
                            <p className="text-xs text-zinc-500 leading-relaxed mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] font-medium text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Layers size={13} className="text-amber-500" /> {template.config?.widgets?.length || 0} Widgets
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 font-bold group-hover:translate-x-1 transition-transform">
                            <span>Use Template</span>
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredTemplates.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-zinc-400 text-xs">
                        No report templates match "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* AI Architect View */
                <div className="space-y-6 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setView('choices')}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Options</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Describe what you want to analyse
                    </label>
                    <textarea
                      placeholder="e.g. Create a workforce overview dashboard showing staff role distributions, team memberships, and active status..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none"
                    />
                    <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs text-zinc-500 leading-normal flex gap-2.5 items-start">
                      <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <span>The AI builder will automatically identify local database tables, configure chart dimensions, and construct widgets for you.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => setView('choices')}
                      className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onGenerateAI(aiPrompt)}
                      disabled={generatingAI || !aiPrompt.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      {generatingAI ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Assembling Dashboard...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>Generate Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

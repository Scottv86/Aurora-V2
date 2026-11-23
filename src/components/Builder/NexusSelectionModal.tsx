import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Zap,
  Shield,
  Wand2,
  Hammer,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { DynamicIcon } from '../UI/DynamicIcon';
import { ManualBuilderView } from './ManualBuilderView';

interface NexusSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: any[];
  registry: any[];
  onSelect: (connector: any, strategy: 'auto' | 'manual', triggerType?: 'lookup' | 'rule') => void;
  onActivate: (connectorId: string) => Promise<any>;
  onCreateCustom: (connector: any) => Promise<any>;
  onForge?: (prompt: string) => Promise<any>;
  selectedField?: any;
}

type ViewMode = 'library' | 'manual' | 'trigger_type' | 'strategy';

export const NexusSelectionModal: React.FC<NexusSelectionModalProps> = ({
  isOpen,
  onClose,
  activeConnectors,
  registry,
  onSelect,
  onActivate,
  onCreateCustom,
  selectedField
}) => {
  const [view, setView] = useState<ViewMode>('library');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConnector, setPendingConnector] = useState<any>(null);
  const [pendingTriggerType, setPendingTriggerType] = useState<'lookup' | 'rule'>('lookup');

  useEffect(() => {
    if (isOpen) {
      setView('library');
      setSearch('');
      setSelectedCategory('All');
      setIsProcessing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(
        (registry || [])
          .map(c => c.category)
          .filter((cat): cat is string => Boolean(cat))
      )
    );
    return ['All', ...cats];
  }, [registry]);

  const filteredRegistry = useMemo(() => {
    const q = search.toLowerCase();
    return (registry || []).filter(c => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [registry, search, selectedCategory]);

  const showStrategyOrTriggerType = (connector: any) => {
    setPendingConnector(connector);
    if (!selectedField) {
      setView('trigger_type');
    } else {
      setView('strategy');
    }
  };

  const handleSelectConnector = async (conn: any) => {
    const existingActive = (activeConnectors || []).find(
      ac => ac.connectorId === conn.id && ac.isActive !== false
    );
    if (existingActive) {
      showStrategyOrTriggerType(existingActive);
      return;
    }

    setIsProcessing(true);
    try {
      const activated = await onActivate(conn.id);
      if (activated) {
        showStrategyOrTriggerType(activated);
      } else {
        toast.error(`Failed to activate ${conn.name}`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Failed to activate ${conn.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSave = async (connector: any) => {
    setIsProcessing(true);
    try {
      const created = await onCreateCustom(connector);
      if (created) {
        showStrategyOrTriggerType(created.activation || created);
      } else {
        toast.error('Failed to create custom integration');
      }
    } catch (err: any) {
      console.error('Manual save failed:', err);
      toast.error(err?.message || 'Failed to create custom integration');
    } finally {
      setIsProcessing(false);
    }
  };

  const headerTitle =
    view === 'library'
      ? 'Connect Integration'
      : view === 'manual'
        ? 'Custom Endpoint Builder'
        : view === 'trigger_type'
          ? 'Trigger Method'
          : 'Provisioning Strategy';

  const headerSubtitle =
    view === 'library'
      ? 'Select an integration from the library or build a custom REST endpoint.'
      : view === 'manual'
        ? 'Define a custom HTTP endpoint and its input/output schema.'
        : view === 'trigger_type'
          ? 'Choose how this integration should be triggered in your module.'
          : 'Choose how API response fields are mapped to your module.';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            className="relative w-full max-w-4xl h-[78vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {view !== 'library' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (view === 'strategy' && !selectedField) {
                        setView('trigger_type');
                      } else {
                        setView('library');
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
                    title="Back"
                  >
                    <ArrowLeft size={15} />
                  </button>
                ) : (
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-lg flex items-center justify-center shrink-0">
                    <Zap size={16} />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {headerTitle}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {headerSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {view === 'library' ? (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col"
                  >
                    {/* Toolbar: Search, Category Pills & Custom Endpoint */}
                    <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
                      <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search integrations..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0",
                              selectedCategory === cat
                                ? "bg-indigo-600 text-white"
                                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setView('manual')}
                        className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Hammer size={13} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Custom Endpoint</span>
                      </button>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start content-start custom-scrollbar">
                      {filteredRegistry.map(conn => {
                        const isActive = Boolean(
                          (activeConnectors || []).find(
                            ac => ac.connectorId === conn.id && ac.isActive !== false
                          )
                        );
                        return (
                          <button
                            key={conn.id}
                            type="button"
                            onClick={() => handleSelectConnector(conn)}
                            className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors text-left group cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0 transition-colors">
                              <DynamicIcon name={conn.icon} size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                  {conn.name}
                                </h4>
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-medium shrink-0">
                                    <CheckCircle2 size={10} />
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium shrink-0">
                                    {conn.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {conn.description || `${conn.category} integration`}
                              </p>
                              <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                <span>{isActive ? 'Select integration' : 'Activate & select'}</span>
                                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {filteredRegistry.length === 0 && (
                        <div className="col-span-2 py-12 text-center">
                          <p className="text-xs text-zinc-500">No integrations match your search.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : view === 'manual' ? (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <ManualBuilderView onSave={handleManualSave} isSaving={isProcessing} />
                  </motion.div>
                ) : view === 'trigger_type' ? (
                  <motion.div
                    key="trigger_type"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex items-center justify-center p-8 gap-5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPendingTriggerType('lookup');
                        setView('strategy');
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-6 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors cursor-pointer text-center"
                    >
                      <div className="w-11 h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-4 transition-colors">
                        <Search size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                        Lookup Field Trigger
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Create a lookup field in the module that searches this API and populates mapped fields on selection.
                      </p>
                      <span className="mt-5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Interactive Search
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPendingTriggerType('rule');
                        setView('strategy');
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-6 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors cursor-pointer text-center"
                    >
                      <div className="w-11 h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-4 transition-colors">
                        <Zap size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                        Conditional Trigger Rule
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Run automatically in the background when record fields change or match a condition.
                      </p>
                      <span className="mt-5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Background Execution
                      </span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="strategy"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex items-center justify-center p-8 gap-5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(pendingConnector, 'auto', pendingTriggerType);
                        onClose();
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-6 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:border-indigo-500 transition-colors cursor-pointer text-center"
                    >
                      <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4">
                        <Wand2 size={20} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Auto-Provision</h3>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Automatically create and map module fields matching this connector&apos;s output schema.
                      </p>
                      <span className="mt-5 px-3 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-medium">
                        Auto-Create &amp; Map
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelect(pendingConnector, 'manual', pendingTriggerType);
                        onClose();
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-6 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors cursor-pointer text-center"
                    >
                      <div className="w-11 h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-4 transition-colors">
                        <ArrowRight size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                        Manual Map
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Map API outputs to existing module fields or create individual fields manually.
                      </p>
                      <span className="mt-5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Full Control
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3"
                  >
                    <Loader2 size={24} className="text-indigo-600 animate-spin" />
                    <div className="text-center">
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Activating Integration</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Configuring tenant connector...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/40 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Shield size={13} className="text-emerald-500" />
                <span>Tenant-isolated encrypted secrets proxy</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

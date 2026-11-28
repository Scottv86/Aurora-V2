import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Lock, Link2, Sparkles } from 'lucide-react';
import {
  SOLUTION_COMPONENT_CATALOG,
  SOLUTION_COMPONENT_COLUMNS,
  SolutionComponentMeta,
  createDefaultArtifactScaffold,
} from './solutionComponentCatalog';
import { SolutionArtifact } from '../../../types/solutions';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { cn } from '../../../lib/utils';

export interface AddSolutionComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingArtifacts: SolutionArtifact[];
  onAddArtifact: (artifact: SolutionArtifact) => void;
}

export const AddSolutionComponentModal: React.FC<AddSolutionComponentModalProps> = ({
  isOpen,
  onClose,
  existingArtifacts,
  onAddArtifact,
}) => {
  const [tab, setTab] = useState<'create' | 'core'>('create');
  const [query, setQuery] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<SolutionComponentMeta | null>(null);
  const [customName, setCustomName] = useState('');

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SOLUTION_COMPONENT_CATALOG;
    return SOLUTION_COMPONENT_CATALOG.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.singularLabel.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [query]);

  const coreModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    const core = PLATFORM_MODULES.filter((m) => m.isCore);
    if (!q) return core;
    return core.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [query]);

  const linkedCoreIds = useMemo(
    () =>
      new Set(
        existingArtifacts
          .filter((a) => a.isSharedCore)
          .map((a) => a.sourceTemplateId || a.slug || a.name.toLowerCase())
      ),
    [existingArtifacts]
  );

  if (!isOpen) return null;

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeta) return;
    const finalName = customName.trim() || `New ${selectedMeta.singularLabel}`;
    const artifact = createDefaultArtifactScaffold(selectedMeta.type, finalName, {
      origin: 'CUSTOM',
    });
    onAddArtifact(artifact);
    setSelectedMeta(null);
    setCustomName('');
    onClose();
  };

  const handleLinkCore = (mod: (typeof PLATFORM_MODULES)[number]) => {
    const artifact = createDefaultArtifactScaffold('MODULE', mod.name, {
      origin: 'CORE',
      isSharedCore: true,
      coreExtensionOnly: true,
      sourceTemplateId: mod.id,
      description: mod.description,
    });
    onAddArtifact(artifact);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-zinc-950/45 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[84vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google-UI Slim Modal Header */}
        <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Add Component
            </h3>
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  setSelectedMeta(null);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  tab === 'create'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                All Builders (19)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('core');
                  setSelectedMeta(null);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1',
                  tab === 'core'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <Link2 size={12} />
                <span>Link Platform Core</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'create'
                  ? 'Search all 19 Aurora builders (Modules, Forms, Roles, Workflows, Agents...)'
                  : 'Search shared Platform Core modules (Directory, Pricing Catalog, Global Lists...)'
              }
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {tab === 'create' ? (
            selectedMeta ? (
              <form onSubmit={handleConfirmCreate} className="max-w-md mx-auto py-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/70 dark:border-indigo-500/25">
                    <selectedMeta.icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      New {selectedMeta.singularLabel}
                    </p>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Name your component
                    </h4>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Component Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={`e.g., Solar ${selectedMeta.singularLabel}`}
                    autoFocus
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedMeta.description}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMeta(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add to Solution</span>
                  </button>
                </div>
              </form>
            ) : (
              SOLUTION_COMPONENT_COLUMNS.map((col) => {
                const items = filteredCatalog.filter((c) => c.column === col.id);
                if (items.length === 0) return null;
                return (
                  <div key={col.id} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {col.title}
                      </h4>
                      <span className="text-[11px] text-zinc-400">{items.length} builders</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              setSelectedMeta(item);
                              setCustomName('');
                            }}
                            className="group text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all cursor-pointer flex items-start gap-2.5"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/15 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.label}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                                {item.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                <Lock size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">Extension-Only Platform Core:</span> Linking a shared Core asset reuses your existing workspace directory and data without duplicating it. Core fields remain protected while your Solution can safely add custom extensions.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {coreModules.map((mod) => {
                  const alreadyLinked = linkedCoreIds.has(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {mod.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
                            Core
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyLinked}
                        onClick={() => handleLinkCore(mod)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors',
                          alreadyLinked
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs'
                        )}
                      >
                        {alreadyLinked ? 'Linked' : 'Link'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Tip */}
        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-indigo-500" />
            <span>Tip: You can also ask Solution Chat to add or link components automatically.</span>
          </span>
          <span>19 Builders Ready</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

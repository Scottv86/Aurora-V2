import React from 'react';
import { Layers, Globe, Layout, Database, X, ArrowRight, ShieldCheck } from 'lucide-react';


export interface DependencyItem {
  id: string;
  name: string;
  type: 'site' | 'workspace' | 'module';
  url?: string;
  lastUpdated?: string;
}

export interface DependencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType: 'Form' | 'Workflow' | 'Validation Ruleset';
  dependencies: DependencyItem[];
}

export const DependencyDrawer: React.FC<DependencyDrawerProps> = ({
  isOpen,
  onClose,
  entityName,
  entityType,
  dependencies
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: DependencyItem['type']) => {
    switch (type) {
      case 'site': return <Globe size={16} className="text-emerald-500" />;
      case 'workspace': return <Layout size={16} className="text-indigo-500" />;
      case 'module': return <Database size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-sm flex justify-end transition-all">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Layers size={18} />
              </span>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Dependency Lineage</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active host locations for <span className="font-semibold text-zinc-800 dark:text-zinc-200">{entityName}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              This {entityType} is live across <strong>{dependencies.length} host locations</strong>. Changes saved in the central library will instantly propagate across all linked pages.
            </p>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 pt-2">Host Locations ({dependencies.length})</h3>

          <div className="space-y-2">
            {dependencies.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex items-center justify-between hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                    <span className="text-[10px] text-zinc-400 capitalize">{item.type} Host</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="text-zinc-400 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

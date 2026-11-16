import React from 'react';
import { X, Check, ArrowUp, ArrowDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { WIDGET_REGISTRY, ALL_WIDGET_IDS } from './widgetRegistry';
import { UserWidgetPreferences } from './types';
import { cn } from '../../../lib/utils';
import { AuroraModal } from '../../UI/AuroraModal';

interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserWidgetPreferences;
  onToggle: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
  onReset: () => void;
}

export const CustomizeWidgetsModal: React.FC<CustomizeWidgetsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onToggle,
  onReorder,
  onReset
}) => {
  // Build sorted list based on preferences.order
  const orderedIds = [
    ...preferences.order.filter((id) => ALL_WIDGET_IDS.includes(id)),
    ...ALL_WIDGET_IDS.filter((id) => !preferences.order.includes(id))
  ];

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...orderedIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onReorder(next);
  };

  const moveDown = (index: number) => {
    if (index >= orderedIds.length - 1) return;
    const next = [...orderedIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onReorder(next);
  };

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                Header Widgets Library
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Choose and order widgets displayed in the top bar.
              </p>
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

        {/* Content list */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {orderedIds.map((id, index) => {
            const widget = WIDGET_REGISTRY[id];
            if (!widget) return null;
            const isEnabled = preferences.enabledIds.includes(id);
            const IconComponent = widget.icon;

            return (
              <div
                key={id}
                className={cn(
                  "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
                  isEnabled
                    ? "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 shadow-2xs"
                    : "bg-transparent border-zinc-200/60 dark:border-zinc-800/60 opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                    isEnabled
                      ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                  )}>
                    <IconComponent size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {widget.name}
                      </span>
                      {id === 'weather' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {widget.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Order Up / Down */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move widget left/earlier"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedIds.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move widget right/later"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>

                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => onToggle(id)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ml-1",
                      isEnabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                    title={isEnabled ? "Disable widget" : "Enable widget"}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center",
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    >
                      {isEnabled && <Check size={10} className="text-indigo-600" />}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Reset to Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </AuroraModal>
  );
};

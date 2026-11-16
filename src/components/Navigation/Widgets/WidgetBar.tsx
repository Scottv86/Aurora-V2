import React, { useState, useRef, useEffect } from 'react';
import { useHeaderWidgets } from './useHeaderWidgets';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { CustomizeWidgetsModal } from './CustomizeWidgetsModal';
import { SlidersHorizontal, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const WidgetBar: React.FC = () => {
  const {
    preferences,
    toggleWidget,
    reorderWidgets,
    resetToDefaults,
    isCustomizeOpen,
    setIsCustomizeOpen
  } = useHeaderWidgets();

  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOverflowOpen]);

  // Filter and sort active widgets based on user preferences
  const activeWidgetIds = preferences.order
    .filter((id) => preferences.enabledIds.includes(id) && WIDGET_REGISTRY[id]);

  const maxVisible = preferences.maxVisibleDesktop || 3;
  const visibleIds = activeWidgetIds.slice(0, maxVisible);
  const overflowIds = activeWidgetIds.slice(maxVisible);

  return (
    <>
      <div 
        className="flex items-center gap-1.5 md:gap-2 group/widgetbar"
        onContextMenu={(e) => {
          e.preventDefault();
          setIsCustomizeOpen(true);
        }}
        title="Right click to customize widgets"
      >
        {/* Render visible active widgets */}
        {visibleIds.map((id) => {
          const def = WIDGET_REGISTRY[id];
          if (!def) return null;
          const Component = def.component;
          return (
            <Component
              key={id}
              onOpenCustomize={() => setIsCustomizeOpen(true)}
            />
          );
        })}

        {/* Empty state pill if user disabled all widgets */}
        {visibleIds.length === 0 && (
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition-all cursor-pointer"
            title="Configure header widgets"
          >
            <Plus size={12} />
            <span>Add Widgets</span>
          </button>
        )}

        {/* Overflow Pill for extra widgets if > maxVisible */}
        {overflowIds.length > 0 && (
          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer",
                isOverflowOpen && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
              )}
              title={`${overflowIds.length} more widget(s)`}
            >
              <span>+{overflowIds.length}</span>
              <ChevronDown size={12} className={cn("transition-transform duration-200", isOverflowOpen && "rotate-180")} />
            </button>

            {isOverflowOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 p-2 z-[65] min-w-[200px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
                  More Widgets
                </div>
                {overflowIds.map((id) => {
                  const def = WIDGET_REGISTRY[id];
                  if (!def) return null;
                  const Component = def.component;
                  return (
                    <div key={id} className="p-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <Component
                        onOpenCustomize={() => {
                          setIsOverflowOpen(false);
                          setIsCustomizeOpen(true);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Hover quick-customize slider button */}
        {visibleIds.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover/widgetbar:opacity-100 cursor-pointer"
            title="Customize Header Widgets"
          >
            <SlidersHorizontal size={13} />
          </button>
        )}
      </div>

      {/* Global Customize Modal */}
      <CustomizeWidgetsModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        preferences={preferences}
        onToggle={toggleWidget}
        onReorder={reorderWidgets}
        onReset={resetToDefaults}
      />
    </>
  );
};

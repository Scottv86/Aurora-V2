import React from 'react';
import { PageHeader } from '../UI/PageHeader';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export interface SettingsSubNavItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  description?: string;
  badge?: string | number;
}

interface SettingsSubNavLayoutProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  sectionTitle?: string;
  items: SettingsSubNavItem[];
  activeId: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable Left Navigation Sidebar Layout matching the full-height Drive App layout styling.
 */
export const SettingsSubNavLayout: React.FC<SettingsSubNavLayoutProps> = ({
  title,
  description,
  actions,
  sectionTitle,
  items,
  activeId,
  onTabChange,
  children,
  className
}) => {
  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative", className)}>
      {/* Standardized Full-Width Page Header */}
      <PageHeader 
        title={title}
        description={description}
        actions={actions}
      />

      {/* Main Body Layout matching DriveApp */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* Left Navigation Sidebar */}
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              {sectionTitle && (
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 px-3 mb-2">
                  {sectionTitle}
                </p>
              )}
              <nav className="space-y-0.5" aria-label="Settings navigation">
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-left cursor-pointer relative",
                        isActive
                          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                      )}
                    >
                      {ItemIcon && (
                        <ItemIcon 
                          size={18} 
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive 
                              ? "text-indigo-600 dark:text-white" 
                              : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                          )} 
                        />
                      )}
                      <span className="text-sm font-medium flex-1 text-left truncate">{item.label}</span>

                      {item.badge !== undefined && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          isActive
                            ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30"
                            : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

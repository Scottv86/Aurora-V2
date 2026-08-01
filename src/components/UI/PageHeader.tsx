import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  iconClassName?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}

/**
 * Standard PageHeader component for consistent layout across the platform.
 * Replaces ad-hoc headers and standardizes typography and spacing.
 */
export const PageHeader = ({ 
  title, 
  description, 
  icon: Icon,
  iconClassName,
  actions, 
  tabs,
  className 
}: PageHeaderProps) => {
  return (
    <div className={cn(
      "px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20 -mx-6 lg:-mx-12 -mt-10 mb-8",
      className
    )}>
      {(title || Icon) && (
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0", iconClassName)}>
              <Icon size={24} />
            </div>
          )}
          {title && (
            <div>
              <h1 className="text-lg font-bold text-zinc-950 dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {actions && (
        <div className={cn("flex items-center gap-3 shrink-0", !(title || Icon) && "ml-auto")}>
          {actions}
        </div>
      )}
      {tabs && (
        <div className="w-full border-b border-zinc-200 dark:border-zinc-800 mt-2">
          {tabs}
        </div>
      )}
    </div>
  );
};

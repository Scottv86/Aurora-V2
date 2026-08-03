import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
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
  actions, 
  tabs,
  className 
}: PageHeaderProps) => {
  return (
    <div className={cn(
      "w-full px-6 lg:px-12 py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20",
      className
    )}>
      {title && (
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      {actions && (
        <div className={cn("flex items-center gap-3 shrink-0", !title && "ml-auto")}>
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

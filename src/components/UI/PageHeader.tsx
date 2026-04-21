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
    <div className={cn("space-y-6 mb-8", className)}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className={cn("p-3 rounded-2xl shadow-lg", iconClassName)}>
              <Icon size={24} className="text-white" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="text-zinc-500 dark:text-zinc-400 max-w-3xl text-sm font-medium leading-relaxed mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {tabs && (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          {tabs}
        </div>
      )}
    </div>
  );
};

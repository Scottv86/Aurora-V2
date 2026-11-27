import React from 'react';
import { cn } from '../../../lib/utils';

export interface RecordSectionTabBarSurfaceProps {
  children: React.ReactNode;
  trailingSlot?: React.ReactNode;
  className?: string;
}

/**
 * Shared h-10 underline section tab bar container used by both
 * `RecordDetailView` and `ModuleEditor` Detail View.
 */
export const RecordSectionTabBarSurface: React.FC<RecordSectionTabBarSurfaceProps> = ({
  children,
  trailingSlot,
  className,
}) => {
  return (
    <div
      className={cn(
        'px-5 h-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 select-none shrink-0',
        className
      )}
    >
      <div className="flex-1 flex items-center gap-1 overflow-hidden relative h-full">
        {children}
      </div>
      {trailingSlot && <div className="flex items-center gap-2 shrink-0">{trailingSlot}</div>}
    </div>
  );
};

export interface RecordSectionSplitSidebarSurfaceProps {
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
}

/**
 * Shared left sidebar container for Split Layout mode in both
 * `RecordDetailView` and `ModuleEditor`.
 */
export const RecordSectionSplitSidebarSurface: React.FC<RecordSectionSplitSidebarSurfaceProps> = ({
  children,
  footerSlot,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-64 md:w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full overflow-hidden',
        className
      )}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
        {children}
      </div>
      {footerSlot && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          {footerSlot}
        </div>
      )}
    </div>
  );
};

export interface RecordSectionNavItemButtonProps {
  active?: boolean;
  isSubtab?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Shared visual styling for a Split-layout section navigation item.
 */
export const RecordSectionSplitNavItem: React.FC<RecordSectionNavItemButtonProps> = ({
  active = false,
  isSubtab = false,
  onClick,
  children,
  className,
  title,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group cursor-pointer',
        active
          ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-bold shadow-sm'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60',
        isSubtab && 'pl-7 border-l-2 border-zinc-200 dark:border-zinc-800 ml-3.5 rounded-l-none',
        className
      )}
    >
      {children}
    </button>
  );
};

import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from './Primitives';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className
}) => {
  const ActionIcon = action?.icon || Plus;

  return (
    <div
      className={cn(
        "p-12 lg:p-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl text-center space-y-4 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl flex flex-col items-center justify-center min-h-[300px] w-full transition-all",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/50 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shadow-inner">
        <Icon size={28} />
      </div>

      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="pt-2 flex items-center gap-3 justify-center">
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/10 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <ActionIcon size={15} />
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

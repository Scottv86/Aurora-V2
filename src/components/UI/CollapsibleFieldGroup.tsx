import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Layers, ListPlus, Box, LayoutGrid, FolderTree, ListOrdered, GitCommit, Folder } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ModuleField } from '../../types/platform';
import { DynamicIcon } from './DynamicIcon';

interface CollapsibleFieldGroupProps {
  field: ModuleField;
  children: React.ReactNode;
  initialCollapsed?: boolean;
  className?: string;
  actions?: React.ReactNode;
  count?: number;
  isCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export const CollapsibleFieldGroup: React.FC<CollapsibleFieldGroupProps> = ({ 
  field, 
  children, 
  initialCollapsed = false,
  className,
  actions,
  count,
  isCollapsed: controlledCollapsed,
  onToggle
}) => {
  const isCollapsible = field.collapsible;
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsible ? (field.defaultCollapsed ?? initialCollapsed) : false);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (isCollapsible) {
      if (onToggle) {
        onToggle(!isCollapsed);
      } else {
        setInternalCollapsed(!isCollapsed);
      }
    }
  };

  const getIcon = () => {
    if (field.iconName) {
      return <DynamicIcon name={field.iconName} size={14} />;
    }
    
    switch (field.type) {
      case 'card': return <Box size={14} />;
      case 'accordion': return <LayoutGrid size={14} />;
      case 'tabs_nested': return <FolderTree size={14} />;
      case 'stepper': return <ListOrdered size={14} />;
      case 'timeline': return <GitCommit size={14} />;
      case 'repeatableGroup': return <ListPlus size={14} />;
      case 'group': return <Layers size={14} />;
      case 'fieldGroup': return <Folder size={14} />;
      default: return <Layers size={14} />;
    }
  };

  const [isAnimating, setIsAnimating] = useState(false);

  // Default to true if not specified to preserve existing behavior
  const showIcon = field.showIcon !== false;

  return (
    <div className={cn(
      "transition-all duration-300 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 relative focus-within:z-30 hover:z-20",
      (isCollapsed || isAnimating) ? "overflow-hidden" : "overflow-visible",
      isCollapsed ? "shadow-xs" : "shadow-sm",
      className
    )}>
      {/* Header - Slim & Dense */}
      <div 
        className={cn(
          "px-3.5 py-2 flex items-center justify-between select-none",
          isCollapsible ? "cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors" : "",
          isCollapsed ? "rounded-xl" : "rounded-t-xl"
        )}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider truncate">
                {field.label}
              </h5>
              {count !== undefined && (
                <span className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px] font-mono font-semibold text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                  {count}
                </span>
              )}
            </div>
            {field.helperText && (
              <p className="text-[10px] text-zinc-400 font-medium tracking-normal mt-0.5 truncate">
                {field.helperText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          {isCollapsible && (
            <div className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer">
              <ChevronDown 
                size={14} 
                className={cn("transition-transform duration-200 ease-out", isCollapsed ? "-rotate-90" : "rotate-0")} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isCollapsible ? (
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onAnimationStart={() => setIsAnimating(true)}
              onAnimationComplete={() => setIsAnimating(false)}
              transition={{ 
                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 }
              }}
              className={cn(isAnimating ? "overflow-hidden" : "overflow-visible")}
            >
              <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />
              <div className="p-3.5">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="overflow-visible">
          <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="p-3.5">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

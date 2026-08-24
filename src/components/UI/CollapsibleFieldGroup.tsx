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

  const isCard = field.type === 'card';
  const isAccordion = field.type === 'accordion';
  const isTabs = field.type === 'tabs_nested';

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

  // Default to true if not specified to preserve existing behavior
  const showIcon = field.showIcon !== false;

  return (
    <div className={cn(
      "overflow-hidden transition-all duration-300 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80",
      isCollapsed ? "shadow-xs" : "shadow-sm",
      className
    )}>
      {/* Header */}
      <div 
        className={cn(
          "px-4.5 py-3.5 flex items-center justify-between select-none",
          isCollapsible ? "cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors" : ""
        )}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2.5">
          {showIcon && (
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
              isCollapsed 
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" 
                : "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20"
            )}>
              {getIcon()}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {field.label}
              </h5>
              {count !== undefined && (
                <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[9px] font-semibold text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                  {count}
                </span>
              )}
            </div>
            {field.helperText && (
              <p className="text-[10px] text-zinc-400 font-medium tracking-normal mt-0.5">
                {field.helperText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {isCollapsible && (
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200",
              isCollapsed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-300"
            )}>
              <ChevronDown 
                size={14} 
                className={cn("transition-transform duration-300 ease-out", isCollapsed ? "-rotate-90" : "rotate-0")} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.15 }
            }}
          >
            <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />
            <div className="p-4.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

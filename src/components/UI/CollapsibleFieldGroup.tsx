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
      return <DynamicIcon name={field.iconName} size={18} />;
    }
    
    switch (field.type) {
      case 'card': return <Box size={18} />;
      case 'accordion': return <LayoutGrid size={18} />;
      case 'tabs_nested': return <FolderTree size={18} />;
      case 'stepper': return <ListOrdered size={18} />;
      case 'timeline': return <GitCommit size={18} />;
      case 'repeatableGroup': return <ListPlus size={18} />;
      case 'group': return <Layers size={18} />;
      case 'fieldGroup': return <Folder size={18} />;
      default: return <Layers size={18} />;
    }
  };

  // Default to true if not specified to preserve existing behavior
  const showIcon = field.showIcon !== false;

  return (
    <div className={cn(
      "overflow-hidden transition-all duration-300",
      isCard ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-xl shadow-black/5" :
      "bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem]",
      isCollapsed ? "shadow-sm" : "shadow-lg shadow-black/5",
      className
    )}>
      {/* Header */}
      <div 
        className={cn(
          "px-6 py-5 flex items-center justify-between select-none",
          isCollapsible ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/50" : ""
        )}
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500",
              isCollapsed 
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" 
                : isCard ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" :
                  isAccordion ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20" :
                  isTabs ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" :
                  "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
            )}>
              {getIcon()}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                {field.label}
              </h5>
              {count !== undefined && (
                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[9px] font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {count}
                </span>
              )}
            </div>
            {field.helperText && (
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 opacity-70">
                {field.helperText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actions}
          {isCollapsible && (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
              isCollapsed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
            )}>
              <ChevronDown 
                size={16} 
                className={cn("transition-transform duration-500 ease-out", isCollapsed ? "-rotate-90" : "rotate-0")} 
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
              height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.2, delay: 0.1 }
            }}
          >
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 opacity-50" />
            <div className="px-6 pb-6 pt-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

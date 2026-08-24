import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { DynamicIcon } from './DynamicIcon';
import { cn } from '../../lib/utils';
import { ModuleField } from '../../types/platform';

interface AccordionSectionProps {
  section: ModuleField;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isLast: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ 
  section, 
  isOpen, 
  onToggle, 
  children,
  isLast
}) => {
  return (
    <div className={cn(
      "overflow-hidden transition-all duration-300",
      !isLast && "border-b border-zinc-100/80 dark:border-zinc-800/50"
    )}>
      {/* Header */}
      <div 
        onClick={onToggle}
        className="px-4.5 py-3.5 flex items-center justify-between cursor-pointer select-none group/header transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
            isOpen 
              ? "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          )}>
            <DynamicIcon name={section.iconName || 'Folder'} size={14} />
          </div>
          <div>
            <h5 className={cn(
              "text-xs font-bold uppercase tracking-wider transition-colors",
              isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-white"
            )}>
              {section.label}
            </h5>
            {section.helperText && (
              <p className="text-[10px] text-zinc-400 font-medium tracking-normal mt-0.5">
                {section.helperText}
              </p>
            )}
          </div>
        </div>

        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200",
          isOpen ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-300 rotate-180" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
        )}>
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.15 }
            }}
          >
            <div className="p-5 border-t border-zinc-200/60 dark:border-zinc-800/60">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AccordionContainerProps {
  field: ModuleField;
  renderContent: (section: ModuleField) => React.ReactNode;
  defaultOpenId?: string;
  className?: string;
}

export const AccordionContainer: React.FC<AccordionContainerProps> = ({
  field,
  renderContent,
  defaultOpenId,
  className
}) => {
  const sections = field.fields || [];
  const [openId, setOpenId] = useState<string | null>(defaultOpenId || sections[0]?.id || null);

  const handleToggle = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <div className={cn(
      "w-full bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs",
      className
    )}>
      {/* Main Accordion Header */}
      <div className="px-4.5 py-3.5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
          <DynamicIcon name={field.iconName || 'ListOrdered'} size={16} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            {field.label}
          </h4>
          {field.helperText && (
            <p className="text-[10px] text-zinc-400 font-medium tracking-normal mt-0.5">
              {field.helperText}
            </p>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col">
        {sections.map((section, idx) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={openId === section.id}
            onToggle={() => handleToggle(section.id)}
            isLast={idx === sections.length - 1}
          >
            {renderContent(section)}
          </AccordionSection>
        ))}

        {sections.length === 0 && (
          <div className="p-8 text-center opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">No subsections defined</p>
          </div>
        )}
      </div>
    </div>
  );
};

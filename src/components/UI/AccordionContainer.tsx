import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
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
      !isLast && "border-b border-zinc-100 dark:border-zinc-800/50"
    )}>
      {/* Header */}
      <div 
        onClick={onToggle}
        className={cn(
          "px-8 py-5 flex items-center justify-between cursor-pointer select-none group/header transition-colors",
          isOpen ? "bg-zinc-50/50 dark:bg-zinc-900/30" : "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500",
            isOpen 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover/header:scale-110"
          )}>
            <DynamicIcon name={section.iconName || 'Folder'} size={14} />
          </div>
          <div>
            <h5 className={cn(
              "text-[11px] font-bold uppercase tracking-tight transition-colors",
              isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-white"
            )}>
              {section.label}
            </h5>
            {section.helperText && (
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 opacity-70">
                {section.helperText}
              </p>
            )}
          </div>
        </div>

        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-indigo-500/10 text-indigo-500 rotate-180" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
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
              height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.2 }
            }}
          >
            <div className="p-8 bg-white/30 dark:bg-zinc-950/20">
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
      "w-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm",
      className
    )}>
      {/* Main Accordion Header */}
      <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
          <DynamicIcon name={field.iconName || 'ListOrdered'} size={24} />
        </div>
        <div>
          <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">
            {field.label}
          </h4>
          {field.helperText && (
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-70">
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
          <div className="p-12 text-center opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">No subsections defined</p>
          </div>
        )}
      </div>
    </div>
  );
};

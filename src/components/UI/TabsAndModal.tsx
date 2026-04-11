import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './Primitives';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => {
  return (
    <div className={cn('flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors outline-none',
              isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800',
              sizes[size]
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

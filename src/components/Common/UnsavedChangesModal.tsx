import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface UnsavedChangesModalProps {
  isOpen?: boolean;
  title?: string;
  description?: string;
  entityName?: string;
  isSaving?: boolean;
  onSaveAndExit: () => void | Promise<void>;
  onDiscardAndExit: () => void | Promise<void>;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen = true,
  title = 'Unsaved Changes',
  description,
  entityName = 'builder',
  isSaving = false,
  onSaveAndExit,
  onDiscardAndExit,
  onCancel
}) => {
  if (!isOpen) return null;

  const defaultDescription = `You have unsaved changes in this ${entityName}. What would you like to do before leaving?`;

  const modalNode = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-center space-y-5 z-10"
      >
        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description || defaultDescription}
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Exit</span>
            )}
          </button>
          <button
            type="button"
            onClick={onDiscardAndExit}
            disabled={isSaving}
            className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-50"
          >
            Discard Changes & Exit
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full py-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            Keep Editing
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

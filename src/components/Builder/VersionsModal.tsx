import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Plus, Rocket } from 'lucide-react';
import { VersionsSetupTab } from './VersionsSetupTab';
import { ModuleVersionSnapshot, ModuleVersionSnapshotState } from '../../types/versionControl';

interface VersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  isDirty: boolean;
  onSaveNewVersion: () => void;
  onOpenDeployModal: (targetVersionId?: string) => void;
  onRestoreToDraft: (snapshot: ModuleVersionSnapshotState, version: ModuleVersionSnapshot) => Promise<void> | void;
}

export const VersionsModal: React.FC<VersionsModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  isDirty,
  onSaveNewVersion,
  onOpenDeployModal,
  onRestoreToDraft
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          {/* Large Standalone Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-[95vw] max-w-[1440px] h-[92vh] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <History size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    Versions &amp; Releases
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">
                    {moduleName} &middot; Browse AI-written commit history, restore drafts, or promote to production
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onSaveNewVersion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Save Version</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeployModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  <Rocket size={13} />
                  <span>Deploy</span>
                </button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <VersionsSetupTab
                moduleId={moduleId}
                moduleName={moduleName}
                isDirty={isDirty}
                hidePageHeader={true}
                onSaveNewVersion={onSaveNewVersion}
                onOpenDeployModal={(targetVersionId) => {
                  onClose();
                  onOpenDeployModal(targetVersionId);
                }}
                onRestoreToDraft={onRestoreToDraft}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

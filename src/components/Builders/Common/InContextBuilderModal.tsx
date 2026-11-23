import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, ArrowLeft, X } from 'lucide-react';

import { Button } from '../../UI/Primitives';
import { StandaloneBuilderContext } from '../../../types/platform';
import { UnsavedChangesModal } from '../../Common/UnsavedChangesModal';

export interface InContextBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  builderContext: StandaloneBuilderContext;
  children: React.ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  onSaveAndExit?: () => void | Promise<void>;
  onDiscardAndExit?: () => void | Promise<void>;
}

export const InContextBuilderModal: React.FC<InContextBuilderModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  builderContext,
  children,
  onSave,
  isSaving = false,
  isDirty = false,
  onSaveAndExit,
  onDiscardAndExit
}) => {
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showUnsavedModal) {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isDirty, showUnsavedModal]);

  if (!isOpen) return null;

  const handleSaveAndExit = async () => {
    if (onSaveAndExit) {
      await onSaveAndExit();
      setShowUnsavedModal(false);
    } else if (onSave) {
      await onSave();
      setShowUnsavedModal(false);
    } else {
      setShowUnsavedModal(false);
      onClose();
    }
  };

  const handleDiscardAndExit = async () => {
    if (onDiscardAndExit) {
      await onDiscardAndExit();
    }
    setShowUnsavedModal(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Google-Style Slim Top Bar (48px) */}
      <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h2>
            {subtitle && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="h-8 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save & Exit'}</span>
            </Button>
          )}
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Full-Screen Builder Content Area */}
      <div className="flex-1 overflow-hidden bg-zinc-50/40 dark:bg-zinc-950">
        {children}
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedModal && (
        <UnsavedChangesModal
          isOpen={showUnsavedModal}
          entityName={title}
          isSaving={isSaving}
          onSaveAndExit={handleSaveAndExit}
          onDiscardAndExit={handleDiscardAndExit}
          onCancel={() => setShowUnsavedModal(false)}
        />
      )}
    </div>,
    document.body
  );
};

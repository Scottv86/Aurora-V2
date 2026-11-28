import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, ArrowLeft, X, ChevronDown, Check, Lock, ExternalLink } from 'lucide-react';

import { Button } from '../../UI/Primitives';
import { StandaloneBuilderContext } from '../../../types/platform';
import { UnsavedChangesModal } from '../../Common/UnsavedChangesModal';
import { cn } from '../../../lib/utils';

export interface SiblingSwitcherItem {
  id: string;
  name: string;
  badge?: string;
}

export interface InContextBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  backLabel?: string;
  saveLabel?: string;
  builderContext: StandaloneBuilderContext;
  children: React.ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  onSaveAndExit?: () => void | Promise<void>;
  onDiscardAndExit?: () => void | Promise<void>;
  /** Sibling components of the same type for instant switching without closing the modal */
  siblings?: SiblingSwitcherItem[];
  activeSiblingId?: string;
  onSelectSibling?: (id: string) => void;
  /** Shows the Extension-Only Platform Core protection banner */
  isCoreExtensionOnly?: boolean;
  coreGlobalRoute?: string;
  onOpenCoreGlobal?: () => void;
}

export const InContextBuilderModal: React.FC<InContextBuilderModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  backLabel = 'Back to Solution',
  saveLabel = 'Save & Close',
  children,
  onSave,
  isSaving = false,
  isDirty = false,
  onSaveAndExit,
  onDiscardAndExit,
  siblings = [],
  activeSiblingId,
  onSelectSibling,
  isCoreExtensionOnly = false,
  onOpenCoreGlobal,
}) => {
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSiblingMenuOpen, setIsSiblingMenuOpen] = useState(false);
  const siblingMenuRef = useRef<HTMLDivElement>(null);

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
        if (isSiblingMenuOpen) setIsSiblingMenuOpen(false);
        else handleAttemptClose();
      }
    };
    const onOutside = (e: MouseEvent) => {
      if (siblingMenuRef.current && !siblingMenuRef.current.contains(e.target as Node)) {
        setIsSiblingMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [isOpen, isDirty, showUnsavedModal, isSiblingMenuOpen]);

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

  const hasSiblings = siblings.length > 1 && Boolean(onSelectSibling);

  return createPortal(
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center bg-zinc-950/45 backdrop-blur-[2px] p-2.5 sm:p-4"
      onClick={handleAttemptClose}
    >
      <div
        className="w-full h-full max-w-[1680px] flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google-Style Slim Top Bar (48px) */}
        <div className="h-12 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium cursor-pointer shrink-0"
              title={backLabel}
            >
              <ArrowLeft size={14} />
              <span>{backLabel}</span>
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            {/* Title or Sibling Switcher */}
            {hasSiblings ? (
              <div className="relative min-w-0" ref={siblingMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSiblingMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer max-w-[260px]"
                  title="Switch between sibling components"
                >
                  <span className="truncate">{title}</span>
                  <ChevronDown size={14} className="text-zinc-400 shrink-0" />
                </button>

                {isSiblingMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Switch {subtitle || 'Component'} ({siblings.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto py-0.5">
                      {siblings.map((sib) => {
                        const isActive = sib.id === activeSiblingId;
                        return (
                          <button
                            key={sib.id}
                            type="button"
                            onClick={() => {
                              setIsSiblingMenuOpen(false);
                              if (!isActive) onSelectSibling?.(sib.id);
                            }}
                            className={cn(
                              'w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer',
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold'
                                : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            )}
                          >
                            <span className="truncate">{sib.name}</span>
                            {isActive && <Check size={13} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {title}
              </h2>
            )}

            {subtitle && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                {subtitle}
              </span>
            )}

            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                title="Unsaved changes"
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSave && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="h-8 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Save size={13} />
                <span>{isSaving ? 'Saving...' : saveLabel}</span>
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

        {/* Extension-Only Platform Core Banner */}
        {isCoreExtensionOnly && (
          <div className="px-4 py-2 bg-amber-50/90 dark:bg-amber-500/10 border-b border-amber-200/80 dark:border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Lock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                <strong className="font-semibold">Shared Platform Core (Extension-Only):</strong>{' '}
                Core baseline fields are protected. Changes here save as additive Solution extensions.
              </span>
            </div>
            {onOpenCoreGlobal && (
              <button
                type="button"
                onClick={onOpenCoreGlobal}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:underline shrink-0 cursor-pointer"
              >
                <span>Edit global Core asset</span>
                <ExternalLink size={11} />
              </button>
            )}
          </div>
        )}

        {/* Builder Content Area */}
        <div className="flex-1 overflow-hidden bg-zinc-50/40 dark:bg-zinc-950 relative">
          {children}
        </div>
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

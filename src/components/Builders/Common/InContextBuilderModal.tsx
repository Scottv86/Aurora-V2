import React from 'react';
import { createPortal } from 'react-dom';
import { Save, ArrowLeft } from 'lucide-react';

import { Button } from '../../UI/Primitives';
import { StandaloneBuilderContext } from '../../../types/platform';

interface InContextBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  builderContext: StandaloneBuilderContext;
  children: React.ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
}

export const InContextBuilderModal: React.FC<InContextBuilderModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  builderContext,
  children,
  onSave,
  isSaving = false
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-white dark:bg-zinc-950 overflow-hidden animate-in fade-in duration-150">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-all text-xs font-bold"
            title="Back to Platform Settings"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span>{builderContext.mode === 'global' ? 'Platform Settings' : `${builderContext.hostType?.toUpperCase()} Host`}</span>
              <span>/</span>
              <span className="text-indigo-600 dark:text-indigo-400">{title}</span>
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs px-3.5 py-1.5 rounded-xl"
          >
            Close
          </Button>

          {onSave && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-1.5 rounded-xl font-semibold shadow-md transition-all"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save & Exit'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Full-Screen Builder Content Area */}
      <div className="flex-1 overflow-y-auto bg-zinc-100/50 dark:bg-zinc-900/30">
        {children}
      </div>
    </div>,
    document.body
  );
};

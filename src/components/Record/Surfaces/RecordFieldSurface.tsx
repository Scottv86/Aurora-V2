import React from 'react';
import { HelpCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface RecordFieldSurfaceProps {
  label: React.ReactNode;
  required?: boolean;
  tooltip?: string;
  /** Optional trailing badges in the label row (e.g. collaborator badge, AI badge, edit/lock icons) */
  labelTrailingSlot?: React.ReactNode;
  /** The rendered FieldInput or visual control */
  children: React.ReactNode;
  /** Optional validation error message */
  error?: { message: string; severity?: 'error' | 'warning' } | null;
  /** Optional helper text shown when there is no validation error */
  helperText?: string;
  /** Extra classes/styles on the outer wrapper (e.g. collaborator ring, AI highlight, conditional formatting) */
  className?: string;
  style?: React.CSSProperties;
  onFocusCapture?: React.FocusEventHandler<HTMLDivElement>;
  onBlurCapture?: React.FocusEventHandler<HTMLDivElement>;
}

/**
 * Shared Record Field visual surface used by both the live workspace
 * `RecordDetailView` and the Module Builder Interface Detail View.
 * Guarantees 1:1 typography, spacing, label styling, and helper/error rendering.
 */
export const RecordFieldSurface: React.FC<RecordFieldSurfaceProps> = ({
  label,
  required = false,
  tooltip,
  labelTrailingSlot,
  children,
  error,
  helperText,
  className,
  style,
  onFocusCapture,
  onBlurCapture,
}) => {
  return (
    <div
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      style={style}
      className={cn('space-y-1 relative transition-all duration-200 rounded-xl', className)}
    >
      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
        <span className="truncate">{label}</span>
        {required && <span className="text-rose-500">*</span>}
        {labelTrailingSlot}
        {tooltip && (
          <div className="relative cursor-help">
            <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
              {tooltip}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-zinc-900" />
            </div>
          </div>
        )}
      </label>

      {children}

      {error ? (
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1.5 font-bold px-0.5 text-[9px] uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-200',
            error.severity === 'warning'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {error.severity === 'warning' ? (
            <AlertTriangle size={10} className="shrink-0" />
          ) : (
            <AlertCircle size={10} className="shrink-0" />
          )}
          <span>{error.message}</span>
        </div>
      ) : helperText ? (
        <p className="text-[10px] text-zinc-500 mt-0.5 font-medium px-0.5 italic truncate max-w-full">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

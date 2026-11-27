import React from 'react';
import { GripVertical, Eye, EyeOff, Copy, Trash2, Lock, Zap, Calculator } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DesignControlOverlayProps {
  children: React.ReactNode;
  isSelected?: boolean;
  isHidden?: boolean;
  isReadOnly?: boolean;
  hasVisibilityRule?: boolean;
  hasCalculation?: boolean;
  isDragging?: boolean;
  isRestricted?: boolean;
  /** Optional width badge label, e.g. 'Full', '1/2', '1/3' */
  widthLabel?: string;
  onCycleWidth?: (e: React.MouseEvent) => void;
  /** Optional drag handle props (e.g. from dnd-kit or RGL class) */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  dragHandleClassName?: string;
  /** Quick actions */
  onToggleHidden?: (e: React.MouseEvent) => void;
  onDuplicate?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  /** Optional extra micro-badges (e.g. 'Meta', 'Custom', 'Prefill') */
  extraBadges?: React.ReactNode;
  /** Optional extra action buttons on the floating bar */
  extraActions?: React.ReactNode;
  /** Click handler on the wrapper */
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  /** Whether to disable pointer events on children (keeps live FieldInput non-focusable in design mode) */
  disableChildPointerEvents?: boolean;
}

/**
 * Zero-layout-shift floating hover & selection overlay for WYSIWYG Builder canvases.
 * At rest, renders children with zero extra padding, border, or vertical offset so
 * the canvas matches the live workspace 1:1. On hover or selection, floats a sleek
 * Google/Linear-style pill toolbar along the top-right edge.
 */
export const DesignControlOverlay: React.FC<DesignControlOverlayProps> = ({
  children,
  isSelected = false,
  isHidden = false,
  isReadOnly = false,
  hasVisibilityRule = false,
  hasCalculation = false,
  isDragging = false,
  isRestricted = false,
  widthLabel,
  onCycleWidth,
  dragHandleProps,
  dragHandleClassName,
  onToggleHidden,
  onDuplicate,
  onDelete,
  extraBadges,
  extraActions,
  onClick,
  className,
  disableChildPointerEvents = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group/design relative rounded-xl transition-all cursor-pointer select-none',
        isDragging && 'opacity-50 scale-[1.01] z-50',
        isSelected
          ? 'ring-2 ring-indigo-500/70 bg-indigo-500/[0.025] z-30'
          : 'hover:ring-1 hover:ring-indigo-500/45 hover:bg-indigo-500/[0.015] hover:z-30',
        isHidden && 'opacity-50 grayscale-[0.35] hover:opacity-95 hover:grayscale-0',
        className
      )}
    >
      {/* Floating Hover / Selected Pill Toolbar (zero layout shift) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute -top-3 right-1.5 z-40 flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border shadow-md transition-all duration-150',
          isSelected
            ? 'opacity-100 translate-y-0 border-indigo-400/70 dark:border-indigo-500/60 pointer-events-auto'
            : 'opacity-0 -translate-y-0.5 border-zinc-200 dark:border-zinc-700 pointer-events-none group-hover/design:opacity-100 group-hover/design:translate-y-0 group-hover/design:pointer-events-auto'
        )}
      >
        {/* Drag Handle */}
        {!isRestricted && (
          <div
            {...dragHandleProps}
            onClick={(e) => {
              e.stopPropagation();
              dragHandleProps?.onClick?.(e);
            }}
            className={cn(
              'p-1 rounded-md text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-grab active:cursor-grabbing transition-colors',
              dragHandleClassName
            )}
            title="Drag to reorder"
          >
            <GripVertical size={12} />
          </div>
        )}

        {/* Status micro-icons */}
        {isReadOnly && (
          <span
            className="p-0.5 text-zinc-400"
            title="Read-only field"
          >
            <Lock size={10} />
          </span>
        )}
        {hasVisibilityRule && (
          <span
            className="p-0.5 text-amber-500"
            title="Conditional visibility rule active"
          >
            <Zap size={10} />
          </span>
        )}
        {hasCalculation && (
          <span
            className="p-0.5 text-indigo-500"
            title="Calculation formula active"
          >
            <Calculator size={10} />
          </span>
        )}
        {extraBadges}

        {/* Width Cycle Pill */}
        {widthLabel && onCycleWidth && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleWidth(e);
            }}
            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            title="Click to cycle width"
          >
            {widthLabel}
          </button>
        )}

        {extraActions}

        {/* Quick Hide / Show */}
        {onToggleHidden && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHidden(e);
            }}
            className={cn(
              'p-1 rounded-md transition-colors cursor-pointer',
              isHidden
                ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
            title={isHidden ? 'Show field' : 'Hide field'}
          >
            {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        )}

        {/* Duplicate */}
        {onDuplicate && !isRestricted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(e);
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Duplicate"
          >
            <Copy size={11} />
          </button>
        )}

        {/* Delete */}
        {onDelete && !isRestricted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Subtle persistent pill when hidden at rest so hidden fields stay discoverable */}
      {isHidden && !isSelected && (
        <div className="absolute top-1 right-1 z-20 pointer-events-none px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 group-hover/design:opacity-0 transition-opacity">
          <EyeOff size={9} />
          <span>Hidden</span>
        </div>
      )}

      {/* Actual Workspace Visual Content */}
      <div className={cn(disableChildPointerEvents && 'pointer-events-none select-none')}>
        {children}
      </div>
    </div>
  );
};

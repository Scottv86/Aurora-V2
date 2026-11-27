import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

export interface RecordHeaderSurfaceProps {
  /** Optional animation key when switching records */
  motionKey?: string;
  /** Left-side back button & sibling stepper slot */
  leadingSlot?: React.ReactNode;
  /** Module icon slot */
  iconSlot?: React.ReactNode;
  /** Record key badge (e.g. ICT-1001) */
  recordKey?: string | null;
  /** Primary record title */
  title: React.ReactNode;
  /** Subtitle metadata row */
  subtitleSlot?: React.ReactNode;
  /** Right-side presence stack, quick actions, and status controls */
  actionsSlot?: React.ReactNode;
  /** Sticky / embedded mode modifiers */
  sticky?: boolean;
  isEmbedded?: boolean;
  /** Builder design mode selection props */
  designMode?: boolean;
  isHeaderSelected?: boolean;
  onSelectHeader?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Shared Record Header visual surface used by both the live workspace
 * `RecordDetailView` and the Module Builder Interface Detail View.
 * Changes to spacing, typography, key badge styling, or header chrome
 * automatically stay in sync across workspace and builder.
 */
export const RecordHeaderSurface: React.FC<RecordHeaderSurfaceProps> = ({
  motionKey,
  leadingSlot,
  iconSlot,
  recordKey,
  title,
  subtitleSlot,
  actionsSlot,
  sticky = false,
  isEmbedded = false,
  designMode = false,
  isHeaderSelected = false,
  onSelectHeader,
  className,
}) => {
  const titleBlock = (
    <div className="min-w-0 flex flex-col justify-center">
      {/* Title Row: Monospace Key Badge + Descriptive Title */}
      <div className="flex items-center gap-2 min-w-0">
        {recordKey && (
          <span className="px-2 py-0.5 font-mono text-[11px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 select-all tracking-tight shadow-2xs">
            {recordKey}
          </span>
        )}
        {designMode ? (
          <div
            onClick={onSelectHeader}
            className={cn(
              'text-sm font-bold leading-none truncate cursor-pointer rounded-md px-1.5 py-0.5 -mx-1 transition-all flex items-center gap-1.5',
              isHeaderSelected
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                : 'text-zinc-950 dark:text-white hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
            title="Click to configure Record Title & Subtitle fields"
          >
            {title}
          </div>
        ) : (
          title
        )}
      </div>

      {/* Subtitle Row */}
      {subtitleSlot && (
        <div
          onClick={designMode ? onSelectHeader : undefined}
          className={cn(
            'flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400',
            designMode && 'cursor-pointer hover:text-indigo-500 transition-colors'
          )}
          title={designMode ? 'Click to configure Subtitle Metadata fields' : undefined}
        >
          {subtitleSlot}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'w-full px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 z-30',
        sticky && !isEmbedded && 'sticky top-0',
        isEmbedded && 'h-[54px] py-0 px-5 box-border flex-row items-center',
        designMode && 'select-none z-20',
        className
      )}
    >
      {/* Left: Back + Stepper + Icon + Title + Subtitle Metadata */}
      <div className="flex items-center gap-3 min-w-0">
        {leadingSlot}

        {iconSlot && (
          <div className="w-8 h-8 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
            {iconSlot}
          </div>
        )}

        {motionKey ? (
          <motion.div
            key={motionKey}
            initial={{ opacity: 0, y: 1 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="min-w-0 flex flex-col justify-center"
          >
            {titleBlock}
          </motion.div>
        ) : (
          titleBlock
        )}
      </div>

      {/* Right: Presence Stack + Quick Actions Cluster */}
      {actionsSlot && (
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
          {actionsSlot}
        </div>
      )}
    </div>
  );
};

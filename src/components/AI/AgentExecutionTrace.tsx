import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatAction, formatActionSummary } from '../../utils/aiActionFormatter';

export interface AgentExecutionTraceProps {
  /** Array of completed tool/step executions from message.steps */
  steps?: any[];
  /** Live streaming trace items */
  liveTrace?: Array<{
    name: string;
    arguments?: any;
    result?: any;
    status: 'running' | 'done';
  }>;
  /** Active live thought or status message */
  thought?: string;
  /** Whether the agent is currently working / streaming */
  isLive?: boolean;
  /** Compact sizing for side drawers */
  compact?: boolean;
  className?: string;
}

export const AgentExecutionTrace: React.FC<AgentExecutionTraceProps> = ({
  steps = [],
  liveTrace = [],
  thought,
  isLive = false,
  compact = true,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out internal metadata items
  const validSteps = steps.filter((s) => s && s.name && !s._meta);
  const validLiveTrace = liveTrace.filter((t) => t && t.name);

  // If there's nothing to show and not live, render nothing
  if (!isLive && validSteps.length === 0) {
    return null;
  }

  // --- Live Execution Mode ---
  if (isLive) {
    const runningItem = validLiveTrace.slice().reverse().find((t) => t.status === 'running') || validLiveTrace[validLiveTrace.length - 1];
    const activeFormatted = runningItem ? formatAction(runningItem.name, runningItem.arguments) : null;
    const currentActivity = activeFormatted?.activeTitle || thought || 'Assistant is working...';

    return (
      <div className={cn('select-none', className)}>
        <button
          type="button"
          onClick={() => validLiveTrace.length > 0 && setIsExpanded(!isExpanded)}
          className={cn(
            'inline-flex items-center gap-1.5 py-1 px-1.5 -ml-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-left group',
            validLiveTrace.length > 0 ? 'cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50' : 'cursor-default',
            compact ? 'text-[11px]' : 'text-xs'
          )}
        >
          {validLiveTrace.length > 0 ? (
            <ChevronRight
              className={cn(
                'w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 shrink-0',
                isExpanded && 'rotate-90'
              )}
            />
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}

          <div className="flex items-center gap-1.5 truncate">
            {validLiveTrace.length > 0 && (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {currentActivity}
            </span>
          </div>
        </button>

        {isExpanded && validLiveTrace.length > 0 && (
          <div className="mt-1.5 pl-2.5 ml-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1.5 py-1 animate-fade-in">
            {validLiveTrace.map((item, idx) => {
              const formatted = formatAction(item.name, item.arguments, item.result);
              const isRunning = item.status === 'running';

              return (
                <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                  <div className="flex items-start gap-1.5 min-w-0">
                    {isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200 text-[11px] truncate">
                        {isRunning ? formatted.activeTitle : formatted.title}
                      </span>
                      {formatted.detail && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                          {formatted.detail}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium shrink-0',
                      isRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {isRunning ? 'Running' : 'Done'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- Completed Message Mode ---
  const summaryLabel = formatActionSummary(validSteps);

  return (
    <div className={cn('select-none', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-1.5 py-0.5 px-1.5 -ml-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors text-left group cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50',
          compact ? 'text-[11px]' : 'text-xs'
        )}
      >
        <ChevronRight
          className={cn(
            'w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform duration-200 shrink-0',
            isExpanded && 'rotate-90'
          )}
        />
        <span className="font-medium truncate">{summaryLabel}</span>
      </button>

      {isExpanded && (
        <div className="mt-1.5 pl-2.5 ml-1 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-1.5 py-1 animate-fade-in">
          {validSteps.map((st, idx) => {
            const formatted = formatAction(st.name, st.arguments, st.result);

            return (
              <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-start gap-1.5 min-w-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-zinc-700 dark:text-zinc-200 text-[11px] truncate">
                      {formatted.title}
                    </span>
                    {formatted.detail && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                        {formatted.detail}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                  Completed
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

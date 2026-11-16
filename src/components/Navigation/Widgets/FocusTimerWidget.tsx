import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WidgetCommonProps } from './types';

const STORAGE_KEY = 'aurora_focus_timer_v1';

export const FocusTimerWidget: React.FC<WidgetCommonProps> = ({ onOpenCustomize, isCompact }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remainingSeconds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const setTimerPreset = (minutes: number) => {
    setIsRunning(false);
    setTotalSeconds(minutes * 60);
    setRemainingSeconds(minutes * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left select-none cursor-pointer group",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
          isOpen && "bg-zinc-100 dark:bg-zinc-800"
        )}
        title={`Focus Timer: ${formatTime(remainingSeconds)} (${isRunning ? 'Running' : 'Paused'})`}
      >
        <div className={cn(
          "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
          isRunning 
            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.3)]"
            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
        )}>
          <Timer size={12} className={cn(isRunning && "animate-pulse")} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight font-mono">
            {formatTime(remainingSeconds)}
          </span>
          {!isCompact && (
            <span className={cn(
              "text-[10px] font-normal mt-0.5 tracking-tight",
              isRunning ? "text-rose-500 dark:text-rose-400 font-medium" : "text-zinc-500 dark:text-zinc-400"
            )}>
              {isRunning ? 'Focusing' : 'Focus'}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden z-[65] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Timer size={13} className="text-rose-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Focus Timer</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCustomize();
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Customize widgets"
                >
                  <SlidersHorizontal size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Big Timer Display */}
          <div className="p-4 text-center">
            <div className="text-3xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-white">
              {formatTime(remainingSeconds)}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {isRunning ? 'Deep Work in progress' : 'Ready to start'}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm",
                  isRunning ? "bg-amber-600 hover:bg-amber-500" : "bg-rose-600 hover:bg-rose-500"
                )}
              >
                {isRunning ? <Pause size={12} /> : <Play size={12} />}
                <span>{isRunning ? 'Pause' : 'Start'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Reset timer"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTimerPreset(15)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                15m
              </button>
              <button
                type="button"
                onClick={() => setTimerPreset(25)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                25m
              </button>
              <button
                type="button"
                onClick={() => setTimerPreset(50)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              >
                50m
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

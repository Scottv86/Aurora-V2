import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Check, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ZOOM_PRESETS = [0.5, 0.75, 0.9, 1, 1.1, 1.25] as const;

interface CanvasZoomControlProps {
  zoom: number;
  onChange: (nextZoom: number) => void;
  onFit?: () => void;
  className?: string;
}

export const CanvasZoomControl: React.FC<CanvasZoomControlProps> = ({
  zoom,
  onChange,
  onFit,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleStepDown = () => {
    const lower = [...ZOOM_PRESETS].reverse().find(p => p < zoom - 0.01);
    onChange(lower ?? ZOOM_PRESETS[0]);
  };

  const handleStepUp = () => {
    const higher = ZOOM_PRESETS.find(p => p > zoom + 0.01);
    onChange(higher ?? ZOOM_PRESETS[ZOOM_PRESETS.length - 1]);
  };

  const pct = Math.round(zoom * 100);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={handleStepDown}
          disabled={zoom <= ZOOM_PRESETS[0] + 0.001}
          className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Zoom out (Ctrl −)"
        >
          <Minus size={13} />
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          className={cn(
            'px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-colors min-w-[44px] text-center cursor-pointer',
            isOpen
              ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-zinc-700 dark:text-zinc-200 hover:bg-white/70 dark:hover:bg-zinc-900/70'
          )}
          title="Zoom level (click for presets)"
        >
          {pct}%
        </button>

        <button
          type="button"
          onClick={handleStepUp}
          disabled={zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1] - 0.001}
          className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Zoom in (Ctrl +)"
        >
          <Plus size={13} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50">
          {onFit && (
            <>
              <button
                type="button"
                onClick={() => {
                  onFit();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 size={12} className="text-indigo-500" />
                  <span>Fit to width</span>
                </span>
              </button>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
            </>
          )}

          {ZOOM_PRESETS.map(preset => {
            const isSelected = Math.abs(zoom - preset) < 0.01;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                )}
              >
                <span className="font-mono">{Math.round(preset * 100)}%</span>
                {isSelected && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

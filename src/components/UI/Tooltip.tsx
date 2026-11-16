import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'start' | 'center' | 'end';

interface TooltipItem {
  id: string;
  text: string;
  shortcut?: string;
  anchorRect: DOMRect;
  side: TooltipSide;
  align: TooltipAlign;
}

interface TooltipContextType {
  showTooltip: (opts: {
    text: string;
    shortcut?: string;
    target: HTMLElement;
    side?: TooltipSide;
    align?: TooltipAlign;
    delay?: number;
  }) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

export const useTooltip = () => {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    return {
      showTooltip: () => {},
      hideTooltip: () => {}
    };
  }
  return ctx;
};

// Helper to extract keyboard shortcut like [⌘\] or (Ctrl+K) from tooltip text
export function parseTooltipText(raw: string): { label: string; shortcut?: string } {
  if (!raw) return { label: '' };
  
  // Check for brackets [⌘\] or [Ctrl+K] or [Cmd+K]
  const bracketMatch = raw.match(/^(.*?)\s*\[([^\]]+)\]$/);
  if (bracketMatch) {
    return {
      label: bracketMatch[1].trim(),
      shortcut: bracketMatch[2].trim()
    };
  }

  // Check for parentheses with shortcuts like (⌘K) or (Ctrl+P)
  const parenMatch = raw.match(/^(.*?)\s*\(((?:⌘|Ctrl|Alt|Shift)[^)]+)\)$/i);
  if (parenMatch) {
    return {
      label: parenMatch[1].trim(),
      shortcut: parenMatch[2].trim()
    };
  }

  return { label: raw };
}

const WARM_EXPIRATION_MS = 400; // Delay skips to 0ms if moving between tooltips
const DEFAULT_DELAY_MS = 40;     // Instant snappy delay to avoid cursor-sweep jitter

/**
 * Global Tooltip Provider that:
 * 1. Automatically intercepts hover on any element with `data-tooltip`, `data-tooltip-content`, or native `title` (on buttons/links/icons).
 * 2. Prevents the browser's slow 1-second native OS tooltip from showing.
 * 3. Shows an instant, beautifully animated popover with dark glassmorphism and shortcut keys.
 * 4. Supports programmatic tooltips via `<Tooltip>` component.
 */
export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTooltip, setActiveTooltip] = useState<TooltipItem | null>(null);
  const activeTooltipRef = useRef<TooltipItem | null>(null);
  activeTooltipRef.current = activeTooltip;

  const timerRef = useRef<number | null>(null);
  const lastClosedTimeRef = useRef<number>(0);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearTimer();
    if (activeTooltipRef.current) {
      lastClosedTimeRef.current = Date.now();
      setActiveTooltip(null);
    }
    activeTargetRef.current = null;
  }, [clearTimer]);

  const showTooltip = useCallback(({
    text,
    shortcut,
    target,
    side,
    align = 'center',
    delay
  }: {
    text: string;
    shortcut?: string;
    target: HTMLElement;
    side?: TooltipSide;
    align?: TooltipAlign;
    delay?: number;
  }) => {
    clearTimer();
    if (!text || !target) {
      hideTooltip();
      return;
    }

    const { label, shortcut: parsedShortcut } = parseTooltipText(text);
    const finalShortcut = shortcut || parsedShortcut;

    // Check warm state
    const isWarm = (Date.now() - lastClosedTimeRef.current) < WARM_EXPIRATION_MS;
    const computedDelay = delay !== undefined ? delay : (isWarm ? 0 : DEFAULT_DELAY_MS);

    const trigger = () => {
      if (!target.isConnected) {
        hideTooltip();
        return;
      }
      const rect = target.getBoundingClientRect();
      
      // Auto-detect optimal side if not explicitly specified
      let resolvedSide: TooltipSide = side || 'top';
      if (!side) {
        const spaceTop = rect.top;
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;

        if (spaceRight < 85 && spaceTop > 50) {
          resolvedSide = 'left';
        } else if (spaceLeft < 85 && spaceTop > 50) {
          resolvedSide = 'right';
        } else if (spaceTop < 45) {
          resolvedSide = 'bottom';
        } else {
          resolvedSide = 'top';
        }
      }

      activeTargetRef.current = target;
      setActiveTooltip({
        id: Math.random().toString(36).substring(2, 9),
        text: label,
        shortcut: finalShortcut,
        anchorRect: rect,
        side: resolvedSide,
        align
      });
    };

    if (computedDelay <= 0) {
      trigger();
    } else {
      timerRef.current = window.setTimeout(trigger, computedDelay);
    }
  }, [clearTimer, hideTooltip]);

  // Global event delegation for seamless workspace-wide coverage
  useEffect(() => {
    const handlePointerOver = (e: PointerEvent) => {
      // Find closest element with tooltip intentions
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-tooltip], [data-tooltip-content], [data-aurora-title], [title]'
      ) as HTMLElement | null;

      if (!target) {
        // If moving out of target
        if (activeTargetRef.current && !activeTargetRef.current.contains(e.target as Node)) {
          hideTooltip();
        }
        return;
      }

      // If already active on this target, ignore
      if (activeTargetRef.current === target && activeTooltipRef.current) {
        return;
      }

      // Extract content from data attributes or title
      let tooltipContent = 
        target.getAttribute('data-tooltip') || 
        target.getAttribute('data-tooltip-content') ||
        target.getAttribute('data-aurora-title');
      
      if (!tooltipContent && target.hasAttribute('title')) {
        const rawTitle = target.getAttribute('title');
        if (rawTitle && rawTitle.trim().length > 0) {
          tooltipContent = rawTitle;
          // Suppress native OS tooltip by caching in data attribute and clearing native title
          target.setAttribute('data-aurora-title', rawTitle);
          target.removeAttribute('title');
        }
      }

      if (!tooltipContent || tooltipContent.trim().length === 0) return;

      // Enhance accessibility: preserve aria-label if missing
      if (!target.hasAttribute('aria-label')) {
        target.setAttribute('aria-label', tooltipContent);
      }

      const explicitSide = target.getAttribute('data-tooltip-side') as TooltipSide | null;
      const explicitAlign = target.getAttribute('data-tooltip-align') as TooltipAlign | null;
      const explicitShortcut = target.getAttribute('data-tooltip-shortcut') || undefined;
      const explicitDelay = target.getAttribute('data-tooltip-delay')
        ? parseInt(target.getAttribute('data-tooltip-delay')!, 10)
        : undefined;

      showTooltip({
        text: tooltipContent,
        shortcut: explicitShortcut,
        target,
        side: explicitSide || undefined,
        align: explicitAlign || 'center',
        delay: explicitDelay
      });
    };

    const handlePointerOut = (e: PointerEvent) => {
      const related = e.relatedTarget as Node | null;
      if (activeTargetRef.current && (!related || !activeTargetRef.current.contains(related))) {
        hideTooltip();
      }
    };

    const handlePointerDown = () => {
      hideTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    const handleScroll = (e: Event) => {
      // If scrolling outside the tooltip, dismiss
      hideTooltip();
    };

    window.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true });
    window.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerover', handlePointerOver, { capture: true });
      window.removeEventListener('pointerout', handlePointerOut, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearTimer();
    };
  }, [showTooltip, hideTooltip, clearTimer]);

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeTooltip && (
            <TooltipBubble key={activeTooltip.id} item={activeTooltip} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </TooltipContext.Provider>
  );
};

// Tooltip Floating Bubble with positioning, collision checks, arrow, and sleek micro-animation
const TooltipBubble: React.FC<{ item: TooltipItem }> = ({ item }) => {
  const { text, shortcut, anchorRect, side, align } = item;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrowSide: TooltipSide; arrowOffset?: number }>({
    top: -9999,
    left: -9999,
    arrowSide: side
  });

  useEffect(() => {
    if (!bubbleRef.current) return;
    const bubbleEl = bubbleRef.current;
    const bubbleRect = bubbleEl.getBoundingClientRect();
    const margin = 7; // distance from target

    let top = 0;
    let left = 0;
    let computedSide = side;

    // Center alignments
    if (computedSide === 'top') {
      top = anchorRect.top - bubbleRect.height - margin;
      left = anchorRect.left + (anchorRect.width / 2) - (bubbleRect.width / 2);
      // Flip if overflows top of screen
      if (top < 8) {
        top = anchorRect.bottom + margin;
        computedSide = 'bottom';
      }
    } else if (computedSide === 'bottom') {
      top = anchorRect.bottom + margin;
      left = anchorRect.left + (anchorRect.width / 2) - (bubbleRect.width / 2);
      // Flip if overflows bottom
      if (top + bubbleRect.height > window.innerHeight - 8) {
        top = anchorRect.top - bubbleRect.height - margin;
        computedSide = 'top';
      }
    } else if (computedSide === 'left') {
      left = anchorRect.left - bubbleRect.width - margin;
      top = anchorRect.top + (anchorRect.height / 2) - (bubbleRect.height / 2);
      // Flip if overflows left
      if (left < 8) {
        left = anchorRect.right + margin;
        computedSide = 'right';
      }
    } else if (computedSide === 'right') {
      left = anchorRect.right + margin;
      top = anchorRect.top + (anchorRect.height / 2) - (bubbleRect.height / 2);
      // Flip if overflows right
      if (left + bubbleRect.width > window.innerWidth - 8) {
        left = anchorRect.left - bubbleRect.width - margin;
        computedSide = 'left';
      }
    }

    // Align adjustments if start/end
    if (computedSide === 'top' || computedSide === 'bottom') {
      if (align === 'start') {
        left = anchorRect.left;
      } else if (align === 'end') {
        left = anchorRect.right - bubbleRect.width;
      }
      // Clamping to screen horizontally
      const minLeft = 8;
      const maxLeft = window.innerWidth - bubbleRect.width - 8;
      left = Math.max(minLeft, Math.min(maxLeft, left));
    } else {
      // Vertical clamping
      const minTop = 8;
      const maxTop = window.innerHeight - bubbleRect.height - 8;
      top = Math.max(minTop, Math.min(maxTop, top));
    }

    setPos({
      top,
      left,
      arrowSide: computedSide
    });
  }, [anchorRect, side, align]);

  // Initial and exit micro-translations according to direction
  const getInitialOffset = () => {
    switch (pos.arrowSide) {
      case 'top': return { y: 3, x: 0 };
      case 'bottom': return { y: -3, x: 0 };
      case 'left': return { x: 3, y: 0 };
      case 'right': return { x: -3, y: 0 };
    }
  };

  const offset = getInitialOffset();

  return (
    <motion.div
      ref={bubbleRef}
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        zIndex: 99999
      }}
      initial={{ opacity: 0, scale: 0.93, ...offset }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.08 } }}
      transition={{
        duration: 0.12,
        ease: [0.16, 1, 0.3, 1] // Snappy cubic bezier
      }}
      className={cn(
        "pointer-events-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
        "bg-zinc-900/95 dark:bg-zinc-900/95 text-zinc-100",
        "border border-zinc-700/80 shadow-xl shadow-black/40 backdrop-blur-md",
        "text-[11px] font-medium tracking-tight whitespace-nowrap"
      )}
    >
      <span>{text}</span>

      {shortcut && (
        <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-white/10 dark:bg-zinc-800 text-zinc-300 border border-white/15 dark:border-zinc-700 shadow-2xs">
          {shortcut}
        </kbd>
      )}

      {/* Subtle indicator arrow */}
      <div
        className={cn(
          "absolute w-1.5 h-1.5 rotate-45 bg-zinc-900 border-zinc-700/80 pointer-events-none",
          pos.arrowSide === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b",
          pos.arrowSide === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2 border-l border-t",
          pos.arrowSide === 'left' && "right-[-4px] top-1/2 -translate-y-1/2 border-r border-t",
          pos.arrowSide === 'right' && "left-[-4px] top-1/2 -translate-y-1/2 border-l border-b"
        )}
      />
    </motion.div>
  );
};

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  shortcut?: string;
  delay?: number;
  disabled?: boolean;
}

/**
 * Declarative Tooltip wrapper component:
 * <Tooltip content="Export PDF" side="top" shortcut="⌘P">
 *    <button>...</button>
 * </Tooltip>
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  shortcut,
  delay,
  disabled
}) => {
  if (disabled || !content) return children;

  // Enhance child props with data attributes for global listener
  return React.cloneElement(children as React.ReactElement<any>, {
    'data-tooltip': content,
    'data-tooltip-side': side,
    'data-tooltip-align': align,
    ...(shortcut ? { 'data-tooltip-shortcut': shortcut } : {}),
    ...(delay !== undefined ? { 'data-tooltip-delay': delay } : {})
  });
};

export const ActionTooltip = Tooltip;

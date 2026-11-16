import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { X, AppWindow } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { getWorkspaceAppById } from '../../config/workspaceAppViews';
import { AppViewSwitcher } from './AppViewSwitcher';
import { SideDockedChatPanel } from './SideDockedChatPanel';
import { DockedAppContent } from './DockedAppContent';
import { cn } from '../../lib/utils';

export const SideDockedAppPanel: React.FC = () => {
  const location = useLocation();
  const {
    sideDockedAppId,
    setSideDockedAppId,
    sideDockedAppWidth,
    setSideDockedAppWidth,
    isServiceDeskSideDocked,
    dockedServiceDeskWidth,
    isCalculatorDocked,
    dockedCalculatorWidth,
  } = usePlatform();

  const [isResizing, setIsResizing] = useState(false);

  const app = sideDockedAppId ? getWorkspaceAppById(sideDockedAppId) : undefined;
  const isOnSameAppRoute = app ? location.pathname.startsWith(app.route) : false;

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rightOffset =
        (isServiceDeskSideDocked && !location.pathname.includes('/apps/service-desk')
          ? dockedServiceDeskWidth
          : 0) +
        (isCalculatorDocked ? dockedCalculatorWidth : 0);
      const nextWidth = Math.min(720, Math.max(340, window.innerWidth - e.clientX - rightOffset));
      setSideDockedAppWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [
    isResizing,
    setSideDockedAppWidth,
    isServiceDeskSideDocked,
    dockedServiceDeskWidth,
    isCalculatorDocked,
    dockedCalculatorWidth,
    location.pathname,
  ]);

  if (!sideDockedAppId || !app || isOnSameAppRoute || sideDockedAppId === 'service-desk') {
    return null;
  }

  const IconComp = ((LucideIcons as unknown) as Record<string, React.ElementType>)[app.iconName] || AppWindow;

  const rightOffsetPx =
    (isServiceDeskSideDocked && !location.pathname.includes('/apps/service-desk')
      ? dockedServiceDeskWidth
      : 0) +
    (isCalculatorDocked ? dockedCalculatorWidth : 0);

  return (
    <aside
      style={{
        width: `${sideDockedAppWidth}px`,
        right: `${rightOffsetPx}px`,
      }}
      className={cn(
        'fixed top-[52px] bottom-0 z-30 flex flex-col bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden',
        !isResizing && 'transition-[width,right] duration-150'
      )}
    >
      {/* Left Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Drag to resize side mount panel"
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-40 group transition-colors',
          isResizing ? 'bg-indigo-500/60' : 'hover:bg-indigo-500/30'
        )}
      />

      {sideDockedAppId === 'chat' ? (
        <SideDockedChatPanel />
      ) : (
        <>
          {/* Unified Service Desk-style Panel Header */}
          <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/70 dark:bg-zinc-900/60 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm',
                  app.accentColor
                )}
              >
                <IconComp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{app.label}</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Side Mount</div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <AppViewSwitcher appId={sideDockedAppId} currentMode="side_dock" variant="icons" />
              <button
                type="button"
                onClick={() => setSideDockedAppId(null)}
                title="Close Side Panel"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <DockedAppContent appId={sideDockedAppId} compactLevel="side" />
          </div>
        </>
      )}
    </aside>
  );
};

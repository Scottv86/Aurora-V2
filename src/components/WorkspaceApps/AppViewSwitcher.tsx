import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  PanelRight,
  LayoutGrid,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { WorkspaceAppDisplayMode, getWorkspaceAppById } from '../../config/workspaceAppViews';
import { cn } from '../../lib/utils';

interface AppViewSwitcherProps {
  appId: string;
  currentMode: WorkspaceAppDisplayMode;
  variant?: 'toolbar' | 'footer' | 'icons';
  onBeforeSwitch?: () => void;
  className?: string;
}

export const AppViewSwitcher: React.FC<AppViewSwitcherProps> = ({
  appId,
  currentMode,
  variant = 'toolbar',
  onBeforeSwitch,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { launchWorkspaceApp } = usePlatform();
  const app = getWorkspaceAppById(appId);

  if (!app) return null;

  const switchTo = (mode: WorkspaceAppDisplayMode, openNewTab = false) => {
    onBeforeSwitch?.();
    if (mode === 'fullscreen' && !openNewTab) {
      // Same-tab fullscreen via ?standalone=true
      const url = `${app.route}${app.route.includes('?') ? '&' : '?'}standalone=true`;
      navigate(url);
      return;
    }
    launchWorkspaceApp(appId, mode, navigate, location.pathname, { openNewTab });
  };

  if (variant === 'footer') {
    return (
      <div className={cn('flex items-center justify-between gap-1', className)}>
        <button
          type="button"
          onClick={() => switchTo('bottom_dock')}
          title="Bottom Mount"
          className={cn(
            'flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors',
            currentMode === 'bottom_dock'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400'
          )}
        >
          <MessageSquare size={12} /> Dock
        </button>
        <button
          type="button"
          onClick={() => switchTo('side_dock')}
          title="Side Mount"
          className={cn(
            'flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors',
            currentMode === 'side_dock'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400'
          )}
        >
          <PanelRight size={12} /> Side
        </button>
        {currentMode === 'fullscreen' ? (
          <button
            type="button"
            onClick={() => switchTo('in_app')}
            title="Switch to In App view"
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <LayoutGrid size={12} /> App
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchTo('fullscreen', false)}
            title="Full Screen"
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <Maximize2 size={12} /> Full
          </button>
        )}
        <button
          type="button"
          onClick={() => switchTo('fullscreen', true)}
          title="Open Full Screen in New Tab"
          className="p-1.5 rounded-lg text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <ExternalLink size={12} />
        </button>
      </div>
    );
  }

  if (variant === 'icons') {
    return (
      <div className={cn('flex items-center gap-0.5', className)}>
        {currentMode !== 'bottom_dock' && (
          <button
            type="button"
            onClick={() => switchTo('bottom_dock')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Bottom Mount"
          >
            <MessageSquare size={13} />
          </button>
        )}
        {currentMode !== 'side_dock' && (
          <button
            type="button"
            onClick={() => switchTo('side_dock')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Side Mount"
          >
            <PanelRight size={13} />
          </button>
        )}
        {currentMode !== 'in_app' && (
          <button
            type="button"
            onClick={() => switchTo('in_app')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Open In App"
          >
            <LayoutGrid size={13} />
          </button>
        )}
        {currentMode !== 'fullscreen' && (
          <button
            type="button"
            onClick={() => switchTo('fullscreen', true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Full Screen New Tab"
          >
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    );
  }

  // Default: 'toolbar' (compact segmented pill for top bar / standalone bar)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/70',
        className
      )}
    >
      <button
        type="button"
        onClick={() => switchTo('bottom_dock')}
        title="Switch to Bottom Mount"
        className={cn(
          'px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer',
          currentMode === 'bottom_dock'
            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <MessageSquare size={12} />
        <span className="hidden sm:inline">Bottom</span>
      </button>
      <button
        type="button"
        onClick={() => switchTo('side_dock')}
        title="Switch to Side Mount"
        className={cn(
          'px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer',
          currentMode === 'side_dock'
            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <PanelRight size={12} />
        <span className="hidden sm:inline">Side</span>
      </button>
      <button
        type="button"
        onClick={() => switchTo('in_app')}
        title="View In App"
        className={cn(
          'px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer',
          currentMode === 'in_app'
            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <LayoutGrid size={12} />
        <span className="hidden sm:inline">In App</span>
      </button>
      <button
        type="button"
        onClick={() => switchTo('fullscreen', false)}
        title="Switch to Full Screen"
        className={cn(
          'px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer',
          currentMode === 'fullscreen'
            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <Maximize2 size={12} />
        <span className="hidden sm:inline">Full</span>
      </button>
      <button
        type="button"
        onClick={() => switchTo('fullscreen', true)}
        title="Open Full Screen in New Tab"
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <ExternalLink size={11} />
      </button>
    </div>
  );
};

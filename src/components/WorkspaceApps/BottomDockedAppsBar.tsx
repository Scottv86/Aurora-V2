import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Minus, X, ChevronUp, AppWindow } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { getWorkspaceAppById } from '../../config/workspaceAppViews';
import { AppViewSwitcher } from './AppViewSwitcher';
import { DockedAppContent } from './DockedAppContent';
import { FacebookDockedChat } from './FacebookDockedChat';
import { FacebookDockedServiceDesk } from '../ServiceDesk/FacebookDockedServiceDesk';
import { cn } from '../../lib/utils';

interface BottomDockedAppPodProps {
  appId: string;
}

const BottomDockedAppPod: React.FC<BottomDockedAppPodProps> = ({ appId }) => {
  const { removeBottomDockedApp } = usePlatform();
  const [minimized, setMinimized] = useState(false);

  const app = getWorkspaceAppById(appId);
  if (!app) return null;

  const IconComp = ((LucideIcons as unknown) as Record<string, React.ElementType>)[app.iconName] || AppWindow;

  if (minimized) {
    return (
      <div className="pointer-events-auto h-10 rounded-t-xl bg-zinc-900 dark:bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 flex items-center gap-2.5 shadow-xl border border-b-0 border-zinc-700 cursor-pointer transition-colors">
        <div
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', app.accentColor)}>
            <IconComp className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold truncate">{app.label}</span>
          <ChevronUp size={13} className="text-zinc-400 shrink-0" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeBottomDockedApp(appId);
          }}
          className="p-1 rounded hover:bg-white/15 text-zinc-400 hover:text-white cursor-pointer"
          title="Close Bottom Mount"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-[390px] h-[480px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] rounded-t-xl bg-white dark:bg-zinc-950 border border-b-0 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
      {/* Header (Modeled on Service Desk Bottom Dock) */}
      <div className="px-3 py-2 bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div
          onClick={() => setMinimized(true)}
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
        >
          <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', app.accentColor)}>
            <IconComp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{app.label}</div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Bottom Mount</div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <AppViewSwitcher appId={appId} currentMode="bottom_dock" variant="icons" />
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={() => removeBottomDockedApp(appId)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Bottom Mount"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* App Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DockedAppContent appId={appId} compactLevel="bottom" />
      </div>
    </div>
  );
};

export const BottomDockedAppsBar: React.FC = () => {
  const location = useLocation();
  const { isServiceDeskFacebookDocked, bottomDockedAppIds } = usePlatform();

  const isServiceDeskPage = location.pathname.includes('/apps/service-desk');
  const isChatPage = location.pathname.includes('/apps/chat');

  const showServiceDesk = isServiceDeskFacebookDocked && !isServiceDeskPage;
  const showChat = bottomDockedAppIds.includes('chat') && !isChatPage;

  const otherBottomAppIds = bottomDockedAppIds.filter((id) => {
    if (id === 'service-desk' || id === 'chat') return false;
    const cfg = getWorkspaceAppById(id);
    if (!cfg) return false;
    return !location.pathname.startsWith(cfg.route);
  });

  if (!showServiceDesk && !showChat && otherBottomAppIds.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-4 z-40 flex items-end gap-3 pointer-events-none select-none font-sans">
      {otherBottomAppIds.map((appId) => (
        <BottomDockedAppPod key={appId} appId={appId} />
      ))}

      {showChat && <FacebookDockedChat />}

      {showServiceDesk && <FacebookDockedServiceDesk embedded />}
    </div>
  );
};

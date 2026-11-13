import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Headset,
  MessageSquare,
  PanelRight,
  Maximize2,
  ExternalLink,
  X,
  Sparkles,
  Check,
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { ServiceDeskDisplayMode } from '../../types/serviceDesk';
import { cn } from '../../lib/utils';

export const ServiceDeskLaunchModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isServiceDeskLaunchModalOpen,
    setIsServiceDeskLaunchModalOpen,
    setIsServiceDeskFacebookDocked,
    setIsServiceDeskSideDocked
  } = usePlatform();

  const [selectedMode, setSelectedMode] = useState<ServiceDeskDisplayMode>(() => {
    const saved = localStorage.getItem('aurora_service_desk_preferred_mode') as ServiceDeskDisplayMode | null;
    return saved || 'facebook_dock';
  });
  const [rememberChoice, setRememberChoice] = useState<boolean>(() => {
    return localStorage.getItem('aurora_service_desk_remember_mode') === 'true';
  });

  useEffect(() => {
    if (!isServiceDeskLaunchModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsServiceDeskLaunchModalOpen(false);
      } else if (e.key === '1' || e.key.toLowerCase() === 'b') {
        setSelectedMode('facebook_dock');
      } else if (e.key === '2' || e.key.toLowerCase() === 'd') {
        setSelectedMode('side_dock');
      } else if (e.key === '3' || e.key.toLowerCase() === 'f') {
        setSelectedMode('full');
      } else if (e.key === '4' || e.key.toLowerCase() === 't') {
        setSelectedMode('new_tab');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleLaunch(selectedMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isServiceDeskLaunchModalOpen, selectedMode]);

  const handleLaunch = (mode: ServiceDeskDisplayMode) => {
    if (rememberChoice) {
      localStorage.setItem('aurora_service_desk_remember_mode', 'true');
      localStorage.setItem('aurora_service_desk_preferred_mode', mode);
    } else {
      localStorage.removeItem('aurora_service_desk_remember_mode');
    }

    setIsServiceDeskLaunchModalOpen(false);

    if (mode === 'facebook_dock') {
      setIsServiceDeskSideDocked(false);
      setIsServiceDeskFacebookDocked(true);
      if (location.pathname.startsWith('/workspace/apps/service-desk')) {
        navigate('/workspace');
      }
    } else if (mode === 'side_dock') {
      setIsServiceDeskFacebookDocked(false);
      setIsServiceDeskSideDocked(true);
      if (location.pathname.startsWith('/workspace/apps/service-desk')) {
        navigate('/workspace');
      }
    } else if (mode === 'full') {
      setIsServiceDeskSideDocked(false);
      setIsServiceDeskFacebookDocked(false);
      navigate('/workspace/apps/service-desk');
    } else if (mode === 'new_tab') {
      window.open('/workspace/apps/service-desk?standalone=true', '_blank', 'noopener,noreferrer');
    }
  };

  const modes: {
    id: ServiceDeskDisplayMode;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
    hotkey: string;
    icon: any;
    preview: React.ReactNode;
  }[] = [
    {
      id: 'facebook_dock',
      title: 'Bottom Chat Heads',
      badge: 'Bottom Dock',
      badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      description:
        'Docks collapsible customer chat heads and a compact softphone bar along the bottom edge while you work across the workspace.',
      hotkey: 'B or 1',
      icon: MessageSquare,
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner relative overflow-hidden">
          <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-end justify-end gap-1 mt-auto">
            <div className="w-12 h-10 rounded-t-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-xs p-1 flex flex-col justify-between">
              <div className="w-full h-1.5 rounded-xs bg-zinc-800 dark:bg-zinc-200" />
              <div className="space-y-0.5">
                <div className="w-3/4 h-1 rounded-xs bg-zinc-200 dark:bg-zinc-700" />
                <div className="w-1/2 h-1 rounded-xs bg-zinc-300 dark:bg-zinc-600 ml-auto" />
              </div>
            </div>
            <div className="w-10 h-4 rounded-t-md bg-zinc-900 dark:bg-white flex items-center justify-center px-1">
              <div className="w-6 h-1 rounded-full bg-white/80 dark:bg-zinc-900/80" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'side_dock',
      title: 'Dock to Side Pane',
      badge: 'Side Panel',
      badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      description:
        'Pins a vertical Service Desk panel to the right edge of your screen so you can reply to chats alongside open records.',
      hotkey: 'D or 2',
      icon: PanelRight,
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex gap-1 border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner">
          <div className="flex-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 flex flex-col justify-between">
            <div className="w-10 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="space-y-1">
              <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="w-2/3 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="w-14 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-1 flex flex-col justify-between">
            <div className="w-full h-1.5 rounded-xs bg-zinc-800 dark:bg-zinc-200" />
            <div className="space-y-0.5">
              <div className="w-3/4 h-1 rounded-xs bg-zinc-200 dark:bg-zinc-700" />
              <div className="w-2/3 h-1 rounded-xs bg-zinc-300 dark:bg-zinc-600 ml-auto" />
            </div>
            <div className="w-full h-1.5 rounded-xs bg-zinc-900 dark:bg-white" />
          </div>
        </div>
      )
    },
    {
      id: 'full',
      title: 'Full Workspace App',
      badge: 'Workspace Suite',
      badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      description:
        'Opens the full Service Desk workspace with queues, AI & human assignment, internal notes, and record context.',
      hotkey: 'F or 3',
      icon: Maximize2,
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex flex-col gap-1 border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner">
          <div className="h-2.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-1.5">
            <div className="w-8 h-1 rounded-full bg-zinc-800 dark:bg-zinc-200" />
            <div className="w-4 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <div className="flex-1 flex gap-1">
            <div className="w-6 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800" />
            <div className="flex-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 flex flex-col justify-between">
              <div className="w-2/3 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="w-1/2 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 ml-auto" />
            </div>
            <div className="w-8 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800" />
          </div>
        </div>
      )
    },
    {
      id: 'new_tab',
      title: 'Full Screen New Tab',
      badge: 'Second Monitor',
      badgeColor: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      description:
        'Launches Service Desk in a dedicated browser tab synced live with your main workspace.',
      hotkey: 'T or 4',
      icon: ExternalLink,
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner relative overflow-hidden">
          <div className="w-20 h-11 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/40 border border-zinc-300 dark:border-zinc-700 absolute left-2 top-3" />
          <div className="relative z-10 w-24 h-12 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-md p-1 flex flex-col justify-between translate-x-2 -translate-y-0.5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-0.5">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
              </div>
              <div className="w-8 h-1 rounded-xs bg-zinc-300 dark:bg-zinc-600" />
            </div>
            <div className="flex gap-1 flex-1 pt-0.5">
              <div className="w-5 h-full rounded-xs bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex-1 h-full rounded-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700" />
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isServiceDeskLaunchModalOpen) return null;

  const modeLabelMap: Record<ServiceDeskDisplayMode, string> = {
    facebook_dock: 'Bottom Chat Heads',
    side_dock: 'Docked Side Panel',
    full: 'Full Workspace Console',
    new_tab: 'Full Screen in New Tab'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsServiceDeskLaunchModalOpen(false)}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md transition-all"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Headset size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
                  Launch Service Desk
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose how you want to view and manage live Site Chats, AI Agent handoffs, and Voice Calls
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsServiceDeskLaunchModalOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: 4 Mode Selection Cards */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {modes.map(mode => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;

                return (
                  <div
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    onDoubleClick={() => handleLaunch(mode.id)}
                    className={cn(
                      'flex flex-col justify-between p-4 rounded-xl border transition-all duration-150 cursor-pointer text-left relative group select-none',
                      isSelected
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-600 dark:border-indigo-500 shadow-xs'
                        : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-750'
                        )}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                          {mode.hotkey}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">{mode.preview}</div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight mb-1">
                        {mode.title}
                      </h4>
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mb-2',
                          mode.badgeColor
                        )}
                      >
                        {mode.badge}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Tip Bar */}
            <div className="px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="text-[11px]">
                  <strong>Tip:</strong> Press{' '}
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">
                    1
                  </kbd>
                  –
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">
                    4
                  </kbd>{' '}
                  to select a display mode, then{' '}
                  <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">
                    Enter
                  </kbd>{' '}
                  to launch. You can switch modes anytime from the sidebar footer.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={e => setRememberChoice(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500/20"
                />
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                  Always use this display mode
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setIsServiceDeskLaunchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => handleLaunch(selectedMode)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Launch {modeLabelMap[selectedMode]}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

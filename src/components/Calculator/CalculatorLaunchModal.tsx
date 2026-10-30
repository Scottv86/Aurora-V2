import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator as CalcIcon, 
  PanelRight, 
  Maximize2, 
  Layers, 
  X, 
  Sparkles, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';

export type CalculatorDisplayMode = 'docked' | 'full' | 'quick';

export const CalculatorLaunchModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isCalculatorLaunchModalOpen, 
    setIsCalculatorLaunchModalOpen,
    setIsCalculatorDocked,
    setIsQuickCalculatorOpen
  } = usePlatform();

  const [selectedMode, setSelectedMode] = useState<CalculatorDisplayMode>('docked');
  const [rememberChoice, setRememberChoice] = useState<boolean>(() => {
    return localStorage.getItem('aurora_calculator_remember_mode') === 'true';
  });

  // Keyboard shortcut listener for fast navigation
  useEffect(() => {
    if (!isCalculatorLaunchModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCalculatorLaunchModalOpen(false);
      } else if (e.key === '1' || e.key.toLowerCase() === 'd') {
        setSelectedMode('docked');
      } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
        setSelectedMode('full');
      } else if (e.key === '3' || e.key.toLowerCase() === 'q') {
        setSelectedMode('quick');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleLaunch(selectedMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalculatorLaunchModalOpen, selectedMode]);

  const handleLaunch = (mode: CalculatorDisplayMode) => {
    if (rememberChoice) {
      localStorage.setItem('aurora_calculator_remember_mode', 'true');
      localStorage.setItem('aurora_calculator_preferred_mode', mode);
    } else {
      localStorage.removeItem('aurora_calculator_remember_mode');
    }

    setIsCalculatorLaunchModalOpen(false);

    if (mode === 'docked') {
      setIsQuickCalculatorOpen(false);
      setIsCalculatorDocked(true);
    } else if (mode === 'full') {
      setIsCalculatorDocked(false);
      setIsQuickCalculatorOpen(false);
      navigate('/workspace/apps/calculator');
    } else if (mode === 'quick') {
      setIsCalculatorDocked(false);
      setIsQuickCalculatorOpen(true);
    }
  };

  const modes: {
    id: CalculatorDisplayMode;
    title: string;
    badge: string;
    badgeColor: string;
    description: string;
    hotkey: string;
    icon: any;
    accentColor: string;
    preview: React.ReactNode;
  }[] = [
    {
      id: 'docked',
      title: 'Dock to Side Pane',
      badge: 'Multitasking Mode',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      description: 'Docks the calculator to the right side of the screen and resizes your page view. Keep working in records or queues while crunching numbers side-by-side.',
      hotkey: 'D or 1',
      icon: PanelRight,
      accentColor: 'indigo',
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex gap-1 border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner">
          {/* Main workspace view */}
          <div className="flex-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1.5 flex flex-col justify-between">
            <div className="w-12 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="space-y-1">
              <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="w-3/4 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="w-8 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
          {/* Docked pane */}
          <div className="w-14 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-1 flex flex-col justify-between items-center animate-pulse">
            <div className="w-8 h-1.5 rounded-sm bg-indigo-500/40" />
            <div className="grid grid-cols-2 gap-0.5 w-full">
              <div className="h-1 rounded-xs bg-indigo-500/30" />
              <div className="h-1 rounded-xs bg-indigo-500/30" />
              <div className="h-1 rounded-xs bg-indigo-500/30" />
              <div className="h-1 rounded-xs bg-indigo-500/30" />
            </div>
            <div className="w-6 h-1 rounded-sm bg-indigo-600" />
          </div>
        </div>
      ),
    },
    {
      id: 'full',
      title: 'Full Workspace App',
      badge: 'Formula Suite',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      description: 'Opens the full-bleed calculator suite with multi-sheet sheets, financial presets (margin, loans, GST), module record aggregation, and export to Notes.',
      hotkey: 'F or 2',
      icon: Maximize2,
      accentColor: 'emerald',
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex flex-col gap-1 border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner">
          {/* Top suite header */}
          <div className="h-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-1.5">
            <div className="w-10 h-1.5 rounded-full bg-emerald-500/60" />
            <div className="w-4 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
          {/* App body split */}
          <div className="flex-1 flex gap-1">
            <div className="flex-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 flex flex-col justify-between">
              <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 ml-auto" />
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-1 rounded-xs bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            </div>
            <div className="w-10 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-1 space-y-0.5">
              <div className="w-full h-0.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" />
              <div className="w-3/4 h-0.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" />
              <div className="w-1/2 h-0.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quick',
      title: 'Floating Quick Calc',
      badge: 'Lightweight Modal',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      description: 'Spawns a compact, draggable floating popup for rapid math and quick copying without disturbing your layout or leaving the screen.',
      hotkey: 'Q or 3',
      icon: Layers,
      accentColor: 'amber',
      preview: (
        <div className="w-full h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1.5 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/60 shadow-inner relative overflow-hidden">
          {/* Dimmed background */}
          <div className="absolute inset-0 bg-zinc-950/20 dark:bg-zinc-950/40 backdrop-blur-xs" />
          {/* Centered floating modal */}
          <div className="relative z-10 w-24 h-12 rounded-lg bg-white dark:bg-zinc-900 border border-amber-500/40 shadow-md p-1 flex flex-col justify-between animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="flex items-center justify-between">
              <div className="w-6 h-1 rounded-sm bg-amber-500/60" />
              <div className="w-1.5 h-1.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="w-full h-1.5 rounded-xs bg-zinc-100 dark:bg-zinc-800 flex items-center justify-end px-0.5">
              <div className="w-4 h-1 rounded-xs bg-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-1 rounded-xs bg-zinc-200 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  if (!isCalculatorLaunchModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        
        {/* Backdrop with rich blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCalculatorLaunchModalOpen(false)}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md transition-all"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl shadow-indigo-500/10 flex flex-col overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 border border-indigo-400/30">
                <CalcIcon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Launch Aurora Calculator
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} /> Workspace Suite
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Select your preferred presentation mode for calculations in Aurora
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCalculatorLaunchModalOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: Mode Selection Cards */}
          <div className="p-6 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;

                return (
                  <div
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    onDoubleClick={() => handleLaunch(mode.id)}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left relative group select-none",
                      isSelected
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/10"
                        : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                    )}
                  >
                    {/* Selected Checkmark Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-750"
                      )}>
                        <Icon size={18} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                          {mode.hotkey}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Miniature Layout Preview Diagram */}
                    <div className="mb-3">
                      {mode.preview}
                    </div>

                    {/* Mode Info */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                          {mode.title}
                        </h4>
                      </div>
                      <span className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mb-2",
                        mode.badgeColor
                      )}>
                        {mode.badge}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Tip Bar */}
            <div className="px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[11px]">
                  <strong>Tip:</strong> Press <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">1</kbd>, <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">2</kbd>, or <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">3</kbd> to select, then <kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">Enter</kbd> to launch.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={(e) => setRememberChoice(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/20"
                />
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">Remember choice</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => setIsCalculatorLaunchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLaunch(selectedMode)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Launch {selectedMode === 'docked' ? 'Docked Pane' : selectedMode === 'full' ? 'Workspace App' : 'Quick Calculator'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

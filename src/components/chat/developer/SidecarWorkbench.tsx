import React, { useState } from 'react';
import { X, Smartphone, Tablet, Monitor, Layout, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SidecarWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
  children?: React.ReactNode;
}

export const SidecarWorkbench: React.FC<SidecarWorkbenchProps> = ({
  isOpen,
  onClose,
  moduleName = 'Fleet Inspection Module',
  children
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  if (!isOpen) return null;

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      case 'desktop':
      default: return 'max-w-full';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
      >
        {/* Workbench Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-600/20 p-2 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-400">
                Developer Sidecar Sandbox
              </span>
              <h3 className="text-sm font-bold text-slate-100">{moduleName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Breakpoint Simulator */}
            <div className="flex items-center rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`rounded p-1.5 transition ${deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Mobile (375px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`rounded p-1.5 transition ${deviceMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Tablet (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`rounded p-1.5 transition ${deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Desktop Full"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Workbench Content Preview Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 flex justify-center">
          <div className={`w-full transition-all duration-300 ${getDeviceWidth()}`}>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layout className="h-3.5 w-3.5 text-indigo-400" />
                  Live Component Preview ({deviceMode})
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                  Hot Reload Active
                </span>
              </div>

              {children || (
                <div className="space-y-4 text-xs">
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <label className="font-semibold text-slate-300 block mb-1">Vehicle ID / Rego</label>
                    <input type="text" placeholder="e.g. NSW-8892-AU" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200" readOnly />
                  </div>
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <label className="font-semibold text-slate-300 block mb-1">Odometer Reading (km)</label>
                    <input type="number" placeholder="124,500" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200" readOnly />
                  </div>
                  <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                    <label className="font-semibold text-slate-300 block mb-1">Inspector Signature</label>
                    <div className="h-20 w-full rounded border border-dashed border-slate-700 bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-[11px]">
                      [Signature Canvas Widget]
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

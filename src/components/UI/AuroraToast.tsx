import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import type { ToastStylePreset } from '../../types/platform';

export interface StandardErrorPayload {
  code?: string;
  title: string;
  message: string;
  technical_details?: string;
}

interface AuroraToastProps {
  id: string | number;
  type: 'error' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  technicalDetails?: string;
}

const getActiveToastPreset = (): ToastStylePreset => {
  if (typeof document === 'undefined') return 'aurora-glass';
  const val = document.documentElement.dataset.toastStyle as ToastStylePreset | undefined;
  if (val === 'minimal-pill' || val === 'soft-tint' || val === 'editorial-sharp' || val === 'aurora-glass') {
    return val;
  }
  return 'aurora-glass';
};

export const AuroraToast: React.FC<AuroraToastProps> = ({
  id,
  type,
  title,
  message,
  technicalDetails
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const preset = getActiveToastPreset();

  const handleCopyDetails = () => {
    if (technicalDetails) {
      navigator.clipboard.writeText(technicalDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          accentBg: 'bg-gradient-to-b from-rose-500 to-red-600',
          glowRadial: 'radial-gradient(circle at 24px 24px, rgba(244,63,94,0.18) 0%, transparent 56%)',
          softSurface: 'bg-rose-50/95 dark:bg-[#2d0c16]/95 border-rose-300/70 dark:border-rose-500/35',
          borderColor: 'border-zinc-200/85 dark:border-white/12',
          iconContainer: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25',
          iconColor: 'text-rose-600 dark:text-rose-400',
          icon: <ShieldAlert className="w-4 h-4" />
        };
      case 'success':
        return {
          accentBg: 'bg-gradient-to-b from-emerald-400 to-teal-600',
          glowRadial: 'radial-gradient(circle at 24px 24px, rgba(16,185,129,0.18) 0%, transparent 56%)',
          softSurface: 'bg-emerald-50/95 dark:bg-[#06261d]/95 border-emerald-300/70 dark:border-emerald-500/35',
          borderColor: 'border-zinc-200/85 dark:border-white/12',
          iconContainer: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'warning':
        return {
          accentBg: 'bg-gradient-to-b from-amber-400 to-amber-600',
          glowRadial: 'radial-gradient(circle at 24px 24px, rgba(245,158,11,0.18) 0%, transparent 56%)',
          softSurface: 'bg-amber-50/95 dark:bg-[#2c1d07]/95 border-amber-300/70 dark:border-amber-500/35',
          borderColor: 'border-zinc-200/85 dark:border-white/12',
          iconContainer: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
          iconColor: 'text-amber-600 dark:text-amber-400',
          icon: <AlertCircle className="w-4 h-4" />
        };
      default:
        return {
          accentBg: 'bg-gradient-to-b from-sky-400 to-indigo-600',
          glowRadial: 'radial-gradient(circle at 24px 24px, rgba(14,165,233,0.18) 0%, transparent 56%)',
          softSurface: 'bg-sky-50/95 dark:bg-[#082031]/95 border-sky-300/70 dark:border-sky-500/35',
          borderColor: 'border-zinc-200/85 dark:border-white/12',
          iconContainer: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25',
          iconColor: 'text-sky-600 dark:text-sky-400',
          icon: <Info className="w-4 h-4" />
        };
    }
  };

  const styleConfig = getTypeStyles();
  const isSharp = preset === 'editorial-sharp';
  const isMinimal = preset === 'minimal-pill';
  const isSoftTint = preset === 'soft-tint';
  const isAuroraGlass = preset === 'aurora-glass';

  const containerClasses = isSharp
    ? `rounded-none bg-white/95 dark:bg-zinc-950/95 border ${styleConfig.borderColor} shadow-xl dark:shadow-2xl`
    : isMinimal
    ? `rounded-2xl bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/90 dark:border-white/12 shadow-lg dark:shadow-2xl`
    : isSoftTint
    ? `rounded-2xl border ${styleConfig.softSurface} shadow-lg dark:shadow-2xl`
    : `rounded-2xl backdrop-blur-2xl bg-white/90 dark:bg-[#0f1118]/90 border ${styleConfig.borderColor} shadow-xl dark:shadow-2xl`;

  const iconClasses = isSharp
    ? `w-7 h-7 rounded-none border ${styleConfig.iconContainer}`
    : isMinimal
    ? `w-6 h-6 ${styleConfig.iconColor}`
    : isSoftTint
    ? `w-8 h-8 rounded-full border ${styleConfig.iconContainer}`
    : `w-8 h-8 rounded-xl border ${styleConfig.iconContainer}`;

  const closeClasses = isSharp
    ? 'rounded-none opacity-75 hover:opacity-100 border border-zinc-200 dark:border-zinc-800'
    : 'rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100';

  return (
    <div
      style={isAuroraGlass ? { backgroundImage: styleConfig.glowRadial } : undefined}
      className={`group relative w-full max-w-md p-4 backdrop-blur-2xl text-zinc-900 dark:text-zinc-100 font-sans transition-all duration-200 overflow-hidden ${containerClasses}`}
    >
      {/* Left accent bar only for Editorial Sharp preset */}
      {isSharp && (
        <div className={`absolute top-0 bottom-0 left-0 w-[3px] ${styleConfig.accentBg}`} />
      )}

      {/* Close button on top-right */}
      <button
        onClick={() => sonnerToast.dismiss(id)}
        className={`absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all z-10 cursor-pointer ${closeClasses}`}
        title="Close notification"
      >
        <X size={14} />
      </button>

      <div className={`flex items-start gap-3 pr-6 ${isSharp ? 'pl-1.5' : ''}`}>
        <div className={`flex items-center justify-center shrink-0 mt-0.5 ${iconClasses}`}>
          {styleConfig.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">{title}</h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed font-normal">{message}</p>

          {technicalDetails && (
            <div className="mt-3 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <span>{expanded ? 'Hide Details' : 'View Technical Details'}</span>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className={`relative p-3 ${isSharp ? 'rounded-none' : 'rounded-xl'} bg-zinc-100/90 dark:bg-black/60 border border-zinc-200 dark:border-zinc-800/90 font-mono text-[10.5px] text-zinc-700 dark:text-zinc-300 max-h-44 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed`}>
                      <button
                        onClick={handleCopyDetails}
                        className={`absolute top-2 right-2 p-1.5 ${isSharp ? 'rounded-none' : 'rounded-lg'} bg-white/90 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors border border-zinc-300/70 dark:border-zinc-700/50 cursor-pointer`}
                        title="Copy details"
                      >
                        {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <code>{technicalDetails}</code>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const showAuroraToast = {
  error: (payload: StandardErrorPayload | string) => {
    const errorObj = typeof payload === 'string'
      ? { title: 'AI Error', message: payload }
      : payload;

    sonnerToast.custom((id) => (
      <AuroraToast
        id={id}
        type="error"
        title={errorObj.title || 'AI Quota Reached'}
        message={errorObj.message || 'An error occurred while calling the AI Gateway.'}
        technicalDetails={errorObj.technical_details}
      />
    ), { duration: 6000 });
  },

  success: (title: string, message: string) => {
    sonnerToast.custom((id) => (
      <AuroraToast
        id={id}
        type="success"
        title={title}
        message={message}
      />
    ), { duration: 4000 });
  },

  info: (title: string, message: string) => {
    sonnerToast.custom((id) => (
      <AuroraToast
        id={id}
        type="info"
        title={title}
        message={message}
      />
    ), { duration: 4000 });
  },

  warning: (title: string, message: string) => {
    sonnerToast.custom((id) => (
      <AuroraToast
        id={id}
        type="warning"
        title={title}
        message={message}
      />
    ), { duration: 5000 });
  }
};


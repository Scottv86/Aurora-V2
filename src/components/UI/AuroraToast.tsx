import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

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

export const AuroraToast: React.FC<AuroraToastProps> = ({
  id,
  type,
  title,
  message,
  technicalDetails
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
          glowShadow: 'shadow-[0_20px_40px_-12px_rgba(244,63,94,0.25)]',
          borderColor: 'border-rose-500/30',
          iconContainer: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
          icon: <ShieldAlert className="w-4 h-4" />
        };
      case 'success':
        return {
          accentBg: 'bg-gradient-to-b from-emerald-400 to-teal-600',
          glowShadow: 'shadow-[0_20px_40px_-12px_rgba(16,185,129,0.25)]',
          borderColor: 'border-emerald-500/30',
          iconContainer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'warning':
        return {
          accentBg: 'bg-gradient-to-b from-amber-400 to-amber-600',
          glowShadow: 'shadow-[0_20px_40px_-12px_rgba(245,158,11,0.25)]',
          borderColor: 'border-amber-500/30',
          iconContainer: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
          icon: <AlertCircle className="w-4 h-4" />
        };
      default:
        return {
          accentBg: 'bg-gradient-to-b from-sky-400 to-indigo-600',
          glowShadow: 'shadow-[0_20px_40px_-12px_rgba(14,165,233,0.25)]',
          borderColor: 'border-sky-500/30',
          iconContainer: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.25)]',
          icon: <Info className="w-4 h-4" />
        };
    }
  };

  const styleConfig = getTypeStyles();

  return (
    <div className={`relative w-full max-w-md p-4 rounded-none backdrop-blur-2xl bg-zinc-950/90 border ${styleConfig.borderColor} ${styleConfig.glowShadow} text-zinc-100 font-sans transition-all duration-300 hover:border-zinc-700/60 overflow-hidden shadow-2xl`}>
      {/* Top accent glow line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${styleConfig.accentBg} opacity-90`} />
      
      {/* Left indicator bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${styleConfig.accentBg}`} />

      {/* Close button on top-right */}
      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-100 p-1 rounded-none hover:bg-zinc-800/60 transition-colors z-10"
        title="Close notification"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3.5 pl-1.5 pr-6">
        <div className={`w-8 h-8 rounded-none border flex items-center justify-center shrink-0 mt-0.5 ${styleConfig.iconContainer}`}>
          {styleConfig.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-100 tracking-tight leading-tight">{title}</h4>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed font-normal">{message}</p>

          {technicalDetails && (
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
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
                    <div className="relative p-3 rounded-none bg-black/70 border border-zinc-800/90 font-mono text-[10.5px] text-zinc-300 max-h-44 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                      <button
                        onClick={handleCopyDetails}
                        className="absolute top-2 right-2 p-1.5 rounded-none bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/50"
                        title="Copy details"
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
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


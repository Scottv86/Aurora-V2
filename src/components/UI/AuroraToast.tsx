import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, Copy, Check, X } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export interface StandardErrorPayload {
  code?: string;
  title: string;
  message: string;
  technical_details?: string;
}

interface AuroraToastProps {
  id: string | number;
  type: 'error' | 'success' | 'info';
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

  const getBorderColor = () => {
    if (type === 'error') return 'border-red-500/40 dark:border-red-500/30';
    if (type === 'success') return 'border-emerald-500/40 dark:border-emerald-500/30';
    return 'border-blue-500/40 dark:border-blue-500/30';
  };

  const getIcon = () => {
    if (type === 'error') return <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />;
    if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
    return <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;
  };

  return (
    <div className={`w-full max-w-md p-4 rounded-2xl backdrop-blur-xl bg-zinc-950/90 border ${getBorderColor()} shadow-2xl text-zinc-100 font-sans transition-all duration-200`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h4>
            <button
              onClick={() => sonnerToast.dismiss(id)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{message}</p>

          {technicalDetails && (
            <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <span>{expanded ? 'Hide Details' : 'View Details'}</span>
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
                    <div className="relative p-2.5 rounded-xl bg-black/60 border border-zinc-800 font-mono text-[10px] text-zinc-300 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                      <button
                        onClick={handleCopyDetails}
                        className="absolute top-2 right-2 p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Copy details"
                      >
                        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
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
  }
};

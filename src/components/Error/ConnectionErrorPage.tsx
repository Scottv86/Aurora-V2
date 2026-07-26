import React, { useState } from 'react';
import { WifiOff, ServerOff, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';

interface ConnectionErrorPageProps {
  onRetry?: () => Promise<void> | void;
  isOffline?: boolean;
  errorMessage?: string;
}

export const ConnectionErrorPage: React.FC<ConnectionErrorPageProps> = ({
  onRetry,
  isOffline = false,
  errorMessage,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Short delay for visual feedback if retry finishes quickly
      setTimeout(() => setIsRetrying(false), 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 text-zinc-100 p-6 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background Subtle Gradient Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-md w-full bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
        
        {/* Icon Header */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-amber-400 shadow-inner">
            {isOffline ? (
              <WifiOff className="w-10 h-10 text-amber-400 animate-pulse" />
            ) : (
              <ServerOff className="w-10 h-10 text-rose-400 animate-pulse" />
            )}
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          {isOffline ? 'You Are Offline' : 'Connection Interrupted'}
        </h1>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed font-medium mb-6">
          {isOffline
            ? 'Your internet connection appears to be offline. Please check your network cables or Wi-Fi configuration and try again.'
            : 'Unable to establish a connection with the Aurora backend server. The server may be restarting or undergoing maintenance.'}
        </p>

        {/* Technical details badge if available */}
        {errorMessage && (
          <div className="w-full mb-6 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center space-x-2 text-left">
            <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-xs font-mono text-zinc-400 truncate">
              {errorMessage}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="w-full space-y-3">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Reconnecting...' : 'Retry Connection'}</span>
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 border border-zinc-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </button>
        </div>

        {/* Footer status pill */}
        <div className="mt-8 flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-rose-500'}`} />
          <span>Status: {isOffline ? 'Browser Offline' : 'Backend Unreachable'}</span>
        </div>
      </div>
    </div>
  );
};

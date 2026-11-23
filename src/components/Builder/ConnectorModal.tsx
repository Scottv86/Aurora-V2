import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Zap, Plus, Globe, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: any[];
  registry: any[];
  onSelect: (connector: any) => void;
  onActivate: (connectorId: string) => Promise<any>;
}

export const ConnectorModal: React.FC<ConnectorModalProps> = ({
  isOpen,
  onClose,
  activeConnectors,
  registry,
  onSelect,
  onActivate
}) => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'registry'>('active');
  const [isActivating, setIsActivating] = useState<string | null>(null);

  const q = search.toLowerCase();
  const filteredActive = activeConnectors.filter(c =>
    (c.displayName || c.name || '').toLowerCase().includes(q)
  );

  const filteredRegistry = registry.filter(c =>
    (c.name || '').toLowerCase().includes(q) &&
    !activeConnectors.find(ac => ac.connectorId === c.id)
  );

  const handleActivate = async (connectorId: string) => {
    setIsActivating(connectorId);
    try {
      const activated = await onActivate(connectorId);
      if (activated) {
        onSelect(activated);
        onClose();
      }
    } finally {
      setIsActivating(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            className="relative w-full max-w-3xl max-h-[82vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-lg flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connect Integration</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Select an active integration or activate one from the registry.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-950/40">
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200/70 dark:border-zinc-700/70">
                <button
                  onClick={() => setTab('active')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    tab === 'active'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  Active ({activeConnectors.length})
                </button>
                <button
                  onClick={() => setTab('registry')}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    tab === 'registry'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  Registry ({filteredRegistry.length})
                </button>
              </div>

              <div className="flex-1 relative max-w-xs min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search connectors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {tab === 'active' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredActive.map(conn => (
                    <button
                      key={conn.id}
                      onClick={() => {
                        onSelect(conn);
                        onClose();
                      }}
                      className="flex items-start gap-3 p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors text-left group cursor-pointer"
                    >
                      <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/50 shrink-0">
                        <Zap size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {conn.displayName || conn.name}
                          </h4>
                          <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded text-[10px] font-medium shrink-0">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {conn.category || 'Integration'}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredActive.length === 0 && (
                    <div className="col-span-2 py-10 text-center">
                      <p className="text-xs text-zinc-500">No active connectors found matching your search.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredRegistry.map(conn => (
                    <div
                      key={conn.id}
                      className="flex flex-col justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500">
                            <Globe size={16} />
                          </div>
                          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px] font-medium">
                            {conn.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{conn.name}</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                          {conn.description || `${conn.category} integration`}
                        </p>
                      </div>

                      <button
                        onClick={() => handleActivate(conn.id)}
                        disabled={isActivating === conn.id}
                        className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isActivating === conn.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>Activate &amp; Select</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  {filteredRegistry.length === 0 && (
                    <div className="col-span-2 py-10 text-center">
                      <p className="text-xs text-zinc-500">No more connectors available in the registry.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/40">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Shield size={13} className="text-emerald-500" />
                <span>Tenant-isolated encrypted secrets proxy</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

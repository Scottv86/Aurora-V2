import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Zap, Check, Plus, Globe, Shield, Rocket } from 'lucide-react';
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

  const filteredActive = activeConnectors.filter(c => 
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRegistry = registry.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) &&
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[80vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Zap size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Connect Integration</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select or activate a Nexus capability</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-6">
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                <button 
                  onClick={() => setTab('active')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    tab === 'active' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Active ({activeConnectors.length})
                </button>
                <button 
                  onClick={() => setTab('registry')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    tab === 'registry' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  Nexus Registry
                </button>
              </div>

              <div className="flex-1 relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search connectors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {tab === 'active' ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredActive.map(conn => (
                    <button
                      key={conn.id}
                      onClick={() => {
                        onSelect(conn);
                        onClose();
                      }}
                      className="flex items-start gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                        <Zap size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase truncate">{conn.displayName}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Integration Active</p>
                        <div className="mt-4 flex items-center gap-2">
                           <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Handshake Verified</span>
                           </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredActive.length === 0 && (
                    <div className="col-span-2 py-12 text-center">
                      <p className="text-xs text-zinc-500">No active connectors found matching your search.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredRegistry.map(conn => (
                    <div
                      key={conn.id}
                      className="flex flex-col p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors border border-zinc-100 dark:border-zinc-800">
                          <Globe size={28} />
                        </div>
                        <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{conn.category}</span>
                        </div>
                      </div>
                      
                      <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight uppercase mb-1">{conn.name}</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 mb-6">
                        Enterprise-grade {conn.category.toLowerCase()} integration via Aurora Nexus.
                      </p>

                      <button
                        onClick={() => handleActivate(conn.id)}
                        disabled={isActivating === conn.id}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isActivating === conn.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Activate & Select</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  {filteredRegistry.length === 0 && (
                    <div className="col-span-2 py-12 text-center">
                      <p className="text-xs text-zinc-500">No more connectors available in the registry.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <Shield size={14} className="text-emerald-500" />
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">End-to-End Encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Rocket size={14} className="text-indigo-500" />
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Zero-Latency Proxy</span>
                  </div>
               </div>
               <p className="text-[9px] text-zinc-400 italic">Nexus v2.4.1 Active</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

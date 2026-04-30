import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Zap, Globe, Shield, Rocket, BrainCircuit, Wand2, Hammer, ArrowLeft, ArrowRight, Library } from 'lucide-react';
import { DynamicIcon } from '../UI/DynamicIcon';
import { cn } from '../../lib/utils';
import { AIForgeView } from './AIForgeView';
import { ManualBuilderView } from './ManualBuilderView';

interface NexusSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: any[];
  registry: any[];
  onSelect: (connector: any, strategy: 'auto' | 'manual') => void;
  onActivate: (connectorId: string) => Promise<any>;
  onCreateCustom: (connector: any) => Promise<any>;
  onForge: (prompt: string) => Promise<any>;
}

type ViewMode = 'selection' | 'library' | 'ai' | 'manual' | 'strategy';

export const NexusSelectionModal: React.FC<NexusSelectionModalProps> = ({
  isOpen,
  onClose,
  activeConnectors,
  registry,
  onSelect,
  onActivate,
  onCreateCustom,
  onForge
}) => {
  const [view, setView] = useState<ViewMode>('selection');
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConnector, setPendingConnector] = useState<any>(null);

  const filteredRegistry = registry.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleForge = async (prompt: string) => {
    setIsProcessing(true);
    try {
      const forged = await onForge(prompt);
      if (forged) {
        const created = await onCreateCustom(forged);
        if (created) {
          setPendingConnector(created.activation);
          setView('strategy');
        }
      }
    } catch (err) {
      console.error("Forge failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSave = async (connector: any) => {
    setIsProcessing(true);
    try {
      const created = await onCreateCustom(connector);
      if (created) {
        setPendingConnector(created.activation);
        setView('strategy');
      }
    } catch (err) {
      console.error("Manual save failed:", err);
    } finally {
      setIsProcessing(false);
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
            className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent z-20">
              <div className="flex items-center gap-4">
                {view !== 'selection' ? (
                  <button 
                    onClick={() => setView('selection')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600 transition-all"
                  >
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Zap size={24} className="text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    {view === 'selection' ? 'Connect Integration' : 
                     view === 'library' ? 'Connector Library' : 
                     view === 'ai' ? 'AI Forge' : 
                     view === 'strategy' ? 'Provisioning Strategy' : 'Manual Builder'}
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    {view === 'selection' ? 'Select your path to integration' : 
                     view === 'strategy' ? 'How should we handle the API data?' : 'Define your custom API capability'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {view === 'selection' ? (
                  <motion.div 
                    key="selection"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="h-full grid grid-cols-3 p-12 gap-6 content-center"
                  >
                    {/* Path A: Library */}
                    <button 
                      onClick={() => setView('library')}
                      className="group relative flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shadow-sm mb-4 transition-all group-hover:scale-110">
                        <Library size={32} />
                      </div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Library</h3>
                      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">Browse and activate templates.</p>
                      <div className="mt-6 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-600 transition-all">
                         Browse Marketplace
                      </div>
                    </button>

                    {/* Path B: AI Forge */}
                    <button 
                      onClick={() => setView('ai')}
                      className="group relative flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shadow-sm mb-4 transition-all group-hover:scale-110">
                        <BrainCircuit size={32} />
                      </div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">AI Forge</h3>
                      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">Architect-powered build.</p>
                      <div className="mt-6 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-600 transition-all flex items-center gap-2">
                         Ignite Forge <Wand2 size={12} />
                      </div>
                    </button>

                    {/* Path C: Manual Builder */}
                    <button 
                      onClick={() => setView('manual')}
                      className="group relative flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shadow-sm mb-4 transition-all group-hover:scale-110">
                        <Hammer size={32} />
                      </div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Manual Build</h3>
                      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">Configure custom endpoints.</p>
                      <div className="mt-6 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-600 transition-all">
                         Launch Builder
                      </div>
                    </button>
                  </motion.div>
                ) : view === 'library' ? (
                  <motion.div 
                    key="library"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col"
                  >
                    <div className="px-12 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                       <div className="relative flex-1 max-w-sm">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            type="text"
                            placeholder="Search library..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-4 items-start custom-scrollbar">
                       {filteredRegistry.map(conn => (
                         <button
                           key={conn.id}
                           onClick={async () => {
                             setIsProcessing(true);
                             try {
                               const activated = await onActivate(conn.id);
                               if (activated) {
                                 setPendingConnector(activated);
                                 setView('strategy');
                               }
                             } finally {
                               setIsProcessing(false);
                             }
                           }}
                           className="flex items-start gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-indigo-500/50 hover:shadow-xl transition-all text-left group"
                         >
                           <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-all border border-zinc-100 dark:border-zinc-800 group-hover:scale-110">
                             <DynamicIcon name={conn.icon} size={24} />
                           </div>
                           <div className="flex-1">
                             <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{conn.name}</h4>
                             <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{conn.category}</p>
                             <div className="mt-4 flex items-center justify-between">
                                <span className="text-[9px] text-zinc-400">Handshake Ready</span>
                                <div className="text-indigo-500 group-hover:translate-x-1 transition-transform">
                                   <ArrowRight size={14} />
                                </div>
                             </div>
                           </div>
                         </button>
                       ))}
                    </div>
                  </motion.div>
                ) : view === 'ai' ? (
                  <motion.div 
                    key="ai"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <AIForgeView onGenerate={handleForge} isGenerating={isProcessing} />
                  </motion.div>
                ) : view === 'manual' ? (
                  <motion.div 
                    key="manual"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <ManualBuilderView onSave={handleManualSave} isSaving={isProcessing} />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="strategy"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-full flex items-center justify-center p-12 gap-8"
                  >
                    <button 
                      onClick={() => {
                        onSelect(pendingConnector, 'auto');
                        onClose();
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-8 bg-indigo-600 rounded-[2.5rem] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20"
                    >
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                        <Wand2 size={32} />
                      </div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Auto-Provision</h3>
                      <p className="text-xs text-indigo-100 text-center leading-relaxed">
                        The Architect will automatically create and map all module fields for this connector.
                      </p>
                      <div className="mt-8 px-6 py-2 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                        Recommended for Speed
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        onSelect(pendingConnector, 'manual');
                        onClose();
                      }}
                      className="group flex-1 max-w-sm flex flex-col items-center p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] hover:border-indigo-500/50 transition-all"
                    >
                      <div className="w-16 h-16 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                        <ArrowRight size={32} />
                      </div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Manual Map</h3>
                      <p className="text-xs text-zinc-500 text-center leading-relaxed">
                        Define your own field mappings. Select existing fields or create new ones one-by-one.
                      </p>
                      <div className="mt-8 px-6 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-600 transition-all">
                        Full Control
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Processing Overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Zap size={24} className="text-indigo-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                       <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Activating Connector</h3>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 animate-pulse">Establishing Nexus Handshake...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
               <p className="text-[9px] text-zinc-400 italic">Nexus v2.5.0 Active</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

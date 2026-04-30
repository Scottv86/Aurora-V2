import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, ArrowRight, Save, Wand2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConnectorMappingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connector: any;
  layout: any[];
  mappings: Record<string, string>;
  onMappingChange: (mappings: Record<string, string>) => void;
  onSave: () => void;
}

export const ConnectorMappingDrawer: React.FC<ConnectorMappingDrawerProps> = ({
  isOpen,
  onClose,
  connector,
  layout,
  mappings,
  onMappingChange,
  onSave
}) => {
  if (!connector) return null;

  const outputs = (connector.ioSchema?.outputs) || (connector.connector?.ioSchema?.outputs) || [];
  const fields = layout.filter(f => f.type !== 'connector'); // Exclude connectors from being targets

  const handleAutoMap = () => {
    const newMappings = { ...mappings };
    let count = 0;
    outputs.forEach((output: any) => {
      if (newMappings[output.name]) return;
      const match = fields.find(f => 
        f.id === output.name || 
        f.label.toLowerCase() === (output.label || output.name).toLowerCase()
      );
      if (match) {
        newMappings[output.name] = match.id;
        count++;
      }
    });
    onMappingChange(newMappings);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-zinc-950/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-[210] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Data Mapping</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{connector.name}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info size={14} className="text-indigo-500" />
                  <p className="text-xs text-zinc-500 font-medium">Link API outputs to module fields.</p>
                </div>
                <button 
                  onClick={handleAutoMap}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                >
                  <Wand2 size={12} />
                  Auto-Map
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-8 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  <div>API Output</div>
                  <div>Module Field</div>
                </div>

                <div className="space-y-2">
                  {outputs.map((output: any) => (
                    <div 
                      key={output.name}
                      className="grid grid-cols-2 gap-8 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-indigo-500">
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">{output.label || output.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{output.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <ArrowRight size={14} className={cn(
                          "transition-colors",
                          Object.values(mappings).filter(v => v === mappings[output.name] && v !== '').length > 1 ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"
                        )} />
                        <div className="flex-1 relative">
                          <select 
                            value={mappings[output.name] || ''}
                            onChange={(e) => onMappingChange({ ...mappings, [output.name]: e.target.value })}
                            className={cn(
                              "w-full bg-white dark:bg-zinc-900 border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                              Object.values(mappings).filter(v => v === mappings[output.name] && v !== '').length > 1 
                                ? "border-amber-500/50 text-amber-600 dark:text-amber-400" 
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                            )}
                          >
                            <option value="">Unmapped</option>
                            {fields.map(f => {
                              const isUsedElsewhere = Object.entries(mappings).some(([key, val]) => key !== output.name && val === f.id);
                              return (
                                <option key={f.id} value={f.id}>
                                  {f.label} {isUsedElsewhere ? '(Already Mapped)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          {Object.values(mappings).filter(v => v === mappings[output.name] && v !== '').length > 1 && (
                            <div className="absolute -right-1 -top-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                               <span className="text-[10px] font-bold">!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
              <button
                onClick={onSave}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Save Mapping Configuration
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

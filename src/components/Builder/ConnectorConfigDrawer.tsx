import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Loader2, Save } from 'lucide-react';

interface ConnectorConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  connector: any;
  onSave: (secrets: any) => Promise<void>;
}

export const ConnectorConfigDrawer: React.FC<ConnectorConfigDrawerProps> = ({
  isOpen,
  onClose,
  connector,
  onSave
}) => {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!connector) return null;

  // Identify fields that look like secrets/keys
  const configFields = connector.ioSchema?.inputs?.filter((i: any) => 
    i.name.toLowerCase().includes('key') || 
    i.name.toLowerCase().includes('token') || 
    i.name.toLowerCase().includes('secret')
  ) || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(secrets);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
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
            className="fixed inset-0 z-[110] bg-zinc-950/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[120] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Quick Configure</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{connector.name}</p>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-4">
                <ShieldCheck size={20} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-relaxed font-medium">
                  Input your API credentials to activate this integration. Secrets are vaulted and never exposed to the client.
                </p>
              </div>

              <div className="space-y-6">
                {configFields.length > 0 ? configFields.map((field: any) => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{field.label || field.name}</label>
                    <input 
                      type="password"
                      placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                      value={secrets[field.name] || ''}
                      onChange={(e) => setSecrets(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 transition-all text-zinc-900 dark:text-white"
                    />
                  </div>
                )) : (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-xs text-zinc-500 italic">No secret configuration required for this connector.</p>
                    <p className="text-[10px] text-zinc-400 font-medium">You can proceed directly to snapping it into your layout.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save & Snap to Canvas
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

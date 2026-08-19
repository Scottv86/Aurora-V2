import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileCode, CheckCircle2, Bot } from 'lucide-react';
import { AgentBlueprint } from '../../types/agent';
import { toast } from 'sonner';

export interface ImportAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (blueprint: AgentBlueprint) => void;
}

export const ImportAgentModal: React.FC<ImportAgentModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedAgent, setParsedAgent] = useState<AgentBlueprint | null>(null);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.name || !parsed.systemInstructions) {
          toast.error('Invalid agent blueprint format. Missing name or instructions.');
          return;
        }
        setParsedAgent({
          ...parsed,
          id: `agent_imp_${Date.now()}`
        });
        toast.success(`Loaded blueprint for "${parsed.name}"`);
      } catch (err: any) {
        toast.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedAgent) return;
    onImport(parsedAgent);
    toast.success(`Agent "${parsedAgent.name}" imported into studio!`);
    onClose();
  };

  const modalNode = (
    <AnimatePresence mode="wait">
      <div key="import-agent-modal" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileCode size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Import Agent Blueprint</h3>
                <p className="text-[11px] text-zinc-500">Restore or import portable agent JSON bundle</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <X size={18} />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-800/40"
          >
            <UploadCloud size={24} className="mx-auto text-indigo-500 mb-2" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
              {fileName || 'Click to select Agent JSON file'}
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 block">Supports export bundles from Aurora Agent Studio</span>
          </div>

          {parsedAgent && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{parsedAgent.name}</span>
                <span className="text-[10px] font-mono text-zinc-400">({parsedAgent.modelConfig?.model})</span>
              </div>
              <p className="text-[11px] text-zinc-500">{parsedAgent.roleTitle}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!parsedAgent}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>Import to Studio</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};

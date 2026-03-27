import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  moduleName?: string;
  moduleId?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  itemName,
  moduleName,
  moduleId,
  isDeleting = false 
}: DeleteConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
                {description}
              </p>
              {itemName && (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] space-y-6">
                  <div className="space-y-2 text-left">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Logic Asset to Delete</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white font-mono leading-tight break-words">{itemName}</p>
                  </div>
                  
                  <div className="pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Module Context</p>
                      {moduleName ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-tight">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-bold uppercase tracking-tight">Orphaned</span>
                      )}
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                      {moduleName ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{moduleName}</p>
                          <p className="text-[10px] text-zinc-500 font-mono italic opacity-50">{moduleId}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-rose-500/60 font-mono line-through decoration-rose-500/30">{moduleId || 'Unknown ID'}</p>
                          <p className="text-[10px] text-rose-500/40 italic">This module no longer exists in your workspace</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-3">
              <button 
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={isDeleting}
                className={cn(
                  "flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm",
                  isDeleting && "animate-pulse"
                )}
              >
                {isDeleting ? (
                  <>
                    <Trash2 size={16} className="animate-bounce" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

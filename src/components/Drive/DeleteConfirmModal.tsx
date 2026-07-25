import { AlertTriangle, Trash2, X, Lock, FileText, Folder, File } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DriveItem } from '../../types/drive';
import { DriveService } from '../../services/driveService';
import { cn } from '../../lib/utils';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: DriveItem | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal = ({
  isOpen,
  item,
  onClose,
  onConfirm,
  isDeleting = false
}: DeleteConfirmModalProps) => {
  if (!isOpen || !item) return null;

  const latestItem = DriveService.getItemById(item.id) || item;
  const isFolder = latestItem.type === 'FOLDER';
  const isDoc = latestItem.type === 'DOCUMENT';
  const isLegalHold = Boolean(latestItem.recordsMetadata?.isLegalHold);


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          {/* Header Icon & Close */}
          <div className="flex items-start justify-between relative z-10">
            <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20 shadow-sm">
              {isLegalHold ? <Lock size={24} /> : <AlertTriangle size={24} />}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Title & Description */}
          <div className="space-y-2 relative z-10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {isLegalHold ? "Item Protected by Legal Hold" : `Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {isLegalHold
                ? `"${latestItem.name}" is currently under active legal hold compliance (${latestItem.recordsMetadata?.legalHoldReason || 'Regulatory compliance hold'}). Legal holds freeze items against deletion.`
                : `This item will be moved to the global Recycling Bin, where it can be restored within 30 days.`}
            </p>
          </div>

          {/* Item Preview Card */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 truncate">
              <div className={cn(
                "p-2.5 rounded-xl shrink-0",
                isFolder ? "bg-amber-500/10 text-amber-500" : isDoc ? "bg-indigo-500/10 text-indigo-500" : "bg-teal-500/10 text-teal-500"
              )}>
                {isFolder ? <Folder size={20} /> : isDoc ? <FileText size={20} /> : <File size={20} />}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{latestItem.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{latestItem.recordsMetadata?.recordNumber} • {latestItem.recordsMetadata?.classification}</p>
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 relative z-10">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            
            {!isLegalHold && (
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                Confirm Delete
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

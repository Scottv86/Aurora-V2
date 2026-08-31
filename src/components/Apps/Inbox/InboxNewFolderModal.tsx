import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FolderPlus, 
  Check, 
  Folder, 
  FileText, 
  Shield, 
  Briefcase, 
  Bookmark, 
  Tag, 
  Star, 
  Archive, 
  Loader2 
} from 'lucide-react';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxNewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
}

const COLOR_OPTIONS = [
  { id: 'blue', class: 'bg-blue-500', name: 'Blue' },
  { id: 'emerald', class: 'bg-emerald-500', name: 'Emerald' },
  { id: 'purple', class: 'bg-purple-500', name: 'Purple' },
  { id: 'amber', class: 'bg-amber-500', name: 'Amber' },
  { id: 'rose', class: 'bg-rose-500', name: 'Rose' },
  { id: 'indigo', class: 'bg-indigo-500', name: 'Indigo' },
  { id: 'cyan', class: 'bg-cyan-500', name: 'Cyan' },
  { id: 'fuchsia', class: 'bg-fuchsia-500', name: 'Fuchsia' },
];

const ICON_OPTIONS = [
  { id: 'Folder', icon: Folder, label: 'Folder' },
  { id: 'FileText', icon: FileText, label: 'Document' },
  { id: 'Briefcase', icon: Briefcase, label: 'Work' },
  { id: 'Shield', icon: Shield, label: 'Security' },
  { id: 'Bookmark', icon: Bookmark, label: 'Bookmark' },
  { id: 'Tag', icon: Tag, label: 'Tag' },
  { id: 'Star', icon: Star, label: 'Priority' },
  { id: 'Archive', icon: Archive, label: 'Archive' },
];

export const InboxNewFolderModal: React.FC<InboxNewFolderModalProps> = ({
  isOpen,
  onClose,
  onFolderCreated
}) => {
  const { tenant } = usePlatform();
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].class);
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      setIsSaving(true);
      await InboxService.createCustomFolder(folderName.trim(), selectedColor, selectedIcon, tenant?.id);
      toast.success(`Folder "${folderName.trim()}" created successfully!`);
      setFolderName('');
      onFolderCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden z-10"
          >
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Create Custom Folder</h3>
                  <p className="text-xs text-zinc-500">Organize and sort conversations into custom mailboxes</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              
              {/* Folder Name */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Clients, Invoices, Contracts"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Folder Tag Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.class)}
                      className={cn(
                        "w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-all",
                        c.class,
                        selectedColor === c.class ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110" : "opacity-80 hover:opacity-100"
                      )}
                      title={c.name}
                    >
                      {selectedColor === c.class && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Folder Icon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICON_OPTIONS.map(opt => {
                    const IconCmp = opt.icon;
                    const isSelected = selectedIcon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedIcon(opt.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition-all cursor-pointer",
                          isSelected 
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm" 
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <IconCmp size={16} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || !folderName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Create Folder</span>
                </button>
              </div>

            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

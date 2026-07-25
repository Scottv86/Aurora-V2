import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Check, 
  X, 
  ChevronRight, 
  HardDrive, 
  Building2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DriveItem, DriveType } from '../../types/drive';
import { DriveService } from '../../services/driveService';
import { cn } from '../../lib/utils';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (driveType: DriveType, folderId: string | null, folderName: string) => void;
  title?: string;
  confirmLabel?: string;
  initialDriveType?: DriveType;
  initialFolderId?: string | null;
}

export const DrivePickerModal = ({
  isOpen,
  onClose,
  onSelectFolder,
  title = "Select Destination Drive & Folder",
  confirmLabel = "Save Here",
  initialDriveType = 'TENANT_SHARED',
  initialFolderId = null
}: DrivePickerModalProps) => {
  const [selectedDriveType, setSelectedDriveType] = useState<DriveType>(initialDriveType);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDriveType(initialDriveType);
      setCurrentFolderId(initialFolderId || null);
    }
  }, [isOpen, initialDriveType, initialFolderId]);

  if (!isOpen) return null;


  const currentFolderItems = DriveService.getChildren(currentFolderId, selectedDriveType);
  const folders = currentFolderItems.filter(item => item.type === 'FOLDER');

  // Breadcrumbs path computation
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: selectedDriveType === 'PERSONAL' ? 'My Drive' : 'Shared Tenant Drives' }
    ];
    
    let curr = currentFolderId;
    const pathStack: { id: string; name: string }[] = [];
    while (curr) {
      const item = DriveService.getItemById(curr);
      if (item) {
        pathStack.unshift({ id: item.id, name: item.name });
        curr = item.parentId;
      } else {
        break;
      }
    }
    return [...crumbs, ...pathStack];
  };

  const breadcrumbs = getBreadcrumbs();
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1].name;

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder = DriveService.createFolder(newFolderName.trim(), selectedDriveType, currentFolderId);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setCurrentFolderId(folder.id);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <Folder size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Choose where to store your document or record</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drive Type Selection Tabs */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/30 dark:bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedDriveType('TENANT_SHARED');
                  setCurrentFolderId(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  selectedDriveType === 'TENANT_SHARED'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                )}
              >
                <Building2 size={14} />
                Shared Tenant Drives
              </button>
              <button
                onClick={() => {
                  setSelectedDriveType('PERSONAL');
                  setCurrentFolderId(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  selectedDriveType === 'PERSONAL'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                )}
              >
                <HardDrive size={14} />
                My Drive (Personal)
              </button>
            </div>

            <button
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <FolderPlus size={14} />
              New Folder
            </button>
          </div>

          {/* New Folder Creation Bar */}
          {isCreatingFolder && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-2">
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="px-2 py-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Interactive Breadcrumbs */}
          <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto text-xs text-zinc-500">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.id || `crumb-${idx}`} className="flex items-center gap-1.5 shrink-0">
                {idx > 0 && <ChevronRight size={12} className="text-zinc-400" />}
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors",
                    idx === breadcrumbs.length - 1 && "font-bold text-zinc-900 dark:text-white"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Folder Content List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[220px]">
            {folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                <Folder size={36} className="stroke-[1.2] mb-2 opacity-50" />
                <p className="text-xs font-medium">No subfolders here.</p>
                <p className="text-[11px] text-zinc-500">You can save directly in this root directory or create a new folder.</p>
              </div>
            ) : (
              folders.map((folder: DriveItem) => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.04] cursor-pointer transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Folder size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {folder.name}
                      </h4>
                      <span className="text-[10px] text-zinc-400">
                        {folder.recordsMetadata.recordNumber} • {folder.recordsMetadata.classification}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <FileText size={14} className="text-indigo-500" />
              <span>Target: <strong className="text-zinc-900 dark:text-white">{currentFolderName}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSelectFolder(selectedDriveType, currentFolderId, currentFolderName);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all"
              >
                <Check size={14} />
                {confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

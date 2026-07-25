import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, 
  FileText, 
  File as FileIcon, 
  Search, 
  Grid, 
  List as ListIcon, 
  Star, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  HardDrive, 
  Building2, 
  Lock, 
  ChevronRight, 
  Info, 
  Upload, 
  FolderPlus, 
  FilePlus, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DriveItem, DriveType, DocumentClassification } from '../../types/drive';
import { DriveService, DEFAULT_DISPOSAL_SCHEDULES, sendToGlobalRecyclingBin } from '../../services/driveService';
import { DeleteConfirmModal } from '../../components/Drive/DeleteConfirmModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';



type NavTab = 'PERSONAL' | 'TENANT_SHARED' | 'STARRED' | 'RECENT' | 'GOVERNANCE' | 'TRASH';

export const DriveApp = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { user, session } = useAuth();
  const [activeNav, setActiveNav] = useState<NavTab>('TENANT_SHARED');

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<'details' | 'records' | 'versions' | 'audit'>('details');

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState(false);
  const [legalHoldReason, setLegalHoldReason] = useState('');
  const [itemToDelete, setItemToDelete] = useState<DriveItem | null>(null);

  // Refresh trigger state

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(prev => prev + 1);

  // Compute items based on active sidebar tab
  const items = useMemo(() => {
    switch (activeNav) {
      case 'PERSONAL':
        return DriveService.getChildren(currentFolderId, 'PERSONAL');
      case 'TENANT_SHARED':
        return DriveService.getChildren(currentFolderId, 'TENANT_SHARED');
      case 'STARRED':
        return DriveService.getFavorites();
      case 'RECENT':
        return DriveService.getRecent();
      case 'GOVERNANCE':
        return DriveService.getRecordsUnderGovernance();
      case 'TRASH':
        return DriveService.getTrash();
      default:
        return [];
    }
  }, [activeNav, currentFolderId, refreshKey]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.recordsMetadata.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.recordsMetadata.subjectTags && item.recordsMetadata.subjectTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [items, searchQuery]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return DriveService.getItemById(selectedItemId);
  }, [selectedItemId, refreshKey]);

  // Breadcrumbs computation
  const breadcrumbs = useMemo(() => {
    if (activeNav !== 'PERSONAL' && activeNav !== 'TENANT_SHARED') {
      return [{ id: null, name: activeNav.replace('_', ' ') }];
    }
    const rootName = activeNav === 'PERSONAL' ? 'My Drive' : 'Tenant Shared Drives';
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: rootName }];

    let curr = currentFolderId;
    const stack: { id: string; name: string }[] = [];
    while (curr) {
      const item = DriveService.getItemById(curr);
      if (item) {
        stack.unshift({ id: item.id, name: item.name });
        curr = item.parentId;
      } else {
        break;
      }
    }
    return [...crumbs, ...stack];
  }, [activeNav, currentFolderId, refreshKey]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const driveType: DriveType = activeNav === 'PERSONAL' ? 'PERSONAL' : 'TENANT_SHARED';
    DriveService.createFolder(newFolderName.trim(), driveType, currentFolderId);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
    toast.success('Folder created successfully');
    refresh();
  };

  const handleUploadMockFile = () => {
    if (!uploadFileName.trim()) return;
    const driveType: DriveType = activeNav === 'PERSONAL' ? 'PERSONAL' : 'TENANT_SHARED';
    const mockFile = new File(['Sample Aurora File Content'], uploadFileName.trim(), { type: 'application/pdf' });
    DriveService.uploadFile(mockFile, driveType, currentFolderId);
    setUploadFileName('');
    setIsUploadOpen(false);
    toast.success(`Uploaded file "${mockFile.name}"`);
    refresh();
  };

  const handleToggleFavorite = (e: React.MouseEvent, item: DriveItem) => {
    e.stopPropagation();
    DriveService.toggleFavorite(item.id);
    toast.success(item.isFavorite ? 'Removed from Starred' : 'Added to Starred');
    refresh();
  };

  const handleDeleteItem = async (item: DriveItem) => {
    try {
      DriveService.softDeleteItem(item.id);
      await sendToGlobalRecyclingBin(item, tenant?.id, user?.email, session?.access_token);
      toast.success(`Moved "${item.name}" to global Recycling Bin`);
      if (selectedItemId === item.id) setSelectedItemId(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };


  const handleToggleLegalHold = () => {
    if (!selectedItem) return;
    try {
      const updated = DriveService.toggleLegalHold(selectedItem.id, legalHoldReason);
      setIsLegalHoldModalOpen(false);
      setLegalHoldReason('');
      if (updated) {
        toast.success(updated.recordsMetadata.isLegalHold ? 'Legal Hold applied successfully' : 'Legal Hold released');
      }
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle legal hold');
    }
  };


  const handleUpdateClassification = (classification: DocumentClassification) => {
    if (!selectedItem) return;
    DriveService.updateRecordsMetadata(selectedItem.id, classification, selectedItem.recordsMetadata.retentionScheduleId);
    toast.success(`Classification set to ${classification}`);
    refresh();
  };

  const handleUpdateRetentionSchedule = (scheduleId: string) => {
    if (!selectedItem) return;
    DriveService.updateRecordsMetadata(selectedItem.id, selectedItem.recordsMetadata.classification, scheduleId);
    toast.success('Disposal Schedule updated');
    refresh();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
      {/* Glow Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* App Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 shadow-sm">
            <Folder size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Aurora Drive
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Workspace Suite
              </span>
            </h1>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">Enterprise file & folder records management with legal hold compliance</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const driveType = activeNav === 'PERSONAL' ? 'PERSONAL' : 'TENANT_SHARED';
              const newDoc = DriveService.saveDocument(
                null,
                'Untitled Document',
                '<h1>Untitled Document</h1><p>Start writing document contents here...</p>',
                driveType,
                currentFolderId
              );
              navigate(`/workspace/apps/docs/${newDoc.id}`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <FilePlus size={16} />
            New Document
          </button>
          
          <button
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <FolderPlus size={16} />
            New Folder
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Upload size={16} />
            Upload File
          </button>
        </div>
      </div>

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* Left Navigation Sidebar */}
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-xl p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 px-3 mb-2">Storage Spaces</p>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveNav('TENANT_SHARED');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'TENANT_SHARED'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} />
                    Tenant Shared Drives
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-zinc-800 font-bold">Org</span>
                </button>

                <button
                  onClick={() => {
                    setActiveNav('PERSONAL');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'PERSONAL'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <HardDrive size={16} />
                    My Drive (Personal)
                  </div>
                </button>
              </nav>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 px-3 mb-2">Views & Governance</p>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveNav('STARRED');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'STARRED'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <Star size={16} className="text-amber-400" />
                  Starred Favorites
                </button>

                <button
                  onClick={() => {
                    setActiveNav('RECENT');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'RECENT'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <Clock size={16} />
                  Recent Items
                </button>

                <button
                  onClick={() => {
                    setActiveNav('GOVERNANCE');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'GOVERNANCE'
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Records & Compliance
                  </div>
                  <Lock size={12} className="text-amber-500" />
                </button>

                <button
                  onClick={() => {
                    setActiveNav('TRASH');
                    setCurrentFolderId(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    activeNav === 'TRASH'
                      ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                  )}
                >
                  <Trash2 size={16} />
                  Recycling Bin
                </button>
              </nav>
            </div>
          </div>

          {/* Storage Meter Summary */}
          <div className="p-3.5 bg-zinc-100/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-zinc-600 dark:text-zinc-400">Organization Storage</span>
              <span className="text-indigo-600 dark:text-indigo-400">2.4 GB / 50 GB</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[12%] rounded-full" />
            </div>
          </div>
        </div>

        {/* Middle Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Sub-bar: Search, Breadcrumbs, & View Toggles */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/20 dark:bg-zinc-900/20 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shrink-0">
            
            {/* Interactive Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs text-zinc-500">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.id || `crumb-${idx}`} className="flex items-center gap-1.5 shrink-0">
                  {idx > 0 && <ChevronRight size={14} className="text-zinc-400" />}
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={cn(
                      "hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors",
                      idx === breadcrumbs.length - 1 ? "text-zinc-900 dark:text-white" : "text-zinc-500"
                    )}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Search and View Switcher */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input
                  type="text"
                  placeholder="Search files or record #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'GRID' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400"
                  )}
                  title="Grid View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    viewMode === 'LIST' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400"
                  )}
                  title="List View"
                >
                  <ListIcon size={14} />
                </button>
              </div>

              <button
                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                className={cn(
                  "p-2 border rounded-xl transition-all",
                  isInspectorOpen
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
                title="Toggle Details Inspector"
              >
                <Info size={16} />
              </button>
            </div>
          </div>

          {/* Files & Folders Grid / List Display */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                <Folder size={48} className="stroke-[1] mb-3 opacity-40" />
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No items found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  {searchQuery ? `No files match "${searchQuery}".` : 'This drive directory is currently empty. Click "+ New Document" or "Upload File" above to start.'}
                </p>
              </div>
            ) : viewMode === 'GRID' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const isFolder = item.type === 'FOLDER';
                  const isDoc = item.type === 'DOCUMENT';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      onDoubleClick={() => {
                        if (isFolder) {
                          setCurrentFolderId(item.id);
                        } else if (isDoc) {
                          navigate(`/workspace/apps/docs/${item.id}`);
                        }
                      }}
                      className={cn(
                        "group p-4 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3",
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                          : "border-zinc-200/80 dark:border-white/5 hover:border-indigo-500/40 hover:shadow-md"
                      )}
                    >
                      {/* Top Item Icons */}
                      <div className="flex items-start justify-between">
                        <div className={cn(
                          "p-3 rounded-xl transition-transform group-hover:scale-105",
                          isFolder ? "bg-amber-500/10 text-amber-500" : isDoc ? "bg-indigo-500/10 text-indigo-500" : "bg-teal-500/10 text-teal-500"
                        )}>
                          {isFolder ? <Folder size={22} /> : isDoc ? <FileText size={22} /> : <FileIcon size={22} />}
                        </div>

                        <div className="flex items-center gap-1">
                          {item.recordsMetadata.isLegalHold && (
                            <div className="p-1 bg-rose-500/10 text-rose-500 rounded-md" title="Legal Hold Active">
                              <Lock size={12} />
                            </div>
                          )}
                          <button
                            onClick={(e) => handleToggleFavorite(e, item)}
                            className="p-1 text-zinc-300 hover:text-amber-400 transition-colors"
                          >
                            <Star size={14} className={cn(item.isFavorite && "fill-amber-400 text-amber-400")} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="p-1 text-zinc-300 hover:text-rose-500 transition-colors"
                            title="Delete to Global Recycling Bin"
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      </div>


                      {/* Title & Info */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                          <span>{item.recordsMetadata.recordNumber}</span>
                          <span>•</span>
                          <span>{item.ownerName}</span>
                        </div>
                      </div>

                      {/* Footer Badge Bar */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]",
                          item.recordsMetadata.classification === 'RESTRICTED' ? "bg-rose-500/10 text-rose-500" :
                          item.recordsMetadata.classification === 'CONFIDENTIAL' ? "bg-amber-500/10 text-amber-500" :
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {item.recordsMetadata.classification}
                        </span>
                        <span className="text-zinc-400 font-medium">{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List Table View */
              <div className="bg-white/60 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Record UID</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Disposal Schedule</th>
                      <th className="py-3 px-4">Legal Hold</th>
                      <th className="py-3 px-4">Last Modified</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {filteredItems.map(item => {
                      const isSelected = selectedItemId === item.id;
                      const isFolder = item.type === 'FOLDER';
                      const isDoc = item.type === 'DOCUMENT';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          onDoubleClick={() => {
                            if (isFolder) setCurrentFolderId(item.id);
                            else if (isDoc) navigate(`/workspace/apps/docs/${item.id}`);
                          }}
                          className={cn(
                            "hover:bg-zinc-100/50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors",
                            isSelected && "bg-indigo-50/60 dark:bg-indigo-500/10"
                          )}
                        >
                          <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isFolder ? "bg-amber-500/10 text-amber-500" : isDoc ? "bg-indigo-500/10 text-indigo-500" : "bg-teal-500/10 text-teal-500"
                            )}>
                              {isFolder ? <Folder size={16} /> : isDoc ? <FileText size={16} /> : <FileIcon size={16} />}
                            </div>
                            <span className="truncate max-w-xs">{item.name}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{item.recordsMetadata.recordNumber}</td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]",
                              item.recordsMetadata.classification === 'RESTRICTED' ? "bg-rose-500/10 text-rose-500" :
                              item.recordsMetadata.classification === 'CONFIDENTIAL' ? "bg-amber-500/10 text-amber-500" :
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {item.recordsMetadata.classification}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            {item.recordsMetadata.retentionScheduleName || 'Standard Policy'}
                          </td>
                          <td className="py-3 px-4">
                            {item.recordsMetadata.isLegalHold ? (
                              <span className="flex items-center gap-1 text-rose-500 font-bold text-[10px]">
                                <Lock size={12} /> Active Hold
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 text-[11px]">{new Date(item.updatedAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                              title="Move to Recycling Bin"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Inspection & Records Management Panel */}
        <AnimatePresence>
          {isInspectorOpen && selectedItem && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 z-20 shadow-xl"
            >
              {/* Inspector Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    {selectedItem.type === 'FOLDER' ? <Folder size={16} /> : <FileText size={16} />}
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{selectedItem.name}</h3>
                </div>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Inspector Tabs */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-[10px] font-bold">
                <button
                  onClick={() => setInspectorTab('details')}
                  className={cn(
                    "flex-1 py-2.5 text-center transition-colors border-b-2",
                    inspectorTab === 'details' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-zinc-400"
                  )}
                >
                  Overview
                </button>
                <button
                  onClick={() => setInspectorTab('records')}
                  className={cn(
                    "flex-1 py-2.5 text-center transition-colors border-b-2",
                    inspectorTab === 'records' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-zinc-400"
                  )}
                >
                  Governance
                </button>
                <button
                  onClick={() => setInspectorTab('versions')}
                  className={cn(
                    "flex-1 py-2.5 text-center transition-colors border-b-2",
                    inspectorTab === 'versions' ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-zinc-400"
                  )}
                >
                  History
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs custom-scrollbar">

                {/* OVERVIEW TAB */}
                {inspectorTab === 'details' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl space-y-2 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Properties</span>
                      <div className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                        <div className="flex justify-between"><span className="text-zinc-400">Record UID:</span> <span className="font-mono">{selectedItem.recordsMetadata.recordNumber}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Owner:</span> <span>{selectedItem.ownerName}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Size:</span> <span>{(selectedItem.sizeBytes / 1024).toFixed(1)} KB</span></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Created:</span> <span>{new Date(selectedItem.createdAt).toLocaleDateString()}</span></div>
                      </div>
                    </div>

                    {selectedItem.type === 'DOCUMENT' && (
                      <button
                        onClick={() => navigate(`/workspace/apps/docs/${selectedItem.id}`)}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        Open in Documents Editor
                      </button>
                    )}

                    <button
                      onClick={() => setItemToDelete(selectedItem)}
                      className="w-full py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete to Global Recycling Bin
                    </button>

                  </div>
                )}


                {/* RECORDS & GOVERNANCE TAB */}
                {inspectorTab === 'records' && (
                  <div className="space-y-5">
                    
                    {/* Legal Hold Action Card */}
                    <div className={cn(
                      "p-4 rounded-2xl border space-y-2",
                      selectedItem.recordsMetadata.isLegalHold
                        ? "bg-rose-500/5 border-rose-500/30"
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <Lock size={14} className={selectedItem.recordsMetadata.isLegalHold ? "text-rose-500" : "text-zinc-400"} />
                          Legal Hold Freeze
                        </span>
                        <button
                          onClick={() => setIsLegalHoldModalOpen(true)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                            selectedItem.recordsMetadata.isLegalHold
                              ? "bg-rose-600 text-white hover:bg-rose-500"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          )}
                        >
                          {selectedItem.recordsMetadata.isLegalHold ? "Release Hold" : "Apply Hold"}
                        </button>
                      </div>
                      {selectedItem.recordsMetadata.isLegalHold && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-relaxed">
                          Reason: {selectedItem.recordsMetadata.legalHoldReason}
                        </p>
                      )}
                    </div>

                    {/* Document Classification */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Document Classification</label>
                      <select
                        value={selectedItem.recordsMetadata.classification}
                        onChange={(e) => handleUpdateClassification(e.target.value as DocumentClassification)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="PUBLIC">PUBLIC</option>
                        <option value="INTERNAL">INTERNAL</option>
                        <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                      </select>
                    </div>

                    {/* Retention & Disposal Schedule */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Disposal Schedule</label>
                      <select
                        value={selectedItem.recordsMetadata.retentionScheduleId || ''}
                        onChange={(e) => handleUpdateRetentionSchedule(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="">Select Compliance Schedule...</option>
                        {DEFAULT_DISPOSAL_SCHEDULES.map(ds => (
                          <option key={ds.id} value={ds.id}>{ds.name} ({ds.durationLabel})</option>
                        ))}
                      </select>

                      {selectedItem.recordsMetadata.retentionExpiryDate && (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 space-y-1">
                          <p className="font-bold">Active Retention Countdown</p>
                          <p>Expires on: {selectedItem.recordsMetadata.retentionExpiryDate} ({selectedItem.recordsMetadata.disposalAction})</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VERSION HISTORY TAB */}
                {inspectorTab === 'versions' && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Version Snapshots</span>
                    {selectedItem.versions.length === 0 ? (
                      <p className="text-zinc-400 text-xs italic">No prior version history recorded.</p>
                    ) : (
                      selectedItem.versions.map(v => (
                        <div key={v.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-1">
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-white">
                            <span>Version {v.versionNumber}</span>
                            <span className="text-zinc-400 font-normal">{new Date(v.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400">{v.note || 'Saved edit'}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder Name (e.g. Q3 Audits)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MOCK FILE MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Upload File</h3>
            <input
              type="text"
              placeholder="Filename (e.g. Executive_Summary.pdf)..."
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUploadMockFile()}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadMockFile}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL HOLD REASON MODAL */}
      {isLegalHoldModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500">
              <Lock size={20} />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {selectedItem.recordsMetadata.isLegalHold ? "Release Legal Hold" : "Apply Immutable Legal Hold"}
              </h3>
            </div>
            {!selectedItem.recordsMetadata.isLegalHold && (
              <input
                type="text"
                placeholder="Reason / Case Reference (e.g. SEC Audit Hold 2026)..."
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsLegalHoldModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLegalHold}
                className={cn(
                  "px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-colors",
                  selectedItem.recordsMetadata.isLegalHold ? "bg-zinc-700 hover:bg-zinc-600" : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                )}
              >
                Confirm {selectedItem.recordsMetadata.isLegalHold ? "Release" : "Freeze"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Aurora Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        item={itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDeleteItem(itemToDelete)}
      />
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderLock, 
  Files,
  X, 
  Search, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  Lock, 
  Unlock, 
  Sparkles, 
  MessageSquare, 
  Send, 
  Loader2, 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  ExternalLink,
  Layers,
  Trash2,
  Eye,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  GitCompare,
  PenTool,
  EyeOff,
  FileOutput,
  CalendarCheck,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { DocumentClientService } from '../../services/documentClientService';
import { UniversalDocument } from '../../types/document';
import { API_BASE_URL } from '../../config';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { DocumentVersionDiffModal } from './DocumentVersionDiffModal';
import { DocumentAnnotationsOverlay } from './DocumentAnnotationsOverlay';
import { DocumentSignModal } from './DocumentSignModal';
import { DocumentRedactionModal } from './DocumentRedactionModal';
import { DocumentBatchActionBar } from './DocumentBatchActionBar';
import { DocumentConvertToRecordModal } from './DocumentConvertToRecordModal';
import { DocumentObligationsModal } from './DocumentObligationsModal';
import { DocumentMetadataInspector } from './DocumentMetadataInspector';

interface RecordDocumentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordTitle?: string;
  moduleName?: string;
  moduleId?: string;
  onDocumentCountChange?: (count: number) => void;
}

export const RecordDocumentsDrawer: React.FC<RecordDocumentsDrawerProps> = ({
  isOpen,
  onClose,
  recordId,
  recordTitle,
  moduleName,
  moduleId,
  onDocumentCountChange
}) => {
  const [documents, setDocuments] = useState<UniversalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<UniversalDocument | null>(null);
  
  // 3-Column Workstation Controls
  const { isAIFeatureEnabled } = useAIFeatures();
  const isCopilotEnabled = isAIFeatureEnabled('ai:document_copilot');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'METADATA' | 'COPILOT' | 'COMPLIANCE'>('METADATA');
  const [mobileView, setMobileView] = useState<'LIST' | 'VIEWER' | 'INSPECTOR'>('LIST');

  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragCounter = useRef(0);
  const [uploadNote, setUploadNote] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Visual Canvas Zoom & Pan Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Batch Selection & Schedules
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Productivity Suite Modals State
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [isRedactModalOpen, setIsRedactModalOpen] = useState<boolean>(false);
  const [isConvertToRecordOpen, setIsConvertToRecordOpen] = useState<boolean>(false);
  const [isObligationsModalOpen, setIsObligationsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Reset zoom and rotation whenever active document changes
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  }, [selectedDoc?.id]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(Number((prev + 0.25).toFixed(2)), 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.25);
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Cache last active record metadata so exit animation displays smoothly without flash of blank text
  const recordInfoRef = useRef({
    recordId,
    recordTitle,
    moduleName,
    moduleId
  });

  if (recordId) {
    recordInfoRef.current = {
      recordId,
      recordTitle,
      moduleName,
      moduleId
    };
  }

  const activeRecordId = recordId || recordInfoRef.current.recordId;
  const activeRecordTitle = recordTitle || recordInfoRef.current.recordTitle;
  const activeModuleName = moduleName || recordInfoRef.current.moduleName;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    if (!recordId) return;
    try {
      setLoading(true);
      const [docs, scheds] = await Promise.all([
        DocumentClientService.getRecordDocuments(recordId),
        DocumentClientService.getDisposalSchedules().catch(() => [])
      ]);
      const safeDocs = Array.isArray(docs) ? docs : [];
      const safeScheds = Array.isArray(scheds) ? scheds : [];
      setDocuments(safeDocs);
      setSchedules(safeScheds);
      onDocumentCountChange?.(safeDocs.length);

      if (safeDocs.length > 0) {
        setSelectedDoc(prev => {
          if (!prev) return safeDocs[0];
          const found = safeDocs.find(d => d.id === prev.id);
          return found || safeDocs[0];
        });
      } else {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      console.error('[RecordDocumentsDrawer] Error loading docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSelectedDoc(null);
      loadDocuments();
    }
  }, [isOpen, recordId]);

  const handleFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const uploadedDocs: UniversalDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (files.length > 1) {
          setUploadProgressText(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        } else {
          setUploadProgressText(`Uploading ${file.name}...`);
        }

        try {
          const res = await DocumentClientService.uploadDocument({
            file,
            recordId,
            moduleId,
            sourceType: 'RECORD'
          });
          if (res?.document) {
            uploadedDocs.push(res.document);
          }
        } catch (fileErr: any) {
          console.error(`[RecordDocumentsDrawer] Error uploading ${file.name}:`, fileErr);
          toast.error(`Failed to upload ${file.name}: ${fileErr.message || 'Upload error'}`);
        }
      }

      if (uploadedDocs.length > 0) {
        if (files.length > 1) {
          toast.success(`Successfully uploaded ${uploadedDocs.length} file${uploadedDocs.length > 1 ? 's' : ''} to vault.`);
        } else {
          toast.success('File uploaded to record vault.');
        }
        await loadDocuments();
        setSelectedDoc(uploadedDocs[0]);
        setMobileView('VIEWER');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    await handleFilesUpload([file]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setIsDraggingFiles(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleFilesUpload(files);
    }
  };

  const handleUploadVersion = async (file: File) => {
    if (!selectedDoc) return;
    try {
      setIsUploading(true);
      const updated = await DocumentClientService.uploadVersion(selectedDoc.id, file, uploadNote);
      toast.success(`Uploaded version ${updated.versions?.length || 2}`);
      setUploadNote('');
      await loadDocuments();
      setSelectedDoc(updated);
    } catch (err: any) {
      toast.error(err.message || 'Version upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleLegalHold = async (doc: UniversalDocument) => {
    try {
      const reason = !doc.isLegalHold 
        ? prompt('Enter Legal Hold justification / case number:', 'Active legal investigation')
        : undefined;

      if (!doc.isLegalHold && reason === null) return; // User cancelled

      const updated = await DocumentClientService.toggleLegalHold(doc.id, reason || undefined);
      toast.success(updated.isLegalHold ? 'Legal Hold applied. Modifications locked.' : 'Legal Hold released.');
      await loadDocuments();
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(updated);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle legal hold');
    }
  };

  const handleDeleteDocument = async (doc: UniversalDocument) => {
    if (doc.isLegalHold) {
      toast.error(`Cannot delete "${doc.name}": Active Legal Hold is enforced.`);
      return;
    }
    if (!confirm(`Move "${doc.originalFilename || doc.name}" to the Recycling Bin? It can be recovered within 30 days.`)) {
      return;
    }
    try {
      await DocumentClientService.deleteDocument(doc.id, false);
      toast.success(`"${doc.originalFilename || doc.name}" moved to Recycling Bin.`);
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move document to trash');
    }
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim() || !selectedDoc || copilotLoading) return;

    const userMessage = copilotQuery.trim();
    setCopilotQuery('');
    setCopilotHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setCopilotLoading(true);

    try {
      const answer = await DocumentClientService.queryCopilot(selectedDoc.id, userMessage, copilotHistory);
      setCopilotHistory(prev => [...prev, { role: 'model', text: answer }]);
    } catch (err: any) {
      setCopilotHistory(prev => [...prev, { role: 'model', text: `Error: ${err.message || 'Failed to analyze'}` }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.originalFilename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.documentType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLegalHoldActive = documents.some(d => d.isLegalHold);

  const selectedStreamUrl = selectedDoc 
    ? `${API_BASE_URL}/api/documents/stream/${selectedDoc.id}` 
    : '';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="documents-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[99998] bg-zinc-950/80 backdrop-blur-sm cursor-pointer"
        />
      )}
      {isOpen && (
        <motion.div
          key="documents-drawer-panel"
          ref={drawerRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 z-[99999] w-full h-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden"
        >
          {/* Drag and Drop Visual Overlay */}
          {isDraggingFiles && (
            <div className="absolute inset-0 z-50 bg-indigo-600/15 dark:bg-indigo-950/40 backdrop-blur-xs border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center p-8 pointer-events-none select-none transition-all">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-4 animate-bounce">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                Drop Files Here to Upload
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-sm text-center">
                Add single or multiple files to this record vault. Metadata and technical properties will be indexed automatically.
              </p>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input 
            ref={fileInputRef} 
            type="file" 
            multiple
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesUpload(Array.from(e.target.files));
                e.target.value = '';
              }
            }} 
          />
          <input 
            ref={versionInputRef} 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUploadVersion(e.target.files[0]);
                e.target.value = '';
              }
            }} 
          />

          {/* Top Main Navigation Bar */}
          <div className="px-6 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Files size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Record Files & Vault
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {documents.length} {documents.length === 1 ? 'file' : 'files'}
                  </span>
                  {isLegalHoldActive && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <ShieldAlert size={11} /> Legal Hold
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {activeModuleName || 'Module'} • {activeRecordTitle || `Record #${String(activeRecordId || '').slice(0, 8)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                <span>{isUploading ? (uploadProgressText || 'Uploading...') : 'Add Files'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800"
                title="Close Files View (Esc)"
              >
                <X size={15} />
                <span className="hidden sm:inline">Close</span>
                <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono">Esc</kbd>
              </button>
            </div>
          </div>

          {/* 3-Column Workstation Canvas */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
            
            {/* COLUMN 1: File Explorer (Left) */}
            <div className={cn(
              "w-full md:w-[280px] lg:w-[320px] xl:w-[350px] border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/40 dark:bg-zinc-900/30 shrink-0 min-h-0",
              mobileView !== 'LIST' ? 'hidden md:flex' : 'flex'
            )}>
              {/* Search Bar */}
              <div className="p-3 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/60">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-100/70 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg text-xs outline-none focus:border-indigo-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Explorer Sub-Bar: File Count + Select All */}
              <div className="px-3 py-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-50/80 dark:bg-zinc-900/40">
                <span>{filteredDocs.length} file{filteredDocs.length === 1 ? '' : 's'}</span>
                {filteredDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedDocIds.length === filteredDocs.length) {
                        setSelectedDocIds([]);
                      } else {
                        setSelectedDocIds(filteredDocs.map(d => d.id));
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedDocIds.length === filteredDocs.length ? (
                      <>
                        <CheckSquare size={12} /> Deselect All
                      </>
                    ) : (
                      <>
                        <Square size={12} /> Select All
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Scrollable File Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <p className="text-xs">Loading files...</p>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-zinc-400 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <UploadCloud size={18} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No files found</p>
                    <p className="text-[11px] text-zinc-400">
                      {searchQuery ? 'Try matching another name or type.' : 'Upload PDFs, images, or records here.'}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                    >
                      + Upload file
                    </button>
                  </div>
                ) : (
                  filteredDocs.map(doc => {
                    const isSelected = selectedDoc?.id === doc.id;
                    const isChecked = selectedDocIds.includes(doc.id);
                    const docStreamUrl = `${API_BASE_URL}/api/documents/stream/${doc.id}`;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setMobileView('VIEWER');
                        }}
                        className={cn(
                          "group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2",
                          isSelected
                            ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500/80 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500/20"
                            : "bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocIds(prev =>
                                prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                              );
                            }}
                            className="mt-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                            title={isChecked ? "Deselect" : "Select"}
                          >
                            {isChecked ? (
                              <CheckSquare size={15} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square size={15} className="text-zinc-400 hover:text-zinc-600" />
                            )}
                          </button>

                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                            isSelected
                              ? "bg-indigo-500 text-white border-indigo-600"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200/60 dark:border-zinc-700/60"
                          )}>
                            {doc.mimeType?.startsWith('image/') ? (
                              <ImageIcon size={16} />
                            ) : doc.mimeType === 'application/pdf' ? (
                              <FileText size={16} />
                            ) : (
                              <FileCode size={16} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-xs font-bold truncate",
                              isSelected ? "text-indigo-950 dark:text-indigo-100" : "text-zinc-900 dark:text-zinc-100"
                            )}>
                              {doc.originalFilename || doc.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5 flex-wrap">
                              <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>v{doc.versions?.length || 1}</span>
                              <span>•</span>
                              <span className="truncate">{doc.documentType || 'GENERAL'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {doc.isLegalHold && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                <Lock size={9} /> Hold
                              </span>
                            )}
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {doc.classification}
                            </span>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-100/60 dark:border-zinc-800/40 text-[10px] text-zinc-400">
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            <a
                              href={`${docStreamUrl}?download=true`}
                              download={doc.originalFilename || doc.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                              title="Download"
                            >
                              <Download size={12} />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLegalHold(doc);
                              }}
                              className={cn(
                                "p-1 rounded transition-colors",
                                doc.isLegalHold ? "text-rose-500" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              )}
                              title={doc.isLegalHold ? "Release Legal Hold" : "Apply Legal Hold"}
                            >
                              {doc.isLegalHold ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc);
                              }}
                              disabled={doc.isLegalHold}
                              className={cn(
                                "p-1 rounded transition-colors",
                                doc.isLegalHold ? "text-zinc-300 dark:text-zinc-700 opacity-30 cursor-not-allowed" : "text-zinc-400 hover:text-rose-500 cursor-pointer"
                              )}
                              title={doc.isLegalHold ? "Legal Hold active" : "Move to Recycling Bin"}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: Visual Document Canvas (Center) */}
            <div className={cn(
              "flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-100/30 dark:bg-zinc-950",
              mobileView === 'LIST' ? 'hidden md:flex' : mobileView === 'INSPECTOR' ? 'hidden md:flex' : 'flex'
            )}>
              {loading ? (
                <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white/40 dark:bg-zinc-900/20">
                  {/* Skeleton Top Bar */}
                  <div className="px-5 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/60 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-40 h-3 rounded bg-zinc-200/80 dark:bg-zinc-800 animate-pulse" />
                        <div className="w-24 h-2 rounded bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    </div>
                  </div>

                  {/* Skeleton Canvas Viewport */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 shadow-xs">
                      <Loader2 size={22} className="animate-spin text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Loading file preview...
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Connecting to secure file vault
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedDoc ? (
                <>
                  {/* Canvas Header */}
                  <div className="px-5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Mobile Back Button */}
                      <button
                        onClick={() => setMobileView('LIST')}
                        className="md:hidden p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Back to file list"
                      >
                        <ArrowLeft size={16} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-xs sm:max-w-md">
                            {selectedDoc.originalFilename || selectedDoc.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            v{selectedDoc.versions?.length || 1}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {selectedDoc.classification}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {(selectedDoc.sizeBytes / 1024).toFixed(1)} KB • {selectedDoc.mimeType || 'binary'}
                        </p>
                      </div>
                    </div>

                    {/* Canvas Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => versionInputRef.current?.click()}
                        disabled={selectedDoc.isLegalHold || isUploading}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Upload revision"
                      >
                        <Layers size={13} />
                        <span className="hidden sm:inline">New Version</span>
                      </button>

                      {/* Productivity Suite Actions */}
                      <button
                        onClick={() => setIsConvertToRecordOpen(true)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                        title="Convert document into a CRM/ERP record"
                      >
                        <FileOutput size={13} />
                        <span className="hidden sm:inline">Convert to Record</span>
                      </button>

                      <button
                        onClick={() => setIsDiffModalOpen(true)}
                        className="px-2 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Compare revisions and legal clauses"
                      >
                        <GitCompare size={13} />
                        <span className="hidden xl:inline">Compare</span>
                      </button>

                      <button
                        onClick={() => setIsAnnotating(prev => !prev)}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                          isAnnotating 
                            ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-2 ring-amber-400" 
                            : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        )}
                        title="Click on canvas to drop feedback pins"
                      >
                        <PenTool size={13} />
                        <span className="hidden xl:inline">{isAnnotating ? 'Done Pinning' : 'Annotate'}</span>
                      </button>

                      <button
                        onClick={() => setIsSignModalOpen(true)}
                        className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                        title="Digital signature and formal approval stamp"
                      >
                        <ShieldCheck size={13} />
                        <span className="hidden xl:inline">Sign</span>
                      </button>

                      <button
                        onClick={() => setIsRedactModalOpen(true)}
                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                        title="AI PII Redaction and Sanitisation"
                      >
                        <EyeOff size={13} />
                        <span className="hidden xl:inline">Redact</span>
                      </button>

                      <button
                        onClick={() => setIsObligationsModalOpen(true)}
                        className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                        title="Extract deadlines and renewal obligations"
                      >
                        <CalendarCheck size={13} />
                        <span className="hidden xl:inline">Obligations</span>
                      </button>

                      <a
                        href={selectedStreamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Open in new window"
                      >
                        <ExternalLink size={15} />
                      </a>

                      <a
                        href={`${selectedStreamUrl}?download=true`}
                        download={selectedDoc.originalFilename || selectedDoc.name}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Download file"
                      >
                        <Download size={15} />
                      </a>

                      {/* Mobile Inspector Switcher */}
                      <button
                        onClick={() => setMobileView('INSPECTOR')}
                        className="md:hidden p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Open Copilot"
                      >
                        <Sparkles size={16} />
                      </button>

                      {/* Desktop Toggle Right Sidebar */}
                      <button
                        onClick={() => setIsSidebarOpen(prev => !prev)}
                        className={cn(
                          "hidden md:flex p-1.5 rounded-lg transition-colors cursor-pointer",
                          isSidebarOpen 
                            ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100" 
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        title={isSidebarOpen ? "Hide Copilot & Compliance Sidebar" : "Show Copilot & Compliance Sidebar"}
                      >
                        {isSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Document Canvas Body */}
                  <div className="flex-1 min-h-0 p-3 md:p-4 overflow-hidden flex flex-col">
                    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs flex flex-col relative">
                      {/* Interactive Pin Annotations Overlay */}
                      <DocumentAnnotationsOverlay
                        document={selectedDoc}
                        isAnnotating={isAnnotating}
                        onAnnotationAdded={(updated) => {
                          setSelectedDoc(updated);
                          setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                        }}
                      />

                      {selectedDoc.mimeType === 'application/pdf' ? (
                        <iframe
                          src={selectedStreamUrl}
                          className="w-full h-full border-0 rounded-2xl"
                          title={selectedDoc.originalFilename || selectedDoc.name}
                        />
                      ) : selectedDoc.mimeType?.startsWith('image/') ? (
                        <div 
                          className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950/90 select-none"
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                          onWheel={handleWheel}
                          style={{
                            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                          }}
                        >
                          {/* Dark Checkerboard backdrop */}
                          <div 
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                              backgroundImage: `radial-gradient(circle, #888 1px, transparent 1px)`,
                              backgroundSize: '20px 20px'
                            }}
                          />

                          {/* Zoomable & Pannable Image Surface */}
                          <div
                            className="transition-transform duration-75 ease-out max-h-full max-w-full flex items-center justify-center p-6"
                            style={{
                              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                              transformOrigin: 'center center'
                            }}
                          >
                            <img
                              src={selectedStreamUrl}
                              alt={selectedDoc.originalFilename || selectedDoc.name}
                              draggable={false}
                              className="max-h-[75vh] max-w-[75vw] object-contain rounded-xl shadow-2xl pointer-events-none"
                            />
                          </div>

                          {/* Floating Glassmorphic Zoom & Rotate Controller Toolbar */}
                          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-full shadow-2xl text-white">
                            <button
                              type="button"
                              onClick={handleZoomOut}
                              disabled={zoomLevel <= 0.25}
                              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                              title="Zoom Out (Ctrl + Scroll Down)"
                            >
                              <ZoomOut size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={handleResetZoom}
                              className="px-2 py-0.5 rounded-md hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors text-[11px] font-mono font-bold cursor-pointer min-w-[50px] text-center"
                              title="Click to reset zoom & fit"
                            >
                              {Math.round(zoomLevel * 100)}%
                            </button>

                            <button
                              type="button"
                              onClick={handleZoomIn}
                              disabled={zoomLevel >= 4}
                              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
                              title="Zoom In (Ctrl + Scroll Up)"
                            >
                              <ZoomIn size={14} />
                            </button>

                            <div className="w-[1px] h-3.5 bg-zinc-700/80 mx-1" />

                            <button
                              type="button"
                              onClick={handleRotate}
                              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Rotate 90° Clockwise"
                            >
                              <RotateCw size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={handleResetZoom}
                              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                              title="Fit to Screen"
                            >
                              <Maximize2 size={13} />
                            </button>
                          </div>
                        </div>
                      ) : selectedDoc.mimeType?.startsWith('text/') || selectedDoc.mimeType === 'application/json' ? (
                        <iframe
                          src={selectedStreamUrl}
                          className="w-full h-full border-0 p-6 bg-white dark:bg-zinc-950 font-mono text-xs"
                          title={selectedDoc.originalFilename || selectedDoc.name}
                        />
                      ) : (
                        /* Non-visual binary preview card */
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-900/50">
                          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 border border-indigo-500/20">
                            <FileText size={32} />
                          </div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                            {selectedDoc.originalFilename || selectedDoc.name}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
                            This file type ({selectedDoc.mimeType || 'binary'}) does not support native inline canvas streaming. You can download it or open it directly in a new tab.
                          </p>
                          <div className="flex items-center gap-3">
                            <a
                              href={`${selectedStreamUrl}?download=true`}
                              download={selectedDoc.originalFilename || selectedDoc.name}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <Download size={14} /> Download File ({(selectedDoc.sizeBytes / 1024).toFixed(1)} KB)
                            </a>
                            <a
                              href={selectedStreamUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <ExternalLink size={14} /> Open in New Tab
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* No File Selected state */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-200/80 dark:border-zinc-800">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {documents.length === 0 ? 'No Files Attached' : 'No File Selected'}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                      {documents.length === 0
                        ? 'No files attached to this record yet. Click "Attach File" above to upload.'
                        : 'Choose a file from the explorer on the left to preview it directly in this canvas.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 3: Docked Intelligence & Compliance Inspector (Right) */}
            {isSidebarOpen && selectedDoc && (
              <div className={cn(
                "w-full md:w-[380px] lg:w-[420px] xl:w-[450px] border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900/60 shrink-0 min-h-0 shadow-xs",
                mobileView === 'INSPECTOR' ? 'flex' : 'hidden md:flex'
              )}>
                {/* Inspector Header & Subtabs */}
                <div className="px-4 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('VIEWER')}
                    className="md:hidden p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Back to Document Canvas"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  {/* Subtab Segmented Switcher */}
                  <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setSidebarTab('METADATA')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                        sidebarTab === 'METADATA'
                          ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Info size={12} />
                      <span>Metadata</span>
                    </button>

                    <button
                      onClick={() => setSidebarTab('COPILOT')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                        sidebarTab === 'COPILOT'
                          ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Sparkles size={12} />
                      <span>Copilot</span>
                      {!isCopilotEnabled && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">
                          Restricted
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setSidebarTab('COMPLIANCE')}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                        sidebarTab === 'COMPLIANCE'
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <ShieldCheck size={12} />
                      <span>RDS & Audit</span>
                    </button>
                  </div>

                  {/* Close Sidebar Button */}
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Collapse Sidebar"
                  >
                    <PanelRightClose size={15} />
                  </button>
                </div>

                {/* Inspector Body */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4">
                  
                  {/* TAB A: Technical & File Metadata */}
                  {sidebarTab === 'METADATA' && (
                    <DocumentMetadataInspector document={selectedDoc} />
                  )}

                  {/* TAB B: Interactive Document Copilot */}
                  {sidebarTab === 'COPILOT' && (
                    !isCopilotEnabled ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">File Copilot Restricted</h4>
                          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                            Conversational file intelligence has been disabled for this account by your workspace AI Governance policy.
                          </p>
                        </div>
                      </div>
                    ) : (
                    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
                      {/* AI Executive Summary Banner */}
                      {selectedDoc.aiSummary && (
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shrink-0">
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1">
                            <Sparkles size={13} /> AI Executive Summary
                          </div>
                          <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                            {selectedDoc.aiSummary}
                          </p>
                        </div>
                      )}

                      {/* Chat Messages Canvas */}
                      <div className="flex-1 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden flex flex-col min-h-0">
                        <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-indigo-500" />
                            Ask this File
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal">Gemini 2.5 Flash</span>
                        </div>

                        {/* Scrollable Message List */}
                        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-0">
                          {copilotHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 space-y-3 p-2">
                              <Sparkles size={22} className="text-indigo-400" />
                              <div>
                                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                  Ask questions about this file
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  Query payment terms, signatories, dates, or amounts.
                                </p>
                              </div>
                              <div className="flex flex-col gap-1.5 w-full max-w-xs">
                                <button
                                  type="button"
                                  onClick={() => setCopilotQuery('Summarize this file in 3 key points.')}
                                  className="w-full text-left px-2.5 py-1.5 bg-white dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-lg text-[11px] font-medium transition-colors border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer truncate"
                                >
                                  "Summarize this file in 3 key points."
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCopilotQuery('What are the key dates, terms, and deadlines?')}
                                  className="w-full text-left px-2.5 py-1.5 bg-white dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-lg text-[11px] font-medium transition-colors border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer truncate"
                                >
                                  "What are the key dates and deadlines?"
                                </button>
                              </div>
                            </div>
                          ) : (
                            copilotHistory.map((msg, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed",
                                  msg.role === 'user'
                                    ? "ml-auto bg-indigo-600 text-white rounded-br-xs"
                                    : "mr-auto bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-xs border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs"
                                )}
                              >
                                {msg.text}
                              </div>
                            ))
                          )}
                          {copilotLoading && (
                            <div className="flex items-center gap-2 text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-xl w-fit">
                              <Loader2 size={13} className="animate-spin" />
                              <span>Analyzing file contents...</span>
                            </div>
                          )}
                        </div>

                        {/* Input Box */}
                        <form onSubmit={handleAskCopilot} className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 flex gap-2 shrink-0">
                          <input
                            type="text"
                            placeholder="Ask anything about this document..."
                            value={copilotQuery}
                            onChange={(e) => setCopilotQuery(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-zinc-100/70 dark:bg-zinc-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
                          />
                          <button
                            type="submit"
                            disabled={!copilotQuery.trim() || copilotLoading}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={12} />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}

                  {/* TAB B: Statutory RDS Compliance & Audit Log */}
                  {sidebarTab === 'COMPLIANCE' && (
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                            Records Disposal Schedule (RDS)
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Statutory compliance rules automatically govern retention.
                          </p>
                        </div>
                      </div>

                      {/* Schedule Metadata */}
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold">Active Schedule</span>
                          <p className="font-bold text-zinc-900 dark:text-white">
                            {selectedDoc.retentionSchedule?.name || 'Standard 7-Year Tax & Financial Records'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Disposal Action</span>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400">
                              {selectedDoc.disposalAction || 'ARCHIVE'}
                            </p>
                          </div>

                          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Expiry Date</span>
                            <p className="font-bold text-zinc-900 dark:text-white">
                              {selectedDoc.retentionExpiryDate ? selectedDoc.retentionExpiryDate.split('T')[0] : 'Permanent'}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-0.5">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold">SHA-256 Fingerprint</span>
                          <p className="font-mono text-[10px] text-zinc-500 truncate" title={selectedDoc.sha256}>
                            {selectedDoc.sha256}
                          </p>
                        </div>
                      </div>

                      {/* Audit History */}
                      <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                        <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800 font-bold text-xs text-zinc-900 dark:text-white flex items-center justify-between">
                          <span>Audit Trail</span>
                          <span className="text-[10px] text-zinc-400 font-normal">ISO 15489</span>
                        </div>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs max-h-56 overflow-y-auto">
                          {(selectedDoc.auditLogs && selectedDoc.auditLogs.length > 0) ? (
                            selectedDoc.auditLogs.map((log: any) => (
                              <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{log.action}</p>
                                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{log.details || 'Operation recorded'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-medium text-zinc-500">
                                    {new Date(log.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-zinc-400 text-xs">
                              No audit events logged yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

          {/* Floating Batch Action Bar */}
          <DocumentBatchActionBar
            selectedDocIds={selectedDocIds}
            documents={documents}
            schedules={schedules}
            onClearSelection={() => setSelectedDocIds([])}
            onRefresh={loadDocuments}
            recordContext={{ moduleId, recordId }}
          />

          {/* Productivity Suite Modals */}
          {selectedDoc && (
            <>
              <DocumentVersionDiffModal
                isOpen={isDiffModalOpen}
                onClose={() => setIsDiffModalOpen(false)}
                document={selectedDoc}
              />
              <DocumentSignModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                document={selectedDoc}
                onSigned={(updated) => {
                  setSelectedDoc(updated);
                  setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                }}
              />
              <DocumentRedactionModal
                isOpen={isRedactModalOpen}
                onClose={() => setIsRedactModalOpen(false)}
                document={selectedDoc}
                onRedacted={(updated) => {
                  setSelectedDoc(updated);
                  setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                }}
              />
              <DocumentConvertToRecordModal
                isOpen={isConvertToRecordOpen}
                onClose={() => setIsConvertToRecordOpen(false)}
                document={selectedDoc}
                onRecordCreated={() => {
                  loadDocuments();
                }}
              />
              <DocumentObligationsModal
                isOpen={isObligationsModalOpen}
                onClose={() => setIsObligationsModalOpen(false)}
                document={selectedDoc}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

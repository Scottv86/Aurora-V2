import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  FolderUp, 
  Eye, 
  EyeOff, 
  Lock, 
  ChevronLeft, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Quote, 
  X, 
  ShieldCheck, 
  Heading1, 
  Heading2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DriveItem, DriveType, MergeFieldToken, DocumentClassification } from '../../types/drive';
import { DriveService, SYSTEM_MERGE_FIELDS, DEFAULT_DISPOSAL_SCHEDULES, sendToGlobalRecyclingBin } from '../../services/driveService';
import { DrivePickerModal } from '../../components/Drive/DrivePickerModal';
import { DeleteConfirmModal } from '../../components/Drive/DeleteConfirmModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';



export const DocEditor = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { modules, tenant } = usePlatform();
  const { user, session } = useAuth();

  const [documentItem, setDocumentItem] = useState<DriveItem | null>(null);

  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [docContent, setDocContent] = useState('');
  const [isPreviewMerged, setIsPreviewMerged] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Drawers & Modals
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isMergeFieldDrawerOpen, setIsMergeFieldDrawerOpen] = useState(false);
  const [isGovernanceDrawerOpen, setIsGovernanceDrawerOpen] = useState(false);
  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [legalHoldReason, setLegalHoldReason] = useState('');


  const editorRef = useRef<HTMLDivElement>(null);

  // Load document on mount or parameter change
  useEffect(() => {
    if (!documentId) return;
    const doc = DriveService.getItemById(documentId);
    if (doc) {
      setDocumentItem(doc);
      setDocTitle(doc.name);
      const initialHtml = doc.content || `<h1>${doc.name}</h1><p>Start typing document content...</p>`;
      setDocContent(initialHtml);
    } else {
      toast.error('Document not found');
      navigate('/workspace/apps/docs');
    }
  }, [documentId]);

  // Sync editorRef innerHTML on load or mode switch
  useEffect(() => {
    if (editorRef.current && !isPreviewMerged && docContent) {
      if (editorRef.current.innerHTML !== docContent) {
        editorRef.current.innerHTML = docContent;
      }
    }
  }, [docContent, isPreviewMerged, documentId]);

  // Aggregate System + Custom Module Merge Fields
  const allMergeFields = useMemo(() => {
    const fields: MergeFieldToken[] = [...SYSTEM_MERGE_FIELDS];

    if (Array.isArray(modules)) {
      modules.forEach((mod: any) => {
        if (mod.config?.fields && Array.isArray(mod.config.fields)) {
          mod.config.fields.forEach((f: any) => {
            const tokenStr = `{{${mod.name.toLowerCase().replace(/\s+/g, '_')}.${f.name}}}`;
            if (!fields.some(existing => existing.token === tokenStr)) {
              fields.push({
                id: `custom-${mod.id}-${f.id}`,
                label: `${f.label || f.name}`,
                token: tokenStr,
                moduleSource: `Module: ${mod.name}`,
                dataType: 'text',
                sampleValue: f.defaultValue || `Sample ${f.label || f.name}`
              });
            }
          });
        }
      });
    }
    return fields;
  }, [modules]);

  // Handle title & content edit
  const handleTitleChange = (val: string) => {
    setDocTitle(val);
    setIsSaved(false);
  };

  const handleContentChange = (val: string) => {
    setDocContent(val);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (!documentItem) return;

    const currentHtml = (editorRef.current && !isPreviewMerged) ? editorRef.current.innerHTML : docContent;

    // If location is already known, save directly without prompting for target folder
    if (documentItem.driveType) {
      try {
        const updated = DriveService.saveDocument(
          documentItem.id,
          docTitle.trim() || 'Untitled Document',
          currentHtml,
          documentItem.driveType,
          documentItem.parentId
        );
        setDocumentItem({ ...updated });
        setDocContent(currentHtml);
        setIsSaved(true);
        toast.success(`✓ Document saved`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to save document');
      }
    } else {
      setIsDrivePickerOpen(true);
    }
  };

  // Handle save/move to drive folder
  const handleSelectDriveFolder = (driveType: DriveType, folderId: string | null, folderName: string) => {
    if (!documentItem) return;
    const currentHtml = (editorRef.current && !isPreviewMerged) ? editorRef.current.innerHTML : docContent;
    try {
      const updated = DriveService.saveDocument(
        documentItem.id,
        docTitle.trim() || 'Untitled Document',
        currentHtml,
        driveType,
        folderId
      );
      setDocumentItem({ ...updated });
      setDocContent(currentHtml);
      setIsSaved(true);
      toast.success(`Saved document to ${folderName} (${driveType === 'PERSONAL' ? 'My Drive' : 'Tenant Shared Drive'})`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document');
    }
  };


  const handleDeleteDocument = async () => {
    if (!documentItem) return;
    if (documentItem.recordsMetadata.isLegalHold) {
      toast.error(`Cannot delete "${documentItem.name}": Immutable Legal Hold is active.`);
      return;
    }
    try {
      DriveService.softDeleteItem(documentItem.id);
      await sendToGlobalRecyclingBin(documentItem, tenant?.id, user?.email, session?.access_token);
      toast.success(`Moved "${documentItem.name}" to global Recycling Bin`);
      navigate('/workspace/apps/docs');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };


  // Insert formatting tag into document HTML
  const formatDoc = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  };

  // Insert Merge Field Token
  const insertMergeToken = (token: string) => {
    formatDoc('insertHTML', `<span class="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold text-xs select-all">${token}</span> `);
    toast.success(`Inserted ${token}`);
  };



  const handleToggleLegalHold = () => {
    if (!documentItem) return;
    try {
      const updated = DriveService.toggleLegalHold(documentItem.id, legalHoldReason);
      if (updated) {
        setDocumentItem({ ...updated });
        setIsLegalHoldModalOpen(false);
        setLegalHoldReason('');
        toast.success(updated.recordsMetadata.isLegalHold ? 'Legal Hold Applied' : 'Legal Hold Released');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle legal hold');
    }
  };

  const handleUpdateClassification = (classification: DocumentClassification) => {
    if (!documentItem) return;
    const updated = DriveService.updateRecordsMetadata(documentItem.id, classification, documentItem.recordsMetadata.retentionScheduleId);
    if (updated) {
      setDocumentItem({ ...updated });
      toast.success(`Classification set to ${classification}`);
    }
  };

  const handleUpdateSchedule = (scheduleId: string) => {
    if (!documentItem) return;
    const updated = DriveService.updateRecordsMetadata(documentItem.id, documentItem.recordsMetadata.classification, scheduleId);
    if (updated) {
      setDocumentItem({ ...updated });
      toast.success('Disposal schedule updated');
    }
  };

  const folderPath = useMemo(() => {
    if (!documentItem) return '';
    const rootName = documentItem.driveType === 'PERSONAL' ? 'My Drive' : 'Tenant Shared Drive';
    if (!documentItem.parentId) return rootName;

    const stack: string[] = [];
    let curr: string | null = documentItem.parentId;
    while (curr) {
      const parentFolder = DriveService.getItemById(curr);
      if (parentFolder) {
        stack.unshift(parentFolder.name);
        curr = parentFolder.parentId;
      } else {
        break;
      }
    }
    return [rootName, ...stack].join(' › ');
  }, [documentItem]);

  const displayedContent = isPreviewMerged 
    ? DriveService.evaluateMergeFields(docContent)
    : docContent;

  if (!documentItem) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative">

      {/* Top Header Bar */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl flex items-center justify-between shrink-0 z-20 shadow-sm">
        
        {/* Left: Back & Document Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workspace/apps/docs')}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Back to Documents"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={documentItem.recordsMetadata.isLegalHold}
                className="text-sm font-bold text-zinc-900 dark:text-white bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 transition-colors"
              />
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1",
                isSaved ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              )}>
                {isSaved ? "Saved" : "Unsaved Changes"}
              </span>
            </div>

            {/* Folder Location & Record Number Bar */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 px-1 mt-0.5">
              <button
                onClick={() => setIsDrivePickerOpen(true)}
                className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors group cursor-pointer"
                title="Click to change folder location"
              >
                <FolderUp size={12} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-2">{folderPath}</span>
              </button>
              <span>•</span>
              <span className="font-mono text-[10px] text-zinc-400">{documentItem.recordsMetadata.recordNumber}</span>
            </div>
          </div>
        </div>



        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Save to Drive / Folder selector */}
          <button
            onClick={() => setIsDrivePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-200 dark:border-zinc-800"
          >
            <FolderUp size={14} className="text-amber-500" />
            Move / Drive Folder
          </button>

          {/* Merge Field Drawer Button */}
          <button
            onClick={() => setIsMergeFieldDrawerOpen(!isMergeFieldDrawerOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border",
              isMergeFieldDrawerOpen
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <Sparkles size={14} className="text-indigo-500" />
            Merge Fields
          </button>

          {/* Preview Merged Record Toggle */}
          <button
            onClick={() => setIsPreviewMerged(!isPreviewMerged)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border",
              isPreviewMerged
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            {isPreviewMerged ? <Eye size={14} /> : <EyeOff size={14} />}
            {isPreviewMerged ? "Previewing Merged Data" : "Template View"}
          </button>

          {/* Governance & Records Panel */}
          <button
            onClick={() => setIsGovernanceDrawerOpen(!isGovernanceDrawerOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border",
              isGovernanceDrawerOpen
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <ShieldCheck size={14} className="text-amber-500" />
            Governance
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl shadow-lg transition-all",
              isSaved
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
            )}
          >
            <Save size={14} />
            Save Document
          </button>

          {/* Delete to Global Recycling Bin */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
            title="Delete to Global Recycling Bin"
          >
            <Trash2 size={16} />
          </button>

        </div>
      </div>


      {/* Formatting Toolbar */}
      <div className="px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/40 backdrop-blur-md flex items-center gap-1 overflow-x-auto shrink-0 z-10 text-xs">
        <button onClick={() => formatDoc('formatBlock', '<h1>')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded font-bold" title="Heading 1"><Heading1 size={16} /></button>
        <button onClick={() => formatDoc('formatBlock', '<h2>')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded font-bold" title="Heading 2"><Heading2 size={16} /></button>
        <button onClick={() => formatDoc('formatBlock', '<p>')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-[11px] font-bold px-2">Paragraph</button>

        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        <button onClick={() => formatDoc('bold')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Bold"><Bold size={16} /></button>
        <button onClick={() => formatDoc('italic')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Italic"><Italic size={16} /></button>
        <button onClick={() => formatDoc('underline')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Underline"><Underline size={16} /></button>
        <button onClick={() => formatDoc('strikeThrough')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Strikethrough"><Strikethrough size={16} /></button>

        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        <button onClick={() => formatDoc('justifyLeft')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Align Left"><AlignLeft size={16} /></button>
        <button onClick={() => formatDoc('justifyCenter')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Align Center"><AlignCenter size={16} /></button>
        <button onClick={() => formatDoc('justifyRight')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Align Right"><AlignRight size={16} /></button>

        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

        <button onClick={() => formatDoc('insertUnorderedList')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Bullet List"><List size={16} /></button>
        <button onClick={() => formatDoc('insertOrderedList')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Numbered List"><ListOrdered size={16} /></button>
        <button onClick={() => formatDoc('formatBlock', '<blockquote>')} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded" title="Quote"><Quote size={16} /></button>
      </div>

      {/* Main Canvas & Side Panels Workspace */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex justify-center custom-scrollbar">
          <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-10 lg:p-16 min-h-[85vh] text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed text-sm space-y-4">
            
            {/* Legal Hold Alert Banner */}
            {documentItem.recordsMetadata.isLegalHold && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 mb-6">
                <div className="flex items-center gap-2 font-bold">
                  <Lock size={16} />
                  Immutable Legal Hold Active
                </div>
                <span className="text-[10px] text-rose-500">Reason: {documentItem.recordsMetadata.legalHoldReason}</span>
              </div>
            )}

            {/* Editable Content Canvas / Merged Preview Canvas */}
            {isPreviewMerged ? (
              <div 
                className="prose dark:prose-invert max-w-none space-y-4 font-sans text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: displayedContent }}
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable={!documentItem.recordsMetadata.isLegalHold}
                onInput={() => editorRef.current && handleContentChange(editorRef.current.innerHTML)}
                className="outline-none focus:outline-none min-h-[70vh] prose dark:prose-invert max-w-none space-y-4 font-sans text-sm text-zinc-900 dark:text-zinc-100"
              />
            )}

          </div>
        </div>

        {/* MERGE FIELD PICKER DRAWER */}
        <AnimatePresence>
          {isMergeFieldDrawerOpen && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 shadow-2xl z-20"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Module Merge Fields</h3>
                </div>
                <button onClick={() => setIsMergeFieldDrawerOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/10 border-b border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300">
                Click any field below to insert standard dynamic variables into your document template.
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {allMergeFields.map(field => (
                  <div
                    key={field.id}
                    onClick={() => insertMergeToken(field.token)}
                    className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 rounded-xl hover:border-indigo-500/40 cursor-pointer transition-colors space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {field.label}
                      </span>
                      <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                        {field.dataType}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">{field.token}</p>
                    <p className="text-[9px] text-zinc-400 italic">Sample: "{field.sampleValue}"</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* GOVERNANCE & RECORDS DRAWER */}
        <AnimatePresence>
          {isGovernanceDrawerOpen && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 shadow-2xl z-20"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-500" />
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Records & Governance</h3>
                </div>
                <button onClick={() => setIsGovernanceDrawerOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs custom-scrollbar">
                {/* Legal Hold Card */}
                <div className={cn(
                  "p-4 rounded-2xl border space-y-2",
                  documentItem.recordsMetadata.isLegalHold ? "bg-rose-500/10 border-rose-500/30" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Lock size={14} className={documentItem.recordsMetadata.isLegalHold ? "text-rose-500" : "text-zinc-400"} />
                      Legal Hold Freeze
                    </span>
                    <button
                      onClick={() => setIsLegalHoldModalOpen(true)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                        documentItem.recordsMetadata.isLegalHold ? "bg-rose-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {documentItem.recordsMetadata.isLegalHold ? "Release" : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Classification */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Document Classification</label>
                  <select
                    value={documentItem.recordsMetadata.classification}
                    onChange={(e) => handleUpdateClassification(e.target.value as DocumentClassification)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>

                {/* Disposal Schedule */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Disposal Schedule</label>
                  <select
                    value={documentItem.recordsMetadata.retentionScheduleId || ''}
                    onChange={(e) => handleUpdateSchedule(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">Select Compliance Schedule...</option>
                    {DEFAULT_DISPOSAL_SCHEDULES.map(ds => (
                      <option key={ds.id} value={ds.id}>{ds.name} ({ds.durationLabel})</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* DRIVE PICKER MODAL */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFolder={handleSelectDriveFolder}
        initialDriveType={documentItem.driveType}
        initialFolderId={documentItem.parentId}
        title="Move Document to Drive Folder"
        confirmLabel="Move Here"
      />


      {/* LEGAL HOLD MODAL */}
      {isLegalHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {documentItem.recordsMetadata.isLegalHold ? "Release Legal Hold" : "Apply Immutable Legal Hold"}
            </h3>
            {!documentItem.recordsMetadata.isLegalHold && (
              <input
                type="text"
                placeholder="Reason / Case Reference..."
                value={legalHoldReason}
                onChange={(e) => setLegalHoldReason(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsLegalHoldModalOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                Cancel
              </button>
              <button
                onClick={handleToggleLegalHold}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-500"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Aurora Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        item={documentItem}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDocument}
      />
    </div>
  );
};


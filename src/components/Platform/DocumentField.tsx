import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Trash2, 
  Eye, 
  Download, 
  Sparkles, 
  Lock, 
  Loader2,
  FolderLock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { DocumentClientService } from '../../services/documentClientService';
import { UniversalDocument, AiExtractionResult } from '../../types/document';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { useAIFeatures } from '../../hooks/useAIFeatures';

interface DocumentFieldProps {
  field: any;
  value: any;
  onChange: (value: any, rawDoc?: any) => void;
  readonly?: boolean;
  recordData?: any;
  allFields?: any[];
  onAutoFillRecord?: (extracted: Record<string, any>) => void;
  moduleId?: string;
  recordId?: string;
}

export const DocumentField: React.FC<DocumentFieldProps> = ({
  field,
  value,
  onChange,
  readonly = false,
  allFields = [],
  onAutoFillRecord,
  moduleId,
  recordId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docData, setDocData] = useState<UniversalDocument | null>(null);
  const [aiExtraction, setAiExtraction] = useState<AiExtractionResult | null>(null);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [driveDocs, setDriveDocs] = useState<UniversalDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAIFeatureEnabled } = useAIFeatures();
  const isMagicPopulateEnabled = isAIFeatureEnabled('ai:document_magic_populate');

  // If value is a documentId or URL, try to load its metadata
  useEffect(() => {
    let isMounted = true;
    if (value && typeof value === 'string' && value.startsWith('doc_')) {
      DocumentClientService.getDocumentById(value)
        .then(doc => {
          if (isMounted) setDocData(doc);
        })
        .catch(() => {
          // If fail to fetch full doc, fallback to minimal stub
          if (isMounted) {
            setDocData({
              id: value,
              tenantId: '',
              name: 'Attached Document',
              originalFilename: 'document.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 0,
              storageProvider: 'local',
              storagePath: '',
              classification: 'INTERNAL',
              documentType: 'GENERAL',
              isLegalHold: false,
              isWormLocked: false,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
    } else if (value && typeof value === 'object' && value.id) {
      setDocData(value);
    } else if (!value) {
      setDocData(null);
    }
    return () => { isMounted = false; };
  }, [value]);

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setAiExtraction(null);

      // Target fields from allFields to give Gemini context for auto-fill
      const targetFields = allFields
        .filter(f => f.id !== field.id && !['heading', 'divider', 'alert', 'button'].includes(f.type))
        .map(f => ({ id: f.id, label: f.label || f.name || f.id, type: f.type }));

      const result = await DocumentClientService.uploadDocument({
        file,
        moduleId,
        recordId,
        fieldId: field.id,
        classification: field.defaultClassification || 'INTERNAL',
        documentType: field.documentType || 'GENERAL',
        retentionScheduleId: field.retentionScheduleId,
        analyzeWithAi: true,
        targetFields
      });

      setDocData(result.document);
      onChange(result.document.id, result.document);

      if (result.aiExtraction) {
        setAiExtraction(result.aiExtraction);
        const matchCount = Object.keys(result.aiExtraction.extractedFields || {}).length;
        if (matchCount > 0) {
          toast.success(`AI analyzed document: Found ${matchCount} matching fields!`, {
            description: result.aiExtraction.summary
          });
        } else {
          toast.success('Document uploaded and classified successfully.');
        }
      } else {
        toast.success('Document uploaded successfully.');
      }
    } catch (err: any) {
      console.error('[DocumentField] Upload error:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (readonly || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyAutoFill = () => {
    if (!aiExtraction?.extractedFields || !onAutoFillRecord) return;
    onAutoFillRecord(aiExtraction.extractedFields);
    toast.success('Auto-filled record fields from document!');
    setAiExtraction(null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readonly) return;
    if (docData?.isLegalHold) {
      toast.error('Cannot remove document: Active Legal Hold is enforced.');
      return;
    }
    setDocData(null);
    setAiExtraction(null);
    onChange('', null);
    toast.info('Document removed from field.');
  };

  const getFileIcon = (mimeType: string = '', filename: string = '') => {
    if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(filename)) {
      return <ImageIcon size={20} className="text-emerald-500 shrink-0" />;
    }
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      return <FileText size={20} className="text-rose-500 shrink-0" />;
    }
    return <FileCode size={20} className="text-indigo-500 shrink-0" />;
  };

  const getClassificationBadge = (cls: string = 'INTERNAL') => {
    switch (cls) {
      case 'RESTRICTED':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">Restricted</span>;
      case 'CONFIDENTIAL':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">Confidential</span>;
      case 'PUBLIC':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Public</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">Internal</span>;
    }
  };

  // If there's an attached document
  if (docData) {
    const streamUrl = `${API_BASE_URL}/api/documents/stream/${docData.id}`;
    const isImage = docData.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(docData.originalFilename || docData.name);

    return (
      <div className="w-full space-y-2">
        <div className="group relative flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/40 transition-all shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
              {isImage ? (
                <img src={streamUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                getFileIcon(docData.mimeType, docData.originalFilename || docData.name)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={docData.name}>
                  {docData.originalFilename || docData.name}
                </p>
                {getClassificationBadge(docData.classification)}
                {docData.isLegalHold && (
                  <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <Lock size={10} /> Hold
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{(docData.sizeBytes / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>v{docData.versions?.length || 1}</span>
                {docData.retentionExpiryDate && (
                  <>
                    <span>•</span>
                    <span>Retained until {docData.retentionExpiryDate.split('T')[0]}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
              title="Open / Preview"
            >
              <Eye size={14} />
            </a>
            <a
              href={streamUrl}
              download={docData.originalFilename || docData.name}
              className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
              title="Download File"
            >
              <Download size={14} />
            </a>
            {!readonly && !docData.isLegalHold && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Remove Document"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* AI Magic Populate Banner */}
        <AnimatePresence>
          {isMagicPopulateEnabled && aiExtraction && Object.keys(aiExtraction.extractedFields || {}).length > 0 && onAutoFillRecord && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={14} className="text-indigo-500 shrink-0 animate-pulse" />
                <span className="text-indigo-950 dark:text-indigo-200 truncate font-medium">
                  AI extracted {Object.keys(aiExtraction.extractedFields).length} matching values from this document
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyAutoFill}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <Sparkles size={11} /> Auto-Fill Fields
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Empty dropzone state
  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        disabled={readonly || isUploading}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); if (!readonly) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => { if (!readonly && !isUploading) fileInputRef.current?.click(); }}
        className={cn(
          "w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center",
          isDragging
            ? "border-indigo-500 bg-indigo-500/5 scale-[0.99]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-zinc-50/50 dark:bg-zinc-900/30",
          readonly && "pointer-events-none opacity-60"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 size={24} className="text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-zinc-500">Uploading & running AI analysis...</span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                Click to upload or drag & drop
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                PDF, images, spreadsheets, or documents • Auto-classified with OCR
              </p>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDrivePickerOpen(true);
                  DocumentClientService.searchDocuments().then(setDriveDocs);
                }}
                className="mt-1 px-3 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <FolderLock size={12} className="text-indigo-500" />
                Select from Aurora Drive
              </button>
            )}
          </>
        )}
      </div>

      {/* Drive Document Picker Modal */}
      <AnimatePresence>
        {isDrivePickerOpen && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrivePickerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <FolderLock size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Select Document from Aurora Drive
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrivePickerOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 space-y-1">
                {driveDocs.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-8">No documents found in Drive.</p>
                ) : (
                  driveDocs.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDocData(d);
                        onChange(d.id, d);
                        setIsDrivePickerOpen(false);
                        toast.success(`Attached "${d.originalFilename || d.name}" from Aurora Drive.`);
                      }}
                      className="w-full text-left p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-500">
                            {d.originalFilename || d.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {d.documentType} • {(d.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        Attach
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

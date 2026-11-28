import React, { useState, useRef } from 'react';
import {
  Paperclip,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FileText,
  BookOpen,
  HardDrive,
  Globe,
  BarChart2,
  Loader2,
} from 'lucide-react';
import { ContextSource } from '../../../types/solutions';
import { AddContextSourceModal } from '../../Modals/AddContextSourceModal';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface CollapsibleSourcesTrayProps {
  sources: ContextSource[];
  onAddSource: (source: ContextSource) => void;
  onRemoveSource: (id: string) => void;
}

export const CollapsibleSourcesTray: React.FC<CollapsibleSourcesTrayProps> = ({
  sources,
  onAddSource,
  onRemoveSource,
}) => {
  const { tenant } = usePlatform();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ingestingCount, setIngestingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, i) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: ContextSource['type'] = 'other';
      if (ext === 'docx' || ext === 'doc') type = 'docx';
      else if (ext === 'pdf') type = 'pdf';
      else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') type = 'png';
      else if (ext === 'txt' || ext === 'md' || ext === 'csv') type = 'txt';
      else if (ext === 'json') type = 'json';

      const sizeLabel = `${Math.max(1, Math.round(file.size / 1024))} KB`;

      // Base64 adds ~33% overhead against the 10MB JSON body limit
      if (file.size > 7 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large (${Math.round(file.size / (1024 * 1024))} MB). Please upload files under 7 MB.`);
        return;
      }

      const reader = new FileReader();

      setIngestingCount((c) => c + 1);

      reader.onerror = () => {
        setIngestingCount((c) => Math.max(0, c - 1));
        toast.error(`Could not read "${file.name}".`);
      };

      reader.onabort = () => {
        setIngestingCount((c) => Math.max(0, c - 1));
      };

      reader.onload = async (event) => {
        const dataUrl = (event.target?.result as string) || '';
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
        try {
          let token = '';
          try {
            const { data } = await supabase.auth.getSession();
            token = data?.session?.access_token || '';
          } catch (_) {}

          const tenantId = tenant?.id || localStorage.getItem('aurora_active_tenant_id') || 'default-tenant';

          const res = await fetch(`${API_BASE_URL}/api/solutions/ingest-source`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': tenantId,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64Data: dataUrl,
            }),
          });

          if (res.ok) {
            const ingested = await res.json();
            onAddSource({
              id: `src_${Date.now()}_${i}`,
              name: file.name,
              type,
              size: sizeLabel,
              uploadedAt: 'Just now',
              status: 'PROCESSED',
              contentSummary: ingested.contentSummary || `Extracted: ${file.name}`,
              rawText: ingested.rawText || '',
              sourceOrigin: 'LOCAL_FILE',
            });
            toast.success(`Extracted & indexed "${file.name}"`);
          } else {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody?.error || `Extraction failed (HTTP ${res.status})`);
          }
        } catch (err: any) {
          const isTimeout = err?.name === 'AbortError';
          const errMsg = isTimeout
            ? `Extraction timed out for "${file.name}" — try a smaller PDF or split it.`
            : err?.message || `Failed to extract "${file.name}"`;
          // Safe fallback for plain text/csv/json only (never raw binary PDF/DOCX garbage)
          const isPlainText = ['txt', 'md', 'csv', 'json'].includes(ext);
          const fallbackText = isPlainText ? atob(dataUrl.split(',')[1] || '').slice(0, 12000) : '';
          onAddSource({
            id: `src_${Date.now()}_${i}`,
            name: file.name,
            type,
            size: sizeLabel,
            uploadedAt: 'Just now',
            status: fallbackText ? 'PROCESSED' : 'ERROR',
            contentSummary: fallbackText
              ? `Attached text file: ${file.name}`
              : errMsg,
            rawText: fallbackText,
            sourceOrigin: 'LOCAL_FILE',
          });
          if (fallbackText) {
            toast.info(`Attached "${file.name}"`);
          } else {
            toast.error(errMsg);
          }
        } finally {
          window.clearTimeout(timeoutId);
          setIngestingCount((c) => Math.max(0, c - 1));
        }
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderSourceIcon = (src: ContextSource) => {
    if (src.sourceOrigin === 'KNOWLEDGE_BASE') return <BookOpen size={13} className="text-purple-500" />;
    if (src.sourceOrigin === 'DRIVE') return <HardDrive size={13} className="text-teal-500" />;
    if (src.sourceOrigin === 'WEBSITE') return <Globe size={13} className="text-sky-500" />;
    if (src.sourceOrigin === 'REPORT' || src.sourceOrigin === 'APP') return <BarChart2 size={13} className="text-indigo-500" />;
    return <FileText size={13} className="text-zinc-500 dark:text-zinc-400" />;
  };

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.csv"
        onChange={(e) => handleLocalFiles(e.target.files)}
        className="hidden"
      />

      <AddContextSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLocalFiles={(files) => handleLocalFiles(files)}
        onAddContextSource={onAddSource}
      />

      {/* Compact Collapsible Trigger Row */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 min-w-0">
            {ingestingCount > 0 ? (
              <Loader2 size={13} className="text-indigo-500 animate-spin shrink-0" />
            ) : (
              <Paperclip size={13} className="text-zinc-400 shrink-0" />
            )}
            <span className="truncate">
              {ingestingCount > 0
                ? `Extracting ${ingestingCount} file(s)...`
                : sources.length === 0
                ? 'Sources (0)'
                : `${sources.length} ${sources.length === 1 ? 'Source' : 'Sources'}`}
            </span>
          </span>
          {isExpanded ? (
            <ChevronUp size={14} className="text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-zinc-400 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          title="Upload SOPs, PDFs, spreadsheets, or link Drive / KB"
        >
          <Plus size={13} />
          <span>Add</span>
        </button>
      </div>

      {/* Expandable Sources List */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {sources.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-3 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500/60 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-center"
            >
              Attach PDFs, DOCX SOPs, CSV spreadsheets, or wireframe images
            </button>
          ) : (
            sources.map((src) => (
              <div
                key={src.id}
                className={cn(
                  'group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">{renderSourceIcon(src)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate" title={src.name}>
                      {src.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {src.size} · {src.contentSummary || src.uploadedAt}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSource(src.id)}
                  className="p-1 rounded-md text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                  title="Remove source"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

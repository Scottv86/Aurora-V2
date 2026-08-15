import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Plus, 
  Trash2, 
  FileCheck,
  BookOpen,
  HardDrive,
  BarChart2,
  Search,
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCircle2,
  PanelLeftClose,
  Globe
} from 'lucide-react';

import { ContextSource } from '../../../types/solutions';

import { AddContextSourceModal } from '../../Modals/AddContextSourceModal';
import { toast } from 'sonner';

export interface ContextInputsPanelProps {
  sources: ContextSource[];
  onAddSource: (file: ContextSource) => void;
  onRemoveSource: (id: string) => void;
  onToggleCollapse?: () => void;
}

export const ContextInputsPanel: React.FC<ContextInputsPanelProps> = ({
  sources,
  onAddSource,
  onRemoveSource,
  onToggleCollapse
}) => {

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSource = sources.find(s => s.id === selectedSourceId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, i) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: ContextSource['type'] = 'other';
      if (ext === 'docx' || ext === 'doc') type = 'docx';
      else if (ext === 'pdf') type = 'pdf';
      else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') type = 'png';
      else if (ext === 'txt' || ext === 'md') type = 'txt';
      else if (ext === 'json') type = 'json';

      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = (event.target?.result as string) || '';
        const newSource: ContextSource = {
          id: `src_${Date.now()}_${i}`,
          name: file.name,
          type,
          size: `${Math.round(file.size / 1024)} KB`,
          uploadedAt: 'Just now',
          status: 'PROCESSED',
          contentSummary: `Uploaded context specification: ${file.name}`,
          rawText: textContent.slice(0, 5000),
          sourceOrigin: 'LOCAL_FILE'
        };
        onAddSource(newSource);
      };

      if (type === 'png') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    toast.success(`${files.length} context document(s) uploaded and indexed.`);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getSourceIcon = (src: ContextSource, isCompact = true) => {
    const size = isCompact ? 14 : 18;
    const boxClass = isCompact 
      ? "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs" 
      : "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs";

    if (src.sourceOrigin === 'KNOWLEDGE_BASE') {
      return <div className={`${boxClass} bg-purple-500/10 text-purple-500 border border-purple-500/20`}><BookOpen size={size} /></div>;
    }
    if (src.sourceOrigin === 'DRIVE') {
      return <div className={`${boxClass} bg-teal-500/10 text-teal-500 border border-teal-500/20`}><HardDrive size={size} /></div>;
    }
    if (src.sourceOrigin === 'REPORT' || src.sourceOrigin === 'APP') {
      return <div className={`${boxClass} bg-indigo-500/10 text-indigo-500 border border-indigo-500/20`}><BarChart2 size={size} /></div>;
    }
    if (src.sourceOrigin === 'WEBSITE') {
      return <div className={`${boxClass} bg-sky-500/10 text-sky-500 border border-sky-500/20`}><Globe size={size} /></div>;
    }

    switch (src.type) {
      case 'docx':
        return <div className={`${boxClass} bg-blue-500/10 text-blue-500 border border-blue-500/20`}><FileText size={size} /></div>;
      case 'pdf':
        return <div className={`${boxClass} bg-rose-500/10 text-rose-500 border border-rose-500/20`}><FileCheck size={size} /></div>;
      case 'png':
        return <div className={`${boxClass} bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}><ImageIcon size={size} /></div>;
      case 'json':
      case 'txt':
        return <div className={`${boxClass} bg-amber-500/10 text-amber-500 border border-amber-500/20`}><FileCode size={size} /></div>;
      default:
        return <div className={`${boxClass} bg-indigo-500/10 text-indigo-500 border border-indigo-500/20`}><FileText size={size} /></div>;
    }
  };

  const getOriginBadge = (src: ContextSource) => {
    switch (src.sourceOrigin) {
      case 'KNOWLEDGE_BASE':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-500 uppercase shrink-0">KB</span>;
      case 'DRIVE':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-teal-500/10 text-teal-500 uppercase shrink-0">Drive</span>;
      case 'REPORT':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-500 uppercase shrink-0">Report</span>;
      case 'APP':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-500 uppercase shrink-0">App</span>;
      case 'WEBSITE':
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-sky-500/10 text-sky-500 uppercase shrink-0">Web</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase shrink-0">File</span>;
    }
  };


  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Document text copied to clipboard.');
  };

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.sourceOrigin && s.sourceOrigin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-none p-5 space-y-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.txt,.md,.json"
      />

      {/* Add Context Source Modal */}
      <AddContextSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLocalFiles={(files) => {
          const fakeEvent = { target: { files } } as any;
          handleFileUpload(fakeEvent);
        }}
        onAddContextSource={onAddSource}
      />

      {selectedSource ? (
        /* Document Previewer View inside Context & Inputs Pane */
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {/* Document Preview Header */}
          <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/80 pb-3 shrink-0">
            <button
              onClick={() => setSelectedSourceId(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Sources</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopyText(selectedSource.rawText || selectedSource.contentSummary || selectedSource.name)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy Document Text"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => {
                  onRemoveSource(selectedSource.id);
                  setSelectedSourceId(null);
                }}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Remove Document Source"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Document Overview Badge */}
          <div className="flex items-start gap-3 p-3 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shrink-0">
            {getSourceIcon(selectedSource, false)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={selectedSource.name}>
                  {selectedSource.name}
                </h4>
                {getOriginBadge(selectedSource)}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                <span>{selectedSource.size}</span>
                <span>•</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Grounded in AI Context
                </span>
              </div>
            </div>
          </div>

          {/* Document Content Text Reader */}
          <div className="flex-1 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl bg-zinc-950/90 text-zinc-200 p-4 font-mono text-xs overflow-y-auto custom-scrollbar leading-relaxed space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-[10px] text-zinc-400 font-sans font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1 text-indigo-400">
                <Sparkles size={12} /> Live Ingested Content Stream
              </span>
              <span>{selectedSource.type.toUpperCase()} SPECIFICATION</span>
            </div>

            <div className="whitespace-pre-wrap text-zinc-300 text-[11px] leading-relaxed">
              {selectedSource.rawText || selectedSource.contentSummary || (
                `# Document Specification: ${selectedSource.name}\n\n` +
                `- Source Origin: ${selectedSource.sourceOrigin || 'LOCAL_FILE'}\n` +
                `- File Size: ${selectedSource.size}\n` +
                `- Indexed Status: ${selectedSource.status}\n\n` +
                `## Architectural Context & Requirements\n\n` +
                `This document specification provides functional context for building dynamic forms, ` +
                `SLA escalation rules, and data structures within this Solution Blueprint.\n\n` +
                `The AI Orchestrator uses this grounded text to evaluate field validations and workflow escalation triggers.`
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Source List & Grid Selection View */
        <>
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Context</span>
                <span className="text-[10px] text-zinc-400 font-bold">({sources.length})</span>
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Add new context source"
              >
                <Plus size={13} />
                <span>Add Source</span>
              </button>

              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Collapse Left Pane (Sidebar Mode)"
                >
                  <PanelLeftClose size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search context sources..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Uploaded Sources Section (High-Density List Only) */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            {filteredSources.length === 0 ? (
              <div className="flex-1 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                <BookOpen size={24} className="text-zinc-400 mb-2 opacity-50" />
                <p className="text-xs text-zinc-500 font-medium">No context sources match search.</p>
              </div>
            ) : (
              /* Dense High-Capacity List View */
              <div className="flex-1 overflow-y-auto space-y-1.5 p-0.5 custom-scrollbar">
                {filteredSources.map((src) => (
                  <div
                    key={src.id}
                    onClick={() => setSelectedSourceId(src.id)}
                    className="group p-2 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 rounded-xl transition-all shadow-xs flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getSourceIcon(src, true)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={src.name}>
                            {src.name}
                          </h4>
                          {getOriginBadge(src)}
                        </div>
                        <span className="text-[9.5px] text-zinc-400 font-medium block leading-none mt-0.5">
                          {src.size} • <span className="text-emerald-500 font-semibold">Active</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSource(src.id);
                      }}
                      className="p-1 rounded-lg bg-zinc-100 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                      title="Remove source"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};




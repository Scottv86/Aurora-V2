import React from 'react';
import { FileText, Download, CheckCircle, Clock, Eye, PenTool } from 'lucide-react';
import { toast } from 'sonner';

export interface DocumentPreviewProps {
  id: string;
  title: string;
  templateName?: string;
  version?: string;
  status: 'draft' | 'pending_signature' | 'completed';
  downloadUrl?: string;
  createdAt?: string;
}

export const DocumentPreviewCard: React.FC<DocumentPreviewProps> = ({
  id,
  title,
  templateName = 'Document Template',
  version = 'v1.0',
  status,
  downloadUrl
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs text-emerald-400 font-medium">
            <CheckCircle className="h-3 w-3" />
            Signed & Completed
          </span>
        );
      case 'pending_signature':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs text-amber-400 font-medium">
            <PenTool className="h-3 w-3" />
            Pending E-Signature
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-700/50 border border-slate-600/40 px-2.5 py-0.5 text-xs text-slate-300 font-medium">
            <Clock className="h-3 w-3" />
            Draft Preview
          </span>
        );
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/40">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-rose-500/10 p-2.5 text-rose-400 border border-rose-500/20">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">{templateName}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-indigo-300">{version}</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-100 mt-0.5">{title}</h4>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      {/* PDF Action Bar */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-1">
        <span className="text-[11px] text-slate-500 font-mono">ID: {id}</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info(`Opening preview for ${title}`)}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => downloadUrl ? window.open(downloadUrl, '_blank') : toast.success(`Downloading ${title}.pdf`)}
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-500 transition shadow"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

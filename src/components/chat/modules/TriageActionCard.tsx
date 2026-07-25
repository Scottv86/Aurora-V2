import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export interface TriageActionProps {
  id: string;
  title: string;
  category?: string;
  riskScore: number; // 0 to 100
  summary: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEscalate?: (id: string) => void;
}

export const TriageActionCard: React.FC<TriageActionProps> = ({
  id,
  title,
  category = 'Workflow Triage',
  riskScore,
  summary,
  onApprove,
  onReject,
  onEscalate
}) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'escalated' | null>(null);

  const getRiskColor = (score: number) => {
    if (score >= 75) return { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', label: 'High Risk' };
    if (score >= 40) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Medium Risk' };
    return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Low Risk' };
  };

  const risk = getRiskColor(riskScore);

  const handleAction = (type: 'approved' | 'rejected' | 'escalated') => {
    setDecision(type);
    if (type === 'approved') {
      toast.success(`Action item ${id} approved`);
      onApprove?.(id);
    } else if (type === 'rejected') {
      toast.error(`Action item ${id} rejected`);
      onReject?.(id);
    } else {
      toast.info(`Action item ${id} escalated`);
      onEscalate?.(id);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            {category}
          </span>
        </div>

        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${risk.bg} ${risk.border} ${risk.text}`}>
          {risk.label} ({riskScore}/100)
        </span>
      </div>

      {/* Content */}
      <div className="my-3">
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        <p className="mt-1 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Decision Buttons */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
        <span className="text-[11px] text-slate-500 font-mono">Ref: #{id}</span>

        {decision ? (
          <div className="text-xs font-semibold flex items-center gap-1.5 capitalize">
            {decision === 'approved' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Approved</span>}
            {decision === 'rejected' && <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Rejected</span>}
            {decision === 'escalated' && <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Escalated</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAction('rejected')}
              className="flex items-center gap-1 rounded-md border border-rose-900/50 bg-rose-950/40 px-2.5 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-900/60 hover:text-rose-100"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => handleAction('escalated')}
              className="flex items-center gap-1 rounded-md border border-amber-900/50 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-300 transition hover:bg-amber-900/60 hover:text-amber-100"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Escalate</span>
            </button>
            <button
              onClick={() => handleAction('approved')}
              className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

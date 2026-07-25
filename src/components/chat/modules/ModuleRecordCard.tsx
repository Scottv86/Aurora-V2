import React from 'react';
import { Layers, User, Calendar, Play, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export interface ModuleRecordData {
  id: string;
  moduleName: string;
  recordTitle: string;
  status?: string;
  statusColor?: string;
  fields: { label: string; value: string | number | boolean }[];
  updatedAt?: string;
  assignedTo?: string;
}

export interface ModuleRecordCardProps {
  data: ModuleRecordData;
  onOpenRecord?: (id: string) => void;
  onTriggerWorkflow?: (id: string) => void;
}

export const ModuleRecordCard: React.FC<ModuleRecordCardProps> = ({
  data,
  onOpenRecord,
  onTriggerWorkflow
}) => {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 shadow-lg backdrop-blur-md transition-all hover:border-indigo-500/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-400 border border-indigo-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              {data.moduleName}
            </span>
            <h4 className="text-sm font-semibold text-slate-100">{data.recordTitle}</h4>
          </div>
        </div>

        {data.status && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium border"
            style={{
              backgroundColor: `${data.statusColor || '#6366f1'}15`,
              borderColor: `${data.statusColor || '#6366f1'}40`,
              color: data.statusColor || '#a5b4fc'
            }}
          >
            {data.status}
          </span>
        )}
      </div>

      {/* Fields Grid */}
      <div className="my-3 grid grid-cols-2 gap-2.5 text-xs">
        {data.fields.map((f, idx) => (
          <div key={idx} className="rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
            <span className="text-[10px] font-medium text-slate-400 block">{f.label}</span>
            <span className="font-medium text-slate-200 truncate block mt-0.5">{String(f.value)}</span>
          </div>
        ))}
      </div>

      {/* Footer Info & Action Controls */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {data.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-500" />
              {data.assignedTo}
            </span>
          )}
          {data.updatedAt && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {data.updatedAt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTriggerWorkflow && (
            <button
              onClick={() => onTriggerWorkflow(data.id)}
              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <Play className="h-3 w-3 text-indigo-400" />
              <span>Run Action</span>
            </button>
          )}
          <button
            onClick={() => onOpenRecord ? onOpenRecord(data.id) : toast.info(`Opening record ${data.id}`)}
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 shadow"
          >
            <span>Open</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

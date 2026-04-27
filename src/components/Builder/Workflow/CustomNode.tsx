import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Settings2, Trash2, GitFork, Zap, Activity, Clock, Play, CircleDot, Mail, MessageSquare, RefreshCw, FileText, Globe, Sparkles as SparklesIcon, Bot } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WorkflowNodeType } from '../../../types/platform';

const iconMap: Record<WorkflowNodeType, any> = {
  START: Play,
  STATUS: Activity,
  DECISION: GitFork,
  ACTION: Zap,
  DELAY: Clock,
  END: CircleDot,
};

const actionIconMap: Record<string, any> = {
  EMAIL: Mail,
  SLACK: MessageSquare,
  UPDATE: RefreshCw,
  PDF: FileText,
  WEBHOOK: Globe,
  AI_SUMMARIZE: SparklesIcon,
  AI_AGENT: Bot,
};

export const CustomWorkflowNode = ({ data, id, selected }: any) => {
  let Icon = iconMap[data.type as WorkflowNodeType] || Activity;
  
  if (data.type === 'ACTION' && data.actionType && actionIconMap[data.actionType]) {
    Icon = actionIconMap[data.actionType];
  }

  const accentColor = 
    data.type === 'START' ? "indigo" :
    data.type === 'STATUS' ? "indigo" :
    data.type === 'DECISION' ? "amber" :
    data.type === 'ACTION' ? "emerald" :
    data.type === 'DELAY' ? "zinc" :
    data.type === 'END' ? "rose" : "zinc";

  const accentHex = {
    indigo: "#6366f1",
    amber: "#f59e0b",
    emerald: "#10b981",
    zinc: "#71717a",
    rose: "#f43f5e"
  }[accentColor as keyof typeof accentHex];
  
  return (
    <div className={cn(
      "group relative transition-all duration-500 flex items-center justify-center p-2",
      "min-w-[240px]"
    )}>
      {/* Selection UI */}
      {selected && (
        <div className="absolute -top-4 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          Selected
        </div>
      )}

      {/* Glass Container */}
      <div 
        className={cn(
          "absolute inset-1 rounded-[1.5rem] transition-all duration-500",
          "bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-2xl border border-white/10 dark:border-zinc-800/50",
          "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          selected ? "ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "hover:border-white/20"
        )}
      >
        {/* Accent Glow */}
        <div 
          className="absolute inset-0 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ 
            background: `radial-gradient(circle at 0% 0%, ${accentHex}15 0%, transparent 50%)`,
          }}
        />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full opacity-50"
          style={{ backgroundColor: accentHex }}
        />
      </div>

      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg" 
      />
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg" 
        style={{ left: '-2px' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg opacity-0" 
        style={{ left: '-2px' }}
      />

      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg" 
        style={{ right: '-2px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 !z-50 shadow-lg opacity-0" 
        style={{ right: '-2px' }}
      />

      {/* Node Content */}
      <div className={cn(
        "relative z-10 flex items-center gap-4 w-full px-6 py-5",
        "text-white"
      )}>
        {/* Floating Actions */}
        <div className={cn(
          "absolute -top-1 -right-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100",
          "z-50"
        )}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-500 shadow-xl"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className={cn(
          "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110",
          "bg-white/5 border border-white/10 text-white shadow-inner"
        )} style={{ color: accentHex }}>
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1 flex flex-col items-start text-left">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1",
          )}>
            {data.type === 'ACTION' ? data.actionType || 'Action' : data.type}
          </p>
          <h4 className={cn(
            "text-sm font-bold tracking-tight leading-snug truncate w-full",
          )}>
            {data.label}
          </h4>
        </div>
      </div>
    </div>
  );
};

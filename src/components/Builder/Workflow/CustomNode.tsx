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
  
  return (
    <div className={cn(
      "group relative transition-all duration-300 flex items-center justify-center p-2",
      data.type === 'DECISION' ? "w-[150px] h-[150px]" : "min-w-[200px]"
    )}>
      {/* Visual Shape Container */}
      <div 
        className={cn(
          "absolute inset-2 transition-all duration-300",
          // Standard Shape Logic
          data.type === 'START' || data.type === 'END' ? "rounded-full" : 
          data.type === 'DECISION' ? "" :
          "rounded-xl",

          // Selection Glow
          selected && "ring-2 ring-indigo-500 ring-offset-4 dark:ring-offset-black",

          // Type-specific Colors
          data.type === 'STATUS' && "bg-indigo-600 shadow-xl shadow-indigo-500/20",
          data.type === 'DECISION' && "bg-amber-500 shadow-xl shadow-amber-500/20",
          data.type === 'ACTION' && "bg-emerald-600 shadow-xl shadow-emerald-500/20",
          data.type === 'DELAY' && "bg-zinc-800 border border-zinc-700 shadow-xl",
          data.type === 'START' && "bg-white border border-zinc-200 shadow-xl",
          data.type === 'END' && "bg-rose-600 shadow-xl shadow-rose-500/20"
        )}
        style={data.type === 'DECISION' ? { 
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          width: 'calc(100% - 16px)',
          height: 'calc(100% - 16px)',
          left: '8px',
          top: '8px'
        } : {}}
      />

      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-4 !h-4 !bg-white !border-2 !border-indigo-500 !z-50 shadow-lg" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-4 !h-4 !bg-white !border-2 !border-indigo-500 !z-50 shadow-lg" 
      />
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        className="!w-4 !h-4 !bg-white !border-2 !border-amber-500 !z-50 shadow-lg" 
        style={{ left: data.type === 'DECISION' ? '2px' : '-2px' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        className="!w-4 !h-4 !bg-white !border-2 !border-amber-500 !z-50 shadow-lg opacity-0" 
        style={{ left: data.type === 'DECISION' ? '2px' : '-2px' }}
      />

      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        className="!w-4 !h-4 !bg-white !border-2 !border-amber-500 !z-50 shadow-lg" 
        style={{ right: data.type === 'DECISION' ? '2px' : '-2px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        className="!w-4 !h-4 !bg-white !border-2 !border-amber-500 !z-50 shadow-lg opacity-0" 
        style={{ right: data.type === 'DECISION' ? '2px' : '-2px' }}
      />

      {/* Node Content */}
      <div className={cn(
        "relative z-10 flex flex-col items-center gap-2 text-center w-full px-6 py-4",
        data.type === 'START' ? "text-zinc-900" : "text-white",
        data.type === 'DECISION' && "w-full h-full justify-center p-0"
      )}>
        {/* Floating Actions */}
        <div className={cn(
          "absolute -top-1 -right-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100",
          "z-50",
          data.type === 'DECISION' && "top-4 right-4"
        )}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-500 shadow-xl"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className={cn(
          "p-2.5 rounded-xl shrink-0",
          data.type === 'START' ? "bg-indigo-500/10 text-indigo-600" : "bg-white/10 text-white",
          data.type === 'DECISION' && "bg-transparent p-0 mb-1"
        )}>
          <Icon size={data.type === 'DECISION' ? 24 : 18} />
        </div>
        <div className="min-w-0">
          <h4 className={cn(
            "text-sm font-bold tracking-tight leading-snug truncate",
            data.type === 'DECISION' && "text-[10px] whitespace-normal line-clamp-2 px-6"
          )}>
            {data.label}
          </h4>
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.15em] mt-1 opacity-50",
          )}>
            {data.type}
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { NodeResizer } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import { Layout } from 'lucide-react';

export const CustomWorkflowZone = ({ data, selected, id }: any) => {
  const colorMap: Record<string, string> = {
    indigo: 'border-indigo-500/50 bg-indigo-500/5 text-indigo-500',
    emerald: 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500',
    amber: 'border-amber-500/50 bg-amber-500/5 text-amber-500',
    rose: 'border-rose-500/50 bg-rose-500/5 text-rose-500',
    violet: 'border-violet-500/50 bg-violet-500/5 text-violet-500',
    zinc: 'border-zinc-500/50 bg-zinc-500/5 text-zinc-500',
  };

  const accentColor = data.color || 'indigo';
  const colorClasses = colorMap[accentColor] || colorMap.indigo;

  return (
    <div className={cn(
      "h-full w-full rounded-[40px] transition-all duration-500",
      "border-2 border-dashed",
      colorClasses.split(' ')[0], // Border color
      colorClasses.split(' ')[1], // Background color
      selected && "ring-4 ring-indigo-500/10"
    )}>
      <NodeResizer 
        minWidth={300} 
        minHeight={200} 
        isVisible={selected} 
        lineClassName={cn("border-indigo-500", accentColor !== 'indigo' && `border-${accentColor}-500`)} 
        handleClassName="h-3 w-3 bg-white border-2 border-indigo-500 rounded-full"
      />
      
      {/* Zone Header */}
      <div className="absolute -top-10 left-0 flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
        <div className={cn(
          "p-1.5 rounded-lg text-white",
          `bg-${accentColor}-500`
        )}>
          <Layout size={12} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">
          {data.label || 'New Logical Zone'}
        </span>
      </div>

      {/* Decorative Corner Accents */}
      <div className={cn("absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 opacity-40 rounded-tl-2xl", `border-${accentColor}-500/20`)} />
      <div className={cn("absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 opacity-40 rounded-br-2xl", `border-${accentColor}-500/20`)} />
    </div>
  );
};



import React, { useState } from 'react';
import { Plus, Search, Layers, Mirror, ChevronRight, ExternalLink } from 'lucide-react';
import { useNestedRecords } from '../../hooks/useNestedRecords';
import { useModalStack } from '../../context/ModalStackContext';
import { cn } from '../../lib/utils';

interface RecursiveCollectionBlockProps {
  parentRecordId: string;
  moduleId: string; // The module of the children we want to show
  label: string;
}

export const RecursiveCollectionBlock: React.FC<RecursiveCollectionBlockProps> = ({ 
  parentRecordId, 
  moduleId,
  label
}) => {
  const { records, loading, refetch } = useNestedRecords(parentRecordId);
  const { pushModal } = useModalStack();
  const [isHovered, setIsHovered] = useState(false);

  // Filter records by moduleId if needed, but useNestedRecords already filters by association
  // which might include multiple modules. We should probably filter here.
  const filteredRecords = records.filter(r => r.moduleId === moduleId);

  return (
    <div 
      className="space-y-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <Layers size={14} />
          </div>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</h3>
          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[9px] font-bold text-zinc-400">
            {filteredRecords.length}
          </span>
        </div>
        <div className={cn("flex items-center gap-2 transition-opacity duration-300", isHovered ? "opacity-100" : "opacity-0")}>
           <button 
            onClick={() => {/* TODO: Implement Mirror/Search */}}
            className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
            title="Mirror Existing Record"
          >
            <Search size={14} />
          </button>
          <button 
            onClick={() => pushModal({ 
              moduleId, 
              type: 'edit', 
              title: `New ${label}` 
            })}
            className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
            title="Add New"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {loading ? (
          <div className="h-20 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
             <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => pushModal({ 
                moduleId: record.moduleId, 
                recordId: record.id, 
                type: 'view', 
                title: record.name || record.title || record.id 
              })}
              className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <Layers size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    {record.name || record.title || record.id}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{record.status || 'Active'}</span>
                    {record.path && (
                      <>
                        <span className="w-0.5 h-0.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        <span className="text-[9px] text-zinc-500 font-medium">{record.path}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={14} className="text-zinc-300 group-hover:text-indigo-500 transition-all transform group-hover:translate-x-0.5" />
            </button>
          ))
        ) : (
          <div className="p-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-[32px] text-center space-y-3">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto">
              <Layers size={20} className="text-zinc-300 dark:text-zinc-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">No Nested {label}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Add a new record or mirror an existing one.</p>
            </div>
            <button 
               onClick={() => pushModal({ moduleId, type: 'edit', title: `New ${label}` })}
               className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors uppercase tracking-widest"
            >
              Initialize
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

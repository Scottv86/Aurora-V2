import React, { useState } from 'react';
import { Plus, Search, Layers, ChevronRight, X } from 'lucide-react';
import { useNestedRecords } from '../../hooks/useNestedRecords';
import { useModalStack } from '../../context/ModalStackContext';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { toast } from 'sonner';
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
  const { tenant } = usePlatform();
  const { session } = useAuth();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showMirrorSearch, setShowMirrorSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allModuleRecords, setAllModuleRecords] = useState<any[]>([]);
  const [searchingRecords, setSearchingRecords] = useState(false);

  // Filter records by moduleId if needed
  const filteredRecords = records.filter(r => r.moduleId === moduleId);

  const fetchAvailableRecords = async () => {
    if (!tenant?.id || !moduleId) return;
    setSearchingRecords(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records?moduleId=${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out records that are already associated with this parent
        const unassociated = (data.records || []).filter(
          (r: any) => !records.some(ar => ar.id === r.id)
        );
        setAllModuleRecords(unassociated);
      }
    } catch (err) {
      console.error("Failed to fetch available records for mirroring:", err);
    } finally {
      setSearchingRecords(false);
    }
  };

  const handleLinkRecord = async (childRecord: any) => {
    if (!tenant?.id) return;
    
    // Get current associations or default to empty array
    const currentAssociations = childRecord.associations || [];
    
    // Add parent association
    const updatedAssociations = [...currentAssociations, { record_id: parentRecordId }];
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${childRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...childRecord,
          associations: updatedAssociations
        })
      });
      
      if (res.ok) {
        toast.success(`Successfully linked ${childRecord.name || childRecord.title || 'record'}`);
        setShowMirrorSearch(false);
        setSearchQuery('');
        refetch();
      } else {
        throw new Error("Failed to link record");
      }
    } catch (err: any) {
      toast.error(err.message || "Error linking record");
    }
  };

  const filteredAvailableRecords = allModuleRecords.filter(r => 
    (r.name || r.title || r.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className={cn("flex items-center gap-2 transition-opacity duration-300", (isHovered || showMirrorSearch) ? "opacity-100" : "opacity-0")}>
           <button 
            onClick={() => {
              setShowMirrorSearch(prev => !prev);
              if (!showMirrorSearch) {
                fetchAvailableRecords();
              }
            }}
            className={cn("p-1.5 rounded-lg transition-colors", showMirrorSearch ? "bg-indigo-500/10 text-indigo-500" : "text-zinc-400 hover:text-indigo-500")}
            title={showMirrorSearch ? "Close search panel" : "Mirror Existing Record"}
          >
            {showMirrorSearch ? <X size={14} /> : <Search size={14} />}
          </button>
          <button 
            onClick={() => pushModal({ 
              moduleId, 
              type: 'edit', 
              title: `New ${label}`,
              parentAssociation: { recordId: parentRecordId, moduleId: '' },
              onSave: () => {
                refetch();
              }
            })}
            className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
            title="Add New"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {showMirrorSearch && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search records to link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {searchingRecords ? (
              <div className="py-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                Searching...
              </div>
            ) : filteredAvailableRecords.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                No unlinked records found
              </div>
            ) : (
              filteredAvailableRecords.map(rec => (
                <button
                  key={rec.id}
                  onClick={() => handleLinkRecord(rec)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white dark:hover:bg-zinc-950 hover:text-indigo-500 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 flex items-center justify-between"
                >
                  <span className="font-semibold truncate">{rec.name || rec.title || rec.id}</span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest shrink-0 ml-2">Link</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

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
                title: record.name || record.title || record.id,
                onSave: () => {
                  refetch();
                }
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
               onClick={() => pushModal({ 
                 moduleId, 
                 type: 'edit', 
                 title: `New ${label}`,
                 parentAssociation: { recordId: parentRecordId, moduleId: '' },
                 onSave: () => {
                   refetch();
                 }
               })}
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

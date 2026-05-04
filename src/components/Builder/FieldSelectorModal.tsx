import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Type, 
  Hash, 
  Calendar, 
  CheckSquare, 
  Database, 
  AlignLeft,
  DollarSign,
  Clock,
  ListFilter,
  Radio,
  ToggleRight,
  Sliders,
  Star,
  Palette,
  Tag,
  Box,
  Layout,
  Layers,
  Zap,
  Sparkles,
  MousePointer2,
  FileText,
  Calculator,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Field, FieldType } from '../ModuleEditor';

interface FieldSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fieldId: string) => void;
  fields: Field[];
  title?: string;
  selectedFieldId?: string;
  excludeFieldIds?: string[];
}

const getFieldIcon = (type: FieldType) => {
  switch (type) {
    case 'text': return Type;
    case 'number': return Hash;
    case 'date': return Calendar;
    case 'checkbox': return CheckSquare;
    case 'lookup': return Database;
    case 'longText':
    case 'textarea': return AlignLeft;
    case 'currency': return DollarSign;
    case 'time': return Clock;
    case 'select': return ListFilter;
    case 'radio': return Radio;
    case 'toggle': return ToggleRight;
    case 'slider': return Sliders;
    case 'rating': return Star;
    case 'colorpicker': return Palette;
    case 'tag': return Tag;
    case 'card': return Box;
    case 'accordion': return Layout;
    case 'group':
    case 'fieldGroup':
    case 'repeatableGroup': return Layers;
    case 'connector': return Zap;
    case 'automation': return Sparkles;
    case 'button': return MousePointer2;
    case 'file': return FileText;
    case 'calculation': return Calculator;
    default: return Type;
  }
};

export const FieldSelectorModal = ({
  isOpen,
  onClose,
  onSelect,
  fields,
  tabs = [],
  title = "Select Field",
  selectedFieldId,
  excludeFieldIds = []
}: FieldSelectorModalProps) => {
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    return fields.filter(f => {
      if (excludeFieldIds.includes(f.id)) return false;
      if (!f.label && !f.id) return false;
      
      const searchLower = search.toLowerCase();
      return (
        (f.label || '').toLowerCase().includes(searchLower) ||
        f.id.toLowerCase().includes(searchLower) ||
        f.type.toLowerCase().includes(searchLower)
      );
    });
  }, [fields, search, excludeFieldIds]);

  const groupedFields = useMemo(() => {
    // 1. Sort all fields by rowIndex and then startCol
    const sorted = [...filteredFields].sort((a, b) => {
      const rowA = a.rowIndex ?? 0;
      const rowB = b.rowIndex ?? 0;
      if (rowA !== rowB) return rowA - rowB;
      return (a.startCol ?? 0) - (b.startCol ?? 0);
    });

    // 2. Group by tabId
    const groups: Record<string, Field[]> = {};
    
    // Ensure all tabs exist in groups even if empty
    tabs.forEach(t => { groups[t.id] = []; });
    if (!groups['default-tab']) groups['default-tab'] = [];

    sorted.forEach(f => {
      const tid = f.tabId || 'default-tab';
      if (!groups[tid]) groups[tid] = [];
      groups[tid].push(f);
    });

    return groups;
  }, [filteredFields, tabs]);

  const hasResults = Object.values(groupedFields).some(g => g.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Database size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{title}</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select a target for data mapping</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-900/50">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields by name, ID or type..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Field List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-6">
                {!hasResults ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
                      <Search size={20} />
                    </div>
                    <p className="text-sm font-medium text-zinc-500">No matching fields found</p>
                  </div>
                ) : (
                  [...tabs, { id: 'default-tab', label: 'General' }].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).map(tab => {
                    const tabFields = groupedFields[tab.id] || [];
                    if (tabFields.length === 0) return null;

                    return (
                      <div key={tab.id} className="space-y-2">
                        <div className="flex items-center gap-3 px-4">
                          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{tab.label}</span>
                          <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {tabFields.map(f => {
                            const Icon = getFieldIcon(f.type);
                            const isSelected = f.id === selectedFieldId;
                            
                            return (
                              <button
                                key={f.id}
                                onClick={() => {
                                  onSelect(f.id);
                                  onClose();
                                }}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                                  isSelected 
                                    ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10" 
                                    : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                  isSelected 
                                    ? "bg-indigo-500 text-white" 
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10"
                                )}>
                                  <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-sm font-bold truncate",
                                      isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-white"
                                    )}>
                                      {f.label || 'Untitled Field'}
                                    </span>
                                    {f.required && (
                                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Required</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-zinc-500 truncate">{f.id}</span>
                                    <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{f.type}</span>
                                  </div>
                                </div>
                                <div className="text-zinc-300 group-hover:text-indigo-500 transition-colors">
                                   <ChevronRight size={18} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Showing {filteredFields.length} of {fields.length} available fields
              </p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

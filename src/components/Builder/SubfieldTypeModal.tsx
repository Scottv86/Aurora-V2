import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Type, 
  Hash, 
  Calendar, 
  CheckSquare, 
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
  Layers, 
  FileText, 
  Calculator, 
  Plus,
  HelpCircle,
  UploadCloud,
  PenTool,
  QrCode,
  CreditCard,
  Code,
  Users,
  Building2,
  FolderTree,
  Table,
  ArrowRightLeft,
  Sparkles,
  TreePalm
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { FIELD_CATEGORIES } from '../ModuleEditor';

interface SubfieldTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeId: string) => void;
  containerLabel?: string;
}

export const SubfieldTypeModal: React.FC<SubfieldTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  containerLabel = 'Group'
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter categories and fields
  const categories = useMemo(() => {
    // Only allow nestable field types inside containers (exclude nesting container-inside-container if desired, but keep all standard types)
    return FIELD_CATEGORIES.map(cat => ({
      ...cat,
      fields: cat.fields.filter(f => {
        const matchesSearch = 
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.id.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || cat.id === selectedCategory;
        return matchesSearch && matchesCategory;
      })
    })).filter(cat => cat.fields.length > 0);
  }, [search, selectedCategory]);

  const totalFields = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.fields.length, 0);
  }, [categories]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        />
        
        {/* Modal Dialog */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                  Add Sub-Field
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Select a field type to insert inside <span className="font-bold text-indigo-600 dark:text-indigo-400">"{containerLabel}"</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar & Category Filters */}
          <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input 
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search field types (e.g. text, date, currency, formula, status)..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'all', label: 'All Types' },
                ...FIELD_CATEGORIES.map(c => ({ id: c.id, label: c.label }))
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Fields by Category */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {totalFields === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Search size={24} className="mx-auto text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-500">No matching field types found</p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                  className="text-xs font-bold text-indigo-500 hover:underline"
                >
                  Reset search filter
                </button>
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {cat.label}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400">
                      {cat.fields.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {cat.fields.map(field => {
                      const Icon = field.icon || Type;
                      return (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => {
                            onSelectType(field.id);
                            onClose();
                          }}
                          className="flex items-start gap-2.5 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:shadow-md transition-all text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-600 group-hover:text-white text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                              {field.label}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 block truncate mt-0.5">
                              {field.id}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Tip: You can also click any field in the Left Palette to drop it into this container.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

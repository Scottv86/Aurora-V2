import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, ArrowRight, Zap, Play, Settings, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { FIELD_CATEGORIES } from './ModuleEditor';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (type: string) => void;
  onAction: (action: string) => void;
  tabs: any[];
  layout: any[];
  activeTab: string;
}

export const CommandPalette = ({ isOpen, onClose, onSelectBlock, onAction, tabs, layout, activeTab }: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const blockTypes = FIELD_CATEGORIES.flatMap(cat => cat.fields.map(f => ({ ...f, category: cat.label, type: 'block_type' })));
  
  const existingFields = layout.map(f => ({
    id: f.id,
    label: f.label,
    icon: FIELD_CATEGORIES.flatMap(c => c.fields).find(def => def.id === f.type)?.icon || Command,
    category: 'Existing Field',
    type: 'existing_field'
  }));

  const navigationActions = [
    { id: 'tab:details', label: 'Go to Details', icon: Settings, shortcut: 'G D', type: 'nav' },
    { id: 'tab:schema', label: 'Go to Schema', icon: Play, shortcut: 'G S', type: 'nav' },
    { id: 'tab:builder', label: 'Go to Builder', icon: Zap, shortcut: 'G B', type: 'nav' },
    { id: 'tab:workflow', label: 'Go to Workflow', icon: Play, shortcut: 'G W', type: 'nav' },
    { id: 'tab:rules', label: 'Go to Rules', icon: Play, shortcut: 'G R', type: 'nav' },
    { id: 'tab:experience', label: 'Go to Experience', icon: Play, shortcut: 'G E', type: 'nav' },
    { id: 'tab:security', label: 'Go to Security', icon: Play, shortcut: 'G SEC', type: 'nav' },
    { id: 'tab:localization', label: 'Go to Localization', icon: Play, shortcut: 'G LOC', type: 'nav' },
    { id: 'tab:map', label: 'Go to Dependency Map', icon: Play, shortcut: 'G M', type: 'nav' },
    { id: 'tab:assets', label: 'Go to Assets', icon: Play, shortcut: 'G A', type: 'nav' },
    { id: 'tab:forms', label: 'Go to Forms', icon: Play, shortcut: 'G F', type: 'nav' },
    { id: 'tab:deployment', label: 'Go to Deployment', icon: Play, shortcut: 'G P', type: 'nav' },
  ];

  const systemActions = [
    { id: 'preview', label: 'Toggle Preview', icon: Play, shortcut: 'P', type: 'action' },
    { id: 'save', label: 'Save Module', icon: Zap, shortcut: 'Cmd+S', type: 'action' },
    { id: 'console', label: 'Toggle Console', icon: Plus, shortcut: 'C', type: 'action' },
  ];

  const results = [
    ...navigationActions,
    ...systemActions,
    ...existingFields,
    ...blockTypes
  ].filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        const item = results[selectedIndex];
        if (item.type === 'block_type') {
          onSelectBlock(item.id);
        } else {
          onAction(item.id);
        }
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setSearch('');
      setSelectedIndex(0);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectBlock, onAction]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-start justify-center pt-[15vh] pointer-events-none z-[101]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] shadow-2xl pointer-events-auto overflow-hidden"
            >
              <div className="flex items-center px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <Command size={18} className="text-indigo-500 mr-4" />
                <input
                  autoFocus
                  placeholder="Search blocks, actions, or settings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-zinc-400">ESC</span>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {results.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <Search size={32} className="mx-auto text-zinc-200 dark:text-zinc-800" />
                    <p className="text-xs font-medium text-zinc-400">No results found for "{search}"</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {results.map((item, index) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          if (item.type === 'block') onSelectBlock(item.id);
                          else onAction(item.id);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left",
                          selectedIndex === index 
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            selectedIndex === index ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                          )}>
                            <item.icon size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{item.label}</p>
                            {'category' in item && (
                              <p className={cn("text-[9px] uppercase tracking-widest", selectedIndex === index ? "text-indigo-100" : "text-zinc-400")}>
                                {item.category}
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedIndex === index ? (
                          <ArrowRight size={14} className="animate-pulse" />
                        ) : 'shortcut' in item ? (
                          <span className="text-[10px] font-bold opacity-40">{item.shortcut}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-500">↑↓</kbd>
                    <span className="text-[10px] text-zinc-400">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-500">↵</kbd>
                    <span className="text-[10px] text-zinc-400">Select</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aurora Engine</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

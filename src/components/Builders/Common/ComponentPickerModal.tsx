import React, { useState } from 'react';
import { Search, Plus, Check, FileText, GitBranch, Zap, ShieldCheck, BarChart3, Radio, Layers } from 'lucide-react';
import { Modal } from '../../UI/TabsAndModal';
import { Button } from '../../UI/Primitives';
import { cn } from '../../../lib/utils';

export type ComponentType = 'form' | 'workflow' | 'automation' | 'validation' | 'report' | 'connector';

export interface ComponentOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  updatedAt?: string;
  isGlobal?: boolean;
  version?: number;
}

interface ComponentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  componentType: ComponentType;
  items: ComponentOption[];
  selectedId?: string;
  onSelect: (item: ComponentOption) => void;
  onCreateNew: () => void;
}

export const ComponentPickerModal: React.FC<ComponentPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  componentType,
  items,
  selectedId,
  onSelect,
  onCreateNew
}) => {
  const [search, setSearch] = useState('');

  const getIcon = () => {
    switch (componentType) {
      case 'form': return FileText;
      case 'workflow': return GitBranch;
      case 'automation': return Zap;
      case 'validation': return ShieldCheck;
      case 'report': return BarChart3;
      case 'connector': return Radio;
      default: return Layers;
    }
  };

  const IconComponent = getIcon();

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <div className="space-y-4 py-2">
        {/* Header Action & Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={`Search ${componentType}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg font-medium shadow-sm transition-all"
          >
            <Plus size={14} />
            <span>Create New</span>
          </Button>
        </div>

        {/* Component List */}
        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <IconComponent className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No {componentType}s found</p>
              <p className="text-xs text-zinc-500 mt-1">Create a new one or clear your search query.</p>
              <Button
                onClick={() => {
                  onClose();
                  onCreateNew();
                }}
                variant="secondary"
                className="mt-3 text-xs"
              >
                Create New {componentType.charAt(0).toUpperCase() + componentType.slice(1)}
              </Button>
            </div>

          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                    isSelected
                      ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500/80 shadow-sm"
                      : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors mt-0.5",
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                    )}>
                      <IconComponent size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {item.name}
                        </span>
                        {item.isGlobal && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium px-1.5 py-0.5 rounded">
                            Global
                          </span>
                        )}
                        {item.version && (
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono">
                            v{item.version}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check size={12} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

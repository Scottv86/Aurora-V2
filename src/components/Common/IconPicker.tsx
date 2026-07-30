import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, Sparkles } from 'lucide-react';
import { Modal } from '../UI/TabsAndModal';
import { cn } from '../UI/Primitives';

// Curated list of common business/app icons
const COMMON_ICONS = [
  'Layout', 'Users', 'Settings', 'Activity', 'Database', 'Shield', 'Zap', 'Sparkles', 
  'Box', 'FileText', 'Mail', 'Calendar', 'Bell', 'CreditCard', 'BarChart', 'Map', 
  'Globe', 'Clock', 'LifeBuoy', 'Lock', 'Tool', 'Compass', 'Heart', 'Star', 
  'CheckCircle', 'AlertCircle', 'HelpCircle', 'Info', 'Plus', 'Minus', 'Search', 
  'Filter', 'Download', 'Upload', 'Share', 'Link', 'Trash', 'Edit', 'Copy', 
  'ExternalLink', 'Eye', 'EyeOff', 'Sun', 'Moon', 'Cloud', 'Cpu', 'HardDrive', 
  'Smartphone', 'Tablet', 'Monitor', 'Speaker', 'Camera', 'Music', 'Video', 
  'Image', 'MapPin', 'Flag', 'Bookmark', 'Tag', 'Coffee', 'Briefcase', 'Gift', 
  'ShoppingBag', 'ShoppingCart', 'Truck', 'Home', 'Key', 'Power', 
  'RefreshCw', 'Repeat', 'Shuffle', 'Terminal', 'Code', 'Hash', 
  'DollarSign', 'Bitcoin', 'Archive', 'ArrowRight', 'ChevronRight', 'Layers',
  'PieChart', 'TrendingUp', 'Wallet', 'UserPlus', 'ShieldCheck', 'Globe2'
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const CurrentIcon = (LucideIcons as any)[value] || LucideIcons.HelpCircle;

  const filteredIcons = COMMON_ICONS.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 block">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 px-3 h-[38px] bg-white/80 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-white dark:hover:bg-white/[0.06] transition-all group"
      >
        <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-400 transition-all shrink-0">
          <CurrentIcon size={13} />
        </div>
        <span className="text-xs font-bold text-zinc-950 dark:text-white truncate flex-1">{value || 'Select Icon'}</span>
        <Sparkles size={12} className="text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0" />
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Icon"
        size="lg"
      >
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search icons..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
            {filteredIcons.map((iconName) => {
              const Icon = (LucideIcons as any)[iconName];
              if (!Icon) return null;
              
              const isSelected = value === iconName;

              return (
                <button
                  key={iconName}
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                  }}
                  title={iconName}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all aspect-square",
                    isSelected 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                      : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[8px] font-bold uppercase tracking-tighter truncate w-full text-center">
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-500">No icons found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

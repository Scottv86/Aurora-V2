import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { LayoutGrid, Search, ExternalLink, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';

interface AppItem {
  id: string;
  label: string;
  iconName: string;
  description: string;
  color: string;
  to?: string;
}

const APPS: AppItem[] = [
  { id: 'inbox', label: 'Inbox', iconName: 'Inbox', description: 'Unified communication hub', color: 'text-blue-500' },
  { id: 'docs', label: 'Docs', iconName: 'FileText', description: 'Collaborative documents', color: 'text-indigo-500' },
  { id: 'drive', label: 'Drive', iconName: 'Folder', description: 'Secure cloud storage', color: 'text-amber-500' },
  { id: 'chat', label: 'Chat', iconName: 'MessageSquare', description: 'Real-time team messaging', color: 'text-emerald-500' },
  { id: 'meet', label: 'Meet', iconName: 'Video', description: 'Video conferencing', color: 'text-rose-500' },
  { id: 'calendar', label: 'Calendar', iconName: 'Calendar', description: 'Schedule and events', color: 'text-blue-600' },
  { id: 'notes', label: 'Notes', iconName: 'StickyNote', description: 'Quick thoughts and ideas', color: 'text-yellow-500' },
  { id: 'reminders', label: 'Reminders', iconName: 'Bell', description: 'Tasks and notifications', color: 'text-purple-500' },
  { id: 'reports', label: 'Reports', iconName: 'BarChart3', description: 'Data insights and analytics', color: 'text-cyan-500' },
  { id: 'converter', label: 'File converter', iconName: 'FileType', description: 'Convert files instantly', color: 'text-orange-500' },
  { id: 'feed', label: 'Feed', iconName: 'Rss', description: 'Stay informed with your feed', color: 'text-red-500' },
  { id: 'draw', label: 'Draw', iconName: 'Palette', description: 'Digital sketching canvas', color: 'text-pink-500' },
  { id: 'whiteboard', label: 'Whiteboard', iconName: 'Presentation', description: 'Collaborative brainstorming', color: 'text-teal-500' },
  { id: 'calculator', label: 'Calculator', iconName: 'Calculator', description: 'Advanced calculation tool', color: 'text-slate-500' },
  { id: 'snipper', label: 'Snipping tool', iconName: 'Scissors', description: 'Capture your screen', color: 'text-violet-500' },
];

export const AppLauncher = () => {
  const { tenant, setIsAppLauncherOpen } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');

  // Default to all apps if not specified
  const enabledApps = tenant?.enabledApps || APPS.map(a => a.id);
  const visibleApps = APPS.filter(app => enabledApps.includes(app.id));

  const filteredApps = visibleApps.filter(app => 
    app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 w-96 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/20"
    >
      
      {/* Header & Search */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
              <LayoutGrid size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aurora Apps</h3>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Workspace Suite</span>
            </div>
          </div>
          <button 
            onClick={() => setIsAppLauncherOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-sm"
            autoFocus
          />
        </div>
      </div>

      {/* App Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-3 gap-3">
          {filteredApps.map((app) => {
            const Icon = (LucideIcons as any)[app.iconName] || LayoutGrid;
            return (
              <button
                key={app.id}
                disabled={!app.to}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 relative group/app",
                  app.to
                    ? "hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                    : "opacity-60 cursor-not-allowed grayscale-[0.5]"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-300 group-hover/app:scale-110 shadow-sm",
                  "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
                  app.color
                )}>
                  <Icon size={24} />
                </div>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-white mb-0.5">{app.label}</span>
                {!app.to && (
                  <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Soon</span>
                )}
                
                {/* Tooltip-like description on hover */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 opacity-0 group-hover/app:opacity-100 transition-opacity p-2 rounded-xl border border-indigo-500/20 z-10">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">{app.label}</span>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 text-center leading-tight">{app.description}</p>
                  {!app.to ? (
                    <span className="mt-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">Coming Soon</span>
                  ) : (
                    <div className="mt-2 text-indigo-600 dark:text-indigo-400">
                      <ExternalLink size={12} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
        <button className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest">
          Manage Apps
        </button>
        <button className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest">
          Request App
        </button>
      </div>
    </motion.aside>
  );
};

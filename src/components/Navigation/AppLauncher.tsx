import { useState, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { LayoutGrid, Search, ExternalLink } from 'lucide-react';
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
  const { tenant } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Default to all apps if not specified
  const enabledApps = tenant?.enabledApps || APPS.map(a => a.id);
  const visibleApps = APPS.filter(app => enabledApps.includes(app.id));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredApps = visibleApps.filter(app => 
    app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 transition-all duration-300 rounded-lg group",
          isOpen 
            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10" 
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        )}
        title="App Launcher"
      >
        <LayoutGrid size={20} className={cn("transition-transform duration-300", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header & Search */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aurora Apps</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Workspace Suite
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* App Grid */}
          <div className="p-4 max-h-[480px] overflow-y-auto">
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
                      "bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
                      app.color
                    )}>
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white mb-0.5">{app.label}</span>
                    {!app.to && (
                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Soon</span>
                    )}
                    {app.to && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover/app:opacity-100 transition-opacity">
                        <ExternalLink size={10} className="text-zinc-400" />
                      </div>
                    )}
                    
                    {/* Tooltip-like description on hover */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 opacity-0 group-hover/app:opacity-100 transition-opacity p-2 rounded-xl border border-indigo-500/20">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">{app.label}</span>
                      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 text-center leading-tight">{app.description}</p>
                      {!app.to && (
                        <span className="mt-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">Coming Soon</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <button className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Manage Apps
            </button>
            <button className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Request App
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

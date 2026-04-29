import { useState } from 'react';
import { 
  LayoutGrid, 
  Check, 
  X, 
  Inbox, 
  FileText, 
  Folder, 
  MessageSquare, 
  Video, 
  Calendar, 
  StickyNote, 
  Bell, 
  BarChart3,
  Search,
  AlertCircle,
  Loader2,
  FileType,
  Rss,
  Palette,
  Presentation,
  Calculator,
  Scissors
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';

const AVAILABLE_APPS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, description: 'Unified communication hub for all your channels.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'docs', label: 'Docs', icon: FileText, description: 'Collaborative document editing and management.', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'drive', label: 'Drive', icon: Folder, description: 'Secure cloud storage for all your business files.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Real-time team messaging and collaboration.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'meet', label: 'Meet', icon: Video, description: 'High-quality video conferencing and meetings.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Advanced scheduling and event management.', color: 'text-blue-600', bg: 'bg-blue-600/10' },
  { id: 'notes', label: 'Notes', icon: StickyNote, description: 'Quick thoughts, ideas, and shared knowledge.', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'reminders', label: 'Reminders', icon: Bell, description: 'Personal and team task notifications.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'reports', label: 'Reports', icon: BarChart3, description: 'Business intelligence and data visualization.', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { id: 'converter', label: 'File converter', icon: FileType, description: 'Convert files between different formats instantly.', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'feed', label: 'Feed', icon: Rss, description: 'Stay informed with your personalized activity feed.', color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'draw', label: 'Draw', icon: Palette, description: 'Digital canvas for sketching and creative work.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'whiteboard', label: 'Whiteboard', icon: Presentation, description: 'Real-time collaborative brainstorming space.', color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { id: 'calculator', label: 'Calculator', icon: Calculator, description: 'Advanced tool for quick and complex calculations.', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  { id: 'snipper', label: 'Snipping tool', icon: Scissors, description: 'Capture and annotate any part of your screen.', color: 'text-violet-500', bg: 'bg-violet-500/10' },
];

export const AppsSettings = () => {
  const { tenant, updateTenant } = usePlatform();
  const [searchQuery, setSearchQuery] = useState('');
  const [savingAppId, setSavingAppId] = useState<string | null>(null);

  // Default to all apps enabled if the field doesn't exist yet
  const enabledApps = tenant?.enabledApps || AVAILABLE_APPS.map(a => a.id);

  const handleToggleApp = async (appId: string) => {
    if (!tenant) return;
    
    setSavingAppId(appId);
    try {
      const newEnabledApps = enabledApps.includes(appId)
        ? enabledApps.filter(id => id !== appId)
        : [...enabledApps, appId];
      
      await updateTenant({ enabledApps: newEnabledApps });
    } finally {
      setSavingAppId(null);
    }
  };

  const filteredApps = AVAILABLE_APPS.filter(app => 
    app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <div className="relative z-10 space-y-8 flex flex-col flex-1">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">App Catalog</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage which utility applications are enabled for your organization.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
          />
        </div>
        

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredApps.map((app) => {
          const isEnabled = enabledApps.includes(app.id);
          const Icon = app.icon;

          return (
            <div 
              key={app.id}
              className={cn(
                "group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col relative overflow-hidden",
                !isEnabled && "opacity-75 grayscale-[0.5]"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm", app.bg, app.color)}>
                    <Icon size={24} />
                  </div>
                  <button
                    onClick={() => handleToggleApp(app.id)}
                    disabled={savingAppId !== null}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 min-w-[90px] justify-center",
                      isEnabled
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700",
                      savingAppId === app.id && "opacity-80 cursor-wait"
                    )}
                  >
                    {savingAppId === app.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isEnabled ? (
                      <>
                        <Check size={12} strokeWidth={3} />
                        Enabled
                      </>
                    ) : (
                      <>
                        <X size={12} strokeWidth={3} />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{app.label}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">{app.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Workspace Suite</span>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-500">
                    <AlertCircle size={10} />
                    Soon
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredApps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid size={32} className="text-zinc-300 dark:text-zinc-700" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No apps found</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Try adjusting your search query.</p>
        </div>
      )}
      </div>
    </div>
  );
};

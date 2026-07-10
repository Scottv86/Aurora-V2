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
import { PageHeader } from '../../../components/UI/PageHeader';
import { motion, AnimatePresence } from 'motion/react';

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

  const handleToggleApp = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
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
        <PageHeader 
          title="App Catalog"
          description="Manage which utility applications are enabled and available across your organization workspaces."
        />

        {/* Premium search bar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search utility apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 backdrop-blur-xl"
            />
          </div>
        </div>

        {/* Clean cards grid matching PlatformModulesSettings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredApps.map((app, i) => {
              const isEnabled = enabledApps.includes(app.id);
              const Icon = app.icon;

              return (
                <motion.div 
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col relative overflow-hidden h-full justify-between",
                    !isEnabled && "opacity-80"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn("p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm", app.bg, app.color)}>
                          <Icon size={24} />
                        </div>
                        <button
                          onClick={(e) => handleToggleApp(e, app.id)}
                          disabled={savingAppId !== null}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 min-w-[95px] justify-center shadow-sm cursor-pointer",
                            isEnabled
                              ? "bg-emerald-500 text-white shadow-emerald-500/10"
                              : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50 hover:text-zinc-600 dark:hover:text-zinc-350",
                            savingAppId === app.id && "opacity-80 cursor-wait"
                          )}
                        >
                          {savingAppId === app.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : isEnabled ? (
                            <>
                              <Check size={10} strokeWidth={4} />
                              Enabled
                            </>
                          ) : (
                            <>
                              <X size={10} strokeWidth={4} />
                              Disabled
                            </>
                          )}
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {app.label}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                        {app.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Workspace Suite</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        <AlertCircle size={10} />
                        Active
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <div className="w-16 h-16 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-200/50 dark:border-zinc-800/80">
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

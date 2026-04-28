import { Link } from 'react-router-dom';
import { Sparkles, LayoutDashboard } from 'lucide-react';

export const ComingSoon = ({ title, description }: { title: string, description?: string }) => (
  <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 min-h-[calc(100vh-12rem)] items-center justify-center text-center">
    <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-indigo-500/10 relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Sparkles size={32} className="text-zinc-400 dark:text-zinc-600 group-hover:text-indigo-400 transition-colors relative z-10" />
    </div>
    <div className="max-w-md space-y-2">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h2>
      <p className="text-zinc-500 text-sm leading-relaxed">
        {description || "This feature is currently under development and will be available in a future update. We're working hard to bring you the best experience possible."}
      </p>
    </div>
    <div className="flex items-center gap-4 pt-4">
      <Link 
        to="/workspace" 
        className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
      >
        <LayoutDashboard size={16} />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  </div>
);

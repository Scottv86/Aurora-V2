import { 
  Sparkles, 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  User as UserIcon 
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Environment } from '../../types/platform';

export const Navbar = () => {
  const { tenant, environment, setEnvironment } = usePlatform();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Get user details from Supabase metadata or fallback to email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Aurora</span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-2" />
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Env:</span>
          <select 
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
          >
            {tenant?.environments.map(env => (
              <option key={env} value={env} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{env}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Search platform..." 
            className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-64 transition-all"
          />
        </div>
        
        <button 
          onClick={toggleTheme}
          className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-950" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{displayName}</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-tighter">Tenant Admin</p>
          </div>
          <button 
            onClick={logout}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={16} className="text-zinc-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

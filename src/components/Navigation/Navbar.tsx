import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Search, 
  Moon, 
  Sun, 
  Bell, 
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  Settings,
  CreditCard
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';
import { Environment } from '../../types/platform';
import { LicenseGate } from '../Auth/LicenseGate';

export const Navbar = () => {
  const { tenant, environment, setEnvironment, user: platformUser } = usePlatform();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get user details from Platform Context (Database) or fallback to Supabase metadata/email
  const platformName = platformUser?.firstName && platformUser?.lastName 
    ? `${platformUser.firstName} ${platformUser.lastName}`
    : (platformUser?.firstName || platformUser?.lastName);

  const displayName = platformName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  // Prioritize persistent DB avatar from platform context over Supabase metadata
  const avatarUrl = platformUser?.avatarUrl || user?.user_metadata?.avatar_url;

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
            {(tenant?.environments || ['production']).map(env => (
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

        <LicenseGate>
          <button 
            onClick={() => {
              const isAdminPath = location.pathname.startsWith('/admin');
              navigate(isAdminPath ? '/admin/settings' : '/workspace/settings');
            }}
            className={cn(
              "p-2 transition-colors",
              location.pathname.includes('/settings') 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
            title="Platform Settings"
          >
            <Settings size={20} />
          </button>
        </LicenseGate>

        <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-950" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 relative" ref={menuRef}>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{displayName}</p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-1 uppercase tracking-tighter">{tenant?.name || tenant?.id || 'No Workspace'}</p>
          </div>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all",
              showUserMenu && "bg-zinc-100 dark:bg-zinc-800"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={16} className="text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
            <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200", showUserMenu && "rotate-180")} />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden py-1 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</p>
              </div>
              
              <div className="p-1">
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={() => setShowUserMenu(false)}
                >
                  <UserIcon size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                  Profile Configuration
                </button>
                <LicenseGate>
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <SettingsIcon size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    Account Settings
                  </button>
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/workspace/settings/billing');
                    }}
                  >
                    <CreditCard size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    Billing & Plans
                  </button>
                </LicenseGate>
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <div className="p-1">
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors group"
                >
                  <LogOut size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

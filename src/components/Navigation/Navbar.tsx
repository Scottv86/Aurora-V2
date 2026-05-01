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
  MessageSquare,
  LayoutGrid,
  Monitor
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';
import { Environment } from '../../types/platform';
import { LicenseGate } from '../Auth/LicenseGate';

export const Navbar = () => {
  const { 
    tenant, 
    environment, 
    setEnvironment, 
    user: platformUser, 
    isAIAssistantOpen, 
    setIsAIAssistantOpen,
    isChatOpen,
    setIsChatOpen,
    isAppLauncherOpen,
    setIsAppLauncherOpen,
    isNotificationsOpen,
    setIsNotificationsOpen
  } = usePlatform();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const envMenuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (envMenuRef.current && !envMenuRef.current.contains(event.target as Node)) {
        setShowEnvMenu(false);
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
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden",
            !tenant?.branding?.logoUrl && "bg-gradient-to-br from-indigo-500 to-purple-600"
          )}>
            {tenant?.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Sparkles size={18} className="text-white" />
            )}
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            {tenant?.name || 'Aurora'}
          </span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-2" />
        <div className="relative" ref={envMenuRef}>
          <button 
            onClick={() => setShowEnvMenu(!showEnvMenu)}
            className="group relative flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-full pl-3 pr-2 py-1 transition-all duration-300 shadow-sm"
          >
            <div className="flex items-center gap-1.5 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">Env:</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 pr-4 transition-colors">
                {environment}
              </span>
              <ChevronDown size={12} className={cn("absolute right-2 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all duration-200", showEnvMenu && "rotate-180")} />
            </div>
          </button>

          {/* Environment Dropdown Menu */}
          {showEnvMenu && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden py-1 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Select Environment</p>
              </div>
              <div className="p-1">
                {(tenant?.environments || ['production']).map(env => (
                  <button
                    key={env}
                    onClick={() => {
                      setEnvironment(env as Environment);
                      setShowEnvMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                      environment === env 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5"
                    )}
                  >
                    {env}
                    {environment === env && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-1 justify-center px-4">
        <button className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-indigo-500 transition-colors" size={16} />
          <div className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 text-left flex items-center justify-between group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-all shadow-sm">
            <span>Search or type a command...</span>
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-400">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-400">K</kbd>
            </div>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        
        <button 
          onClick={() => {
            setIsAppLauncherOpen(!isAppLauncherOpen);
            if (!isAppLauncherOpen) {
              setIsChatOpen(false);
              setIsAIAssistantOpen(false);
              setIsNotificationsOpen(false);
            }
          }}
          className={cn(
            "p-2 transition-all duration-300 rounded-lg group",
            isAppLauncherOpen 
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10" 
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          )}
          title="App Launcher"
        >
          <LayoutGrid size={20} />
        </button>

        {!location.pathname.startsWith('/admin') && (
          <>
            {/* Chat App Icon */}
            {tenant?.enabledApps?.includes('chat') && (
              <button 
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  if (!isChatOpen) {
                    setIsAIAssistantOpen(false);
                    setIsAppLauncherOpen(false);
                    setIsNotificationsOpen(false);
                  }
                }}
                className={cn(
                  "p-2 transition-all duration-300 rounded-lg",
                  isChatOpen 
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
                title="Team Chat"
              >
                <div className="relative">
                  <MessageSquare size={20} />
                  {isChatOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                  )}
                </div>
              </button>
            )}

            {/* AI Assistant Icon */}
            <button 
              onClick={() => {
                setIsAIAssistantOpen(!isAIAssistantOpen);
                if (!isAIAssistantOpen) {
                  setIsChatOpen(false);
                  setIsAppLauncherOpen(false);
                  setIsNotificationsOpen(false);
                }
              }}
              className={cn(
                "p-2 transition-all duration-300 rounded-lg",
                isAIAssistantOpen 
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="AI Assistant"
            >
              <div className="relative">
                <Sparkles size={20} />
                {isAIAssistantOpen && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                )}
              </div>
            </button>
          </>
        )}

        <button 
          onClick={() => {
            setIsNotificationsOpen(!isNotificationsOpen);
            if (!isNotificationsOpen) {
              setIsChatOpen(false);
              setIsAIAssistantOpen(false);
              setIsAppLauncherOpen(false);
            }
          }}
          className={cn(
            "p-2 transition-all duration-300 rounded-lg relative",
            isNotificationsOpen
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          )}
          title="Notifications"
        >
          <Bell size={20} />
          {!isNotificationsOpen && <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-950" />}
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 relative" ref={menuRef}>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{displayName}</p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-1 uppercase tracking-tighter">
              {platformUser?.position || platformUser?.role?.replace(/_/g, ' ') || 'User'}
            </p>
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
                  Profile
                </button>
                <button 
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTheme();
                  }}
                >
                  <div className="flex items-center gap-2">
                    {theme === 'light' ? (
                      <Sun size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    ) : (
                      <Moon size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                    Appearance
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {theme}
                  </span>
                </button>
                <LicenseGate>
                  <button 
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <SettingsIcon size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    Account
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

        <LicenseGate>
          <div className="pl-4 border-l border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => {
                const isAdminPath = location.pathname.startsWith('/admin');
                const isSettingsPath = location.pathname.includes('/settings');
                if (isSettingsPath) {
                  navigate(isAdminPath ? '/admin' : '/workspace');
                } else {
                  navigate(isAdminPath ? '/admin/settings' : '/workspace/settings');
                }
              }}
              className={cn(
                "p-2 transition-colors",
                location.pathname.includes('/settings') 
                  ? "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              title={location.pathname.includes('/settings') ? "Return to Workspace" : "Platform Settings"}
            >
              {location.pathname.includes('/settings') ? (
                <Monitor size={20} />
              ) : (
                <SettingsIcon size={20} />
              )}
            </button>
          </div>
        </LicenseGate>
      </div>
    </header>
  );
};

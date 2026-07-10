import { ReactNode, useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  CloudUpload, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings2,
  LayoutDashboard,
  Building,
  CreditCard,
  Layers,
  Terminal,
  Database,
  Palette,
  Compass,
  LayoutGrid,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';
import { SidebarItem } from '../Navigation/SidebarItem';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { Navbar } from '../Navigation/Navbar';
import { Login } from '../Auth/Login';
import { TopMegaMenu } from '../Navigation/TopMegaMenu';
import { MenuSection, MenuItem } from '../../types/menu';
import { AIAssistant } from '../AI/AIAssistant';
import { ChatDrawer } from '../AI/ChatDrawer';
import { AnimatePresence, motion } from 'motion/react';
import { Breadcrumbs } from '../Navigation/Breadcrumbs';
import { AppLauncher } from '../Navigation/AppLauncher';
import { NotificationsDrawer } from '../Navigation/NotificationsDrawer';
import { PageLoader } from '../UI/PageLoader';
import { TransitionBar } from '../UI/TransitionBar';


const SidebarItemRenderer = ({ 
  item, 
  collapsed, 
  active, 
  expandedItems,
  onToggleExpand,
  isActive,
  depth = 0
}: { 
  item: MenuItem, 
  collapsed: boolean, 
  active: boolean,
  expandedItems: Record<string, boolean>,
  onToggleExpand: (id: string) => void,
  isActive: (path: string) => boolean,
  depth?: number
}) => {
  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Box;

  // Subtitle styling in sidebar
  if ((item as any).isSubtitle) {
    if (collapsed) {
      return <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4 mx-2" />;
    }
    return (
      <div 
        className={cn(
          "text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-3 pt-4 pb-1 select-none",
          depth > 0 ? "pl-9" : ""
        )}
      >
        {item.label}
      </div>
    );
  }

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="relative space-y-0.5">
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <SidebarItem 
            icon={IconComponent} 
            label={item.label} 
            to={item.to} 
            active={active} 
            collapsed={collapsed}
            className={cn(!item.isVisible && "opacity-50 grayscale")}
            nested={depth > 0}
            hasChildren={hasChildren}
            isExpanded={expandedItems[item.id]}
            onToggleExpand={() => onToggleExpand(item.id)}
          />
        </div>
      </div>

      {hasChildren && expandedItems[item.id] && !collapsed && (
        <div className="space-y-0.5 mt-0.5">
          {item.children!.map((child: MenuItem) => (
            child.isVisible !== false && (
              <SidebarItemRenderer
                key={child.id}
                item={child}
                collapsed={collapsed}
                active={child.to ? isActive(child.to) : false}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                isActive={isActive}
                depth={depth + 1}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarSectionRenderer = ({ 
  section, 
  collapsed, 
  isActive, 
  expandedItems,
  onToggleExpand
}: { 
  section: MenuSection, 
  collapsed: boolean,
  isActive: (path: string) => boolean,
  expandedItems: Record<string, boolean>,
  onToggleExpand: (id: string) => void
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center group/section">
        {collapsed ? (
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4 mx-2" />
        ) : (
          <div className="flex items-center justify-between w-full px-3">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{section.title}</p>
          </div>
        )}
      </div>

      <nav className="space-y-0.5">
        {section.items.map((item) => (
          item.isVisible !== false && (
            <SidebarItemRenderer 
              key={item.id} 
              item={item} 
              collapsed={collapsed} 
              active={item.to ? isActive(item.to) : false}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
              isActive={isActive}
              depth={0}
            />
          )
        ))}
      </nav>
    </div>
  );
};


const AuroraBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-20">
    <motion.div 
      animate={{
        scale: [1, 1.2, 1],
        x: [0, 50, 0],
        y: [0, 30, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/20 dark:bg-indigo-500/40 blur-[120px] rounded-full" 
    />
    <motion.div 
      animate={{
        scale: [1.2, 1, 1.2],
        x: [0, -40, 0],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-500/20 dark:bg-teal-500/30 blur-[120px] rounded-full" 
    />
    <motion.div 
      animate={{
        scale: [1, 1.3, 1],
        x: [0, 30, 0],
        y: [0, -40, 0],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/20 blur-[120px] rounded-full" 
    />
    <motion.div 
      animate={{
        scale: [1.3, 1, 1.3],
        x: [0, -20, 0],
        y: [0, 50, 0],
      }}
      transition={{
        duration: 22,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-emerald-500/10 dark:bg-emerald-500/20 blur-[120px] rounded-full" 
    />
  </div>
);

export const PlatformShell = ({ children, fullBleed }: { children: ReactNode, fullBleed?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { 
    isLoading: platformLoading, 
    modules, 
    menuConfig, 
    isAIAssistantOpen,
    isChatOpen,
    isAppLauncherOpen,
    isNotificationsOpen,
    tenant
  } = usePlatform();
  
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter(x => x);
  const [isSidebarOpen, setIsSidebarOpen] = useState(location.pathname !== '/workspace/settings/builder/new');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const SETTINGS_NAV_GROUPS = [
    {
      category: 'General',
      icon: Settings2,
      items: [
        { label: 'Overview', icon: LayoutDashboard, to: '/workspace/settings' },
        { label: 'Organisation', icon: Building, to: '/workspace/settings/organization' },
        { label: 'Subscription', icon: CreditCard, to: '/workspace/settings/subscription' },
      ]
    },
    {
      category: 'Look & Feel',
      icon: Palette,
      items: [
        { label: 'Branding', icon: Palette, to: '/workspace/settings/branding' },
        { label: 'Navigation', icon: Compass, to: '/workspace/settings/navigation' },
      ]
    },

    {
      category: 'Modules & Apps',
      icon: LucideIcons.Layout,
      items: [
        { label: 'Modules', icon: Layers, to: '/workspace/settings/platform-modules' },
        { label: 'Apps', icon: LayoutGrid, to: '/workspace/settings/apps' },
      ]
    },
    {
      category: 'Data & Logic',
      icon: Terminal,
      items: [
        { label: 'Data', icon: Database, to: '/workspace/settings/data' },
        { label: 'Migration', icon: ArrowRightLeft, to: '/workspace/settings/migration' },
      ]
    },

  ];

  const filteredSettingsItems = useMemo(() => {
    const allItems = SETTINGS_NAV_GROUPS.flatMap(group => group.items);
    if (!settingsSearchQuery) return allItems;
    const query = settingsSearchQuery.toLowerCase();
    
    return allItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  }, [settingsSearchQuery]);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isSettingsMode = location.pathname.startsWith('/workspace/settings') || location.pathname.startsWith('/dashboard/settings');
  const isModuleBuilder = location.pathname.includes('/workspace/settings/builder') || 
                          location.pathname.includes('/workspace/settings/ai-builder');

  const rawLayoutStyle = tenant?.branding?.layout_style || 'sidebar';
  const layoutStyle = (isSettingsMode || isAdminPath) ? 'sidebar' : rawLayoutStyle;

  const isSidebarReallyOpen = layoutStyle === 'top' 
    ? false 
    : (layoutStyle === 'slim' 
      ? isSidebarHovered 
      : isSidebarOpen);

  const collapsed = !isSidebarReallyOpen;

  const asideWidthClass = isModuleBuilder 
    ? "w-0 opacity-0 pointer-events-none border-none" 
    : (layoutStyle === 'top' 
      ? "w-0 opacity-0 pointer-events-none border-none" 
      : (isSidebarReallyOpen ? "w-64" : "w-16"));

  const mainMarginClass = isModuleBuilder 
    ? "ml-0" 
    : (layoutStyle === 'top' 
      ? "ml-0" 
      : (layoutStyle === 'slim' 
        ? "ml-16" 
        : (isSidebarOpen ? "ml-64" : "ml-16")));

  const enabledModules = modules.filter((m: any) => {
    const isPlatform = PLATFORM_MODULES.some(pm => pm.id === m.id || pm.id === m.templateId || pm.name === m.name || pm.slug === m.templateId);
    if (isPlatform) return false;
    if (m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage) return false;
    return m.status === 'ACTIVE' || m.enabled;
  });

  const resolvedConfig = useMemo(() => {
    if (!menuConfig) return null;

    // Inject active modules that are missing from the configuration
    const sections = (menuConfig.sections || []).map(section => {
      if (section.id === 'modules') {
        // Only include items that are in enabledModules (in case some were deactivated but not yet removed from saved config)
        const activeModuleIds = new Set(enabledModules.map(m => `module:${m.id}`));
        const currentItems = (section.items || [])
          .filter(i => activeModuleIds.has(i.id))
          .map(item => {
            const mod = enabledModules.find(m => `module:${m.id}` === item.id);
            return mod ? { 
              ...item, 
              label: mod.name, 
              iconName: (mod as any).iconName || mod.icon || item.iconName 
            } : item;
          });
        const existingModuleIds = new Set(currentItems.map(i => i.id));

        const newModules = enabledModules
          .filter(m => !existingModuleIds.has(`module:${m.id}`))
          .map(m => ({
            id: `module:${m.id}`,
            label: m.name,
            iconName: (m as any).iconName || m.icon || 'Box',
            to: `/workspace/modules/${m.id}`,
            isVisible: true
          }));
        
        return {
          ...section,
          items: [...currentItems, ...newModules]
        };
      }
      return section;
    }).filter(section => {
      if (section.id === 'apps') return false;
      if (section.id === 'modules') {
        return section.items.length > 0;
      }
      return true;
    });

    return { ...menuConfig, sections };
  }, [menuConfig, enabledModules]);

  if (authLoading || platformLoading) {
    return <PageLoader label="Initializing Aurora" />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      <TransitionBar />
      <AuroraBackground />
      <AnimatePresence>
        {isSettingsMode && (
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ 
              opacity: 0.8, 
              scaleX: 1,
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
            }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{
              opacity: { duration: 0.3 },
              scaleX: { duration: 0.5, ease: "circOut" },
              backgroundPosition: { duration: 15, repeat: Infinity, ease: "linear" }
            }}
            style={{ backgroundSize: '200% 100%' }}
            className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-teal-500 to-indigo-500 z-[100] pointer-events-none origin-left shadow-[0_0_15px_rgba(99,102,241,0.4)] dark:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
          />
        )}
      </AnimatePresence>
      <Navbar />

      {/* Top Mounted Mega Menu */}
      {layoutStyle === 'top' && !isSettingsMode && !isAdminPath && (
        <div className="sticky top-16 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl h-12 flex items-center px-6 lg:px-12 w-full shrink-0">
          <TopMegaMenu menuConfig={resolvedConfig} />
        </div>
      )}

      <div className="flex">
        {layoutStyle !== 'top' && (
          <aside 
            onMouseEnter={() => {
              if (layoutStyle === 'slim') setIsSidebarHovered(true);
            }}
            onMouseLeave={() => {
              if (layoutStyle === 'slim') setIsSidebarHovered(false);
            }}
            className={cn(
              "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300 z-40 overflow-y-auto overflow-x-hidden",
              asideWidthClass
            )}
          >
            <div className={cn("flex flex-col h-full", isSidebarReallyOpen ? "p-4" : "p-2")}>
              <div className="flex-1 space-y-6">
                {/* System Governance (Admin Mode Only) */}
                {isAdminPath && (
                  <div>
                    {isSidebarReallyOpen ? (
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                        System Governance
                      </div>
                    ) : (
                      <div className="h-px bg-zinc-200 dark:border-zinc-800 mb-4 mx-2" />
                    )}
                    <nav className="space-y-1">
                      <SidebarItem icon={ShieldCheck} label="Global Registry" to="/admin" active={isActive('/admin')} collapsed={collapsed} />
                      <SidebarItem icon={Activity} label="Platform Health" to="/admin/health" active={isActive('/admin/health')} collapsed={collapsed} />
                      <SidebarItem icon={Cpu} label="Compute Matrix" to="/admin/compute" active={isActive('/admin/compute')} collapsed={collapsed} />
                      <SidebarItem icon={CloudUpload} label="Fleet Deploy" to="/admin/fleet" active={isActive('/admin/fleet')} collapsed={collapsed} />
                    </nav>
                  </div>
                )}

                {!isAdminPath && !isSettingsMode && resolvedConfig && (
                  <div className="space-y-6">
                    {resolvedConfig.sections.map((section) => (
                      <SidebarSectionRenderer 
                        key={section.id}
                        section={section}
                        collapsed={collapsed}
                        isActive={isActive}
                        expandedItems={expandedItems}
                        onToggleExpand={toggleExpand}
                      />
                    ))}
                  </div>
                )}

                {!isAdminPath && isSettingsMode && (
                  <div className="flex flex-col h-full">
                    <nav className={cn("mb-6", isSidebarReallyOpen ? "px-2" : "px-0")}>
                      <button
                        onClick={() => navigate('/workspace')}
                        className={cn(
                          "w-full flex items-center transition-all duration-300 group relative mb-4",
                          isSidebarReallyOpen 
                            ? "premium-pill h-9 gap-2 px-4" 
                            : "justify-center h-9 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400"
                        )}
                      >
                        <ArrowLeft size={16} className={cn("shrink-0", isSidebarReallyOpen ? "text-zinc-400 group-hover:text-white" : "")} />
                        {isSidebarReallyOpen && (
                          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 truncate">
                            Back to Workspace
                          </span>
                        )}
                      </button>

                      {isSidebarReallyOpen && (
                        <div className="relative group/search px-2">
                          <div className="absolute inset-0 bg-indigo-500/5 blur-lg rounded-xl opacity-0 group-hover/search:opacity-100 transition-opacity" />
                          <div className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 focus-within:border-indigo-500/30 transition-all">
                            <Search size={14} className="text-zinc-400 shrink-0" />
                            <input 
                              type="text"
                              placeholder="Search settings..."
                              className="w-full bg-transparent border-none outline-none text-[11px] text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400"
                              value={settingsSearchQuery}
                              onChange={(e) => setSettingsSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </nav>
                    
                    <div className={cn("flex-1 space-y-0.5 overflow-y-auto custom-scrollbar", isSidebarReallyOpen ? "px-2" : "px-0")}>
                      {filteredSettingsItems.map((item) => (
                        <SidebarItem
                          key={item.to}
                          icon={item.icon}
                          label={item.label}
                          to={item.to}
                          active={isActive(item.to)}
                          collapsed={collapsed}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1 mt-auto shrink-0">
                {layoutStyle !== 'slim' && (
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={cn(
                      "w-full flex items-center p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors",
                      isSidebarReallyOpen ? "justify-end px-3" : "justify-center px-0"
                    )}
                    title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                  >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className={cn(
          "flex-1 flex flex-col overflow-y-auto transition-all duration-300",
          layoutStyle === 'top' && !isSettingsMode && !isAdminPath 
            ? "h-[calc(100vh-7rem)]" 
            : "h-[calc(100vh-4rem)]",
          mainMarginClass,
          (isAIAssistantOpen || isChatOpen || isAppLauncherOpen || isNotificationsOpen) && "mr-96"
        )}>
          <div className={cn(
            "mx-auto flex flex-col min-h-full",
            fullBleed ? "w-full flex-1" : "max-w-7xl w-full"
          )}>
            {pathnames.length > 0 && (
              <div className="sticky top-0 z-30 h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center px-6 lg:px-12 shrink-0">
                <Breadcrumbs />
              </div>
            )}
            {children}
          </div>
        </main>
        <AnimatePresence mode="wait">
          {isAIAssistantOpen && <AIAssistant key="ai-assistant" />}
          {isChatOpen && <ChatDrawer key="chat-drawer" />}
          {isAppLauncherOpen && <AppLauncher key="app-launcher" />}
          {isNotificationsOpen && <NotificationsDrawer key="notifications-drawer" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

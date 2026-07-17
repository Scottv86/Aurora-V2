import { ReactNode, useState, useMemo, useEffect } from 'react';
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
  Layout,
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
import { cn, slugify } from '../../lib/utils';
import { SidebarItem } from '../Navigation/SidebarItem';
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
    menuConfig, 
    isAIAssistantOpen,
    isChatOpen,
    isAppLauncherOpen,
    isNotificationsOpen,
    tenant,
    isDeveloper,
    modules
  } = usePlatform();
  
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split('/').filter(x => x);
  const [isSidebarOpen, setIsSidebarOpen] = useState(location.pathname !== '/workspace/settings/builder/new');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth > 180 && newWidth < 480) {
        setSidebarWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);



  useEffect(() => {
    const path = location.pathname + location.search;
    const isSettings = path.includes('/settings');
    if (path.startsWith('/workspace') && !path.startsWith('/workspace/aurora-vibe') && !isSettings) {
      localStorage.setItem('lastPlatformPath', path);
    }
  }, [location]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isActive = (path: string) => {
    try {
      const targetUrl = new URL(path, window.location.origin);
      const currentUrl = new URL(location.pathname + location.search, window.location.origin);
      
      if (currentUrl.pathname !== targetUrl.pathname) {
        return false;
      }
      
      const targetQueueId = targetUrl.searchParams.get('queueId') || targetUrl.searchParams.get('queue');
      const currentQueueId = currentUrl.searchParams.get('queueId') || currentUrl.searchParams.get('queue');
      
      if (targetQueueId) {
        return currentQueueId === targetQueueId;
      }
      
      if (currentQueueId) {
        return false;
      }
      
      for (const [key, value] of targetUrl.searchParams.entries()) {
        if (currentUrl.searchParams.get(key) !== value) {
          return false;
        }
      }
      
      return true;
    } catch (e) {
      return location.pathname === path;
    }
  };

  const getContextualAction = () => {
    if (!isDeveloper) return null;
    
    // Check if we are viewing a custom workspace page
    // Path: /workspace/pages/:pageId
    if (pathnames[0] === 'workspace' && pathnames[1] === 'pages' && pathnames[2]) {
      const pageId = pathnames[2];
      return (
        <button
          onClick={() => navigate(`/workspace/settings/builder/page/${pageId}`)}
          className="flex items-center gap-1.5 px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-655 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all shadow-sm h-7"
        >
          <LucideIcons.Edit3 size={11} className="text-zinc-500" />
          Edit Page Layout
        </button>
      );
    }
    
    // Check if we are viewing a module page
    // Path: /workspace/modules/:moduleId
    if (pathnames[0] === 'workspace' && pathnames[1] === 'modules' && pathnames[2] && pathnames[3] !== 'records') {
      const moduleId = pathnames[2];
      return (
        <button
          onClick={() => navigate(`/workspace/settings/builder/${moduleId}`)}
          className="flex items-center gap-1.5 px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-655 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all shadow-sm h-7"
        >
          <LucideIcons.Edit3 size={11} className="text-zinc-500" />
          Configure Module
        </button>
      );
    }
    
    // Check if we are viewing the work-distribution page
    // Path: /workspace/platform/work-distribution
    if (pathnames[0] === 'workspace' && pathnames[1] === 'platform' && pathnames[2] === 'work-distribution') {
      return (
        <button
          onClick={() => navigate('/workspace/settings/platform-modules/work-distribution')}
          className="flex items-center gap-1.5 px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all shadow-sm h-7"
        >
          <LucideIcons.Edit3 size={11} className="text-zinc-500" />
          Configure Module
        </button>
      );
    }
    
    return null;
  };

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
        { label: 'Pages', icon: Layout, to: '/workspace/settings/pages' },
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
  const searchParams = new URLSearchParams(location.search);
  const isReportBuilder = (location.pathname.includes('/report-management') || location.pathname.includes('/reports')) && 
                          searchParams.get('mode') === 'builder';

  const isModuleBuilder = location.pathname.includes('/workspace/settings/builder') || 
                          location.pathname.includes('/workspace/settings/ai-builder') ||
                          isReportBuilder;

  const rawLayoutStyle = tenant?.branding?.layout_style || 'sidebar';
  const layoutStyle = (isSettingsMode || isAdminPath) ? 'sidebar' : rawLayoutStyle;

  const isSidebarReallyOpen = layoutStyle === 'top' 
    ? false 
    : (layoutStyle === 'slim' 
      ? isSidebarHovered 
      : isSidebarOpen);

  const currentWidth = isModuleBuilder || layoutStyle === 'top'
    ? 0
    : (isSidebarReallyOpen ? sidebarWidth : 64);

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

  const resolvedConfig = useMemo(() => {
    if (!menuConfig || !modules) return menuConfig;

    const processItems = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        let updatedItem = { ...item };
        
        // 1. Rewrite page URLs to use slugs
        if (item.to?.startsWith('/workspace/pages/')) {
          const pathParts = item.to.split('/');
          const pageId = pathParts[pathParts.length - 1];
          const matchedPage = modules.find(
            (m: any) => m.type === 'PAGE' && (m.id === pageId || slugify(m.name) === pageId || m.name.toLowerCase() === pageId.toLowerCase())
          );
          if (matchedPage) {
            updatedItem.to = `/workspace/pages/${slugify(matchedPage.name)}`;
          }
        }
        
        // 2. Rewrite module URLs to use slugs
        if (item.to?.startsWith('/workspace/modules/')) {
          try {
            const dummyBase = 'http://localhost';
            const urlObj = new URL(item.to, dummyBase);
            const pathParts = urlObj.pathname.split('/');
            const moduleId = pathParts[pathParts.length - 1];
            const matchedMod = modules.find(
              (m: any) => m.type !== 'PAGE' && (m.id === moduleId || slugify(m.name) === moduleId || m.name.toLowerCase() === moduleId.toLowerCase())
            );
            if (matchedMod) {
              const moduleSlug = slugify(matchedMod.name);
              const queueParam = urlObj.searchParams.get('queueId');
              if (queueParam) {
                updatedItem.to = `/workspace/modules/${moduleSlug}?queueId=${slugify(item.label)}`;
              } else {
                updatedItem.to = `/workspace/modules/${moduleSlug}`;
              }
            }
          } catch (e) {
            console.error("Failed to parse menu item URL", e);
          }
        }

        // 3. Rewrite queue URLs to use slugs
        if (item.to?.startsWith('/workspace/queues/')) {
          updatedItem.to = `/workspace/queues/${slugify(item.label)}`;
        }

        // 4. Rewrite legacy platform/intake to work-distribution
        if (item.to === '/workspace/platform/intake') {
          updatedItem.to = '/workspace/platform/work-distribution';
        }

        if (item.children) {
          updatedItem.children = processItems(item.children);
        }
        
        return updatedItem;
      });
    };

    return {
      ...menuConfig,
      sections: menuConfig.sections.map(section => ({
        ...section,
        items: processItems(section.items || [])
      }))
    };
  }, [menuConfig, modules]);

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
          <TopMegaMenu menuConfig={resolvedConfig} isDeveloper={isDeveloper} />
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
            style={{ width: `${currentWidth}px` }}
            className={cn(
              "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl z-45 overflow-y-auto overflow-x-hidden",
              (isModuleBuilder || layoutStyle === 'top') && "opacity-0 pointer-events-none border-none",
              !isResizing && "transition-all duration-300"
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

                    {resolvedConfig.sections.length === 0 && (
                      <div className={cn("text-center", collapsed ? "px-1 py-4" : "px-4 py-6 space-y-4")}>
                        {isDeveloper ? (
                          collapsed ? (
                            <button
                              onClick={() => navigate('/workspace/settings/navigation')}
                              className="w-10 h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 flex items-center justify-center transition-all mx-auto animate-pulse"
                              title="Configure Navigation"
                            >
                              <Settings2 size={18} />
                            </button>
                          ) : (
                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                              <div className="mx-auto w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Settings2 size={16} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-[11px] font-bold text-zinc-900 dark:text-white">Configure Sidebar</h4>
                                <p className="text-[9px] text-zinc-500 leading-normal">No menu items configured. Design your layout in settings.</p>
                              </div>
                              <button 
                                onClick={() => navigate('/workspace/settings/navigation')}
                                className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all shadow-sm"
                              >
                                Open Builder
                              </button>
                            </div>
                          )
                        ) : (
                          collapsed ? (
                            <div 
                              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto"
                              title="No menu items configured"
                            >
                              <LayoutDashboard size={18} />
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 space-y-2">
                              <div className="mx-auto w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <LayoutDashboard size={16} />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-[11px] font-bold text-zinc-900 dark:text-white">Welcome to Aurora</h4>
                                <p className="text-[9px] text-zinc-500 leading-normal">No menu items configured yet. Please contact your administrator.</p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isAdminPath && isSettingsMode && (
                  <div className="flex flex-col h-full">

                    
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

            {isSidebarReallyOpen && (
              <div 
                onMouseDown={startResizing}
                className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-zinc-300/45 dark:hover:bg-zinc-700/45 active:bg-zinc-400 dark:active:bg-zinc-600 transition-all z-50"
              />
            )}
          </aside>
        )}

        <main 
          style={{ marginLeft: `${currentWidth}px` }}
          className={cn(
            "flex-1 flex flex-col overflow-y-auto",
            !isResizing && "transition-all duration-300",
            layoutStyle === 'top' && !isSettingsMode && !isAdminPath 
              ? "h-[calc(100vh-7rem)]" 
              : "h-[calc(100vh-4rem)]",
            (isAIAssistantOpen || isChatOpen || isAppLauncherOpen || isNotificationsOpen) && "mr-96"
          )}
        >
          <div className={cn(
            "mx-auto flex flex-col min-h-full",
            fullBleed ? "w-full flex-1" : "max-w-7xl w-full"
          )}>
            {pathnames.length > 0 && (isSettingsMode || tenant?.branding?.show_breadcrumbs !== false) && (
              <div className="sticky top-0 z-30 h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 lg:px-12 shrink-0">
                <Breadcrumbs />
                {getContextualAction()}
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

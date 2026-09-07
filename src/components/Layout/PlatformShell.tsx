import { ReactNode, useState, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Settings2,
  LayoutDashboard,
  LayoutGrid,
  Layout,
  Building,
  CreditCard,
  Layers,
  Palette,
  Compass,
  ArrowRightLeft,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { cn, slugify } from '../../lib/utils';
import { SidebarItem } from '../Navigation/SidebarItem';
import { Navbar } from '../Navigation/Navbar';
import { Login } from '../Auth/Login';
import { TopMegaMenu } from '../Navigation/TopMegaMenu';
import { MenuSection, MenuItem } from '../../types/menu';
import { AnimatePresence, motion } from 'motion/react';
import { Breadcrumbs } from '../Navigation/Breadcrumbs';
import { GlobalDrawers } from '../Navigation/GlobalDrawers';
import { PageLoader } from '../UI/PageLoader';
import { TransitionBar } from '../UI/TransitionBar';
import { ConnectionErrorPage } from '../Error/ConnectionErrorPage';


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
      return null;
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

  const { inboxUnreadCount } = usePlatform();
  const hasChildren = item.children && item.children.length > 0;
  const isInboxItem = item.to?.includes('/apps/inbox') || item.to?.includes('/inbox') || item.id === 'inbox' || item.label?.toLowerCase() === 'inbox';
  const displayBadge = isInboxItem && inboxUnreadCount > 0 ? `${inboxUnreadCount}` : (item as any).badge;

  return (
    <div className="relative space-y-0.5">
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <SidebarItem 
            icon={IconComponent} 
            label={item.label} 
            to={item.to} 
            badge={displayBadge}
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
  onToggleExpand,
  isSectionCollapsed,
  onToggleSectionCollapse
}: { 
  section: MenuSection, 
  collapsed: boolean,
  isActive: (path: string) => boolean,
  expandedItems: Record<string, boolean>,
  onToggleExpand: (id: string) => void,
  isSectionCollapsed: boolean,
  onToggleSectionCollapse: (id: string) => void
}) => {
  const visibleItems = section.items?.filter(item => item.isVisible !== false) || [];
  if (visibleItems.length === 0) return null;
  const sectionKey = section.id || section.title;

  return (
    <div className={cn("space-y-1", collapsed && "space-y-0")}>
      {!collapsed && (
        <div className="flex items-center group/section">
          <button
            type="button"
            onClick={() => onToggleSectionCollapse(sectionKey)}
            className="flex items-center justify-between w-full px-3 py-1 -my-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/header select-none text-left cursor-pointer"
          >
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-colors truncate">
              {section.title}
            </span>
            <ChevronDown 
              size={13} 
              className={cn(
                "text-zinc-400 dark:text-zinc-500 group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-transform duration-200 shrink-0",
                isSectionCollapsed ? "-rotate-90" : "rotate-0"
              )} 
            />
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {(!isSectionCollapsed || collapsed) && (
          <motion.nav 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn("space-y-0.5", !collapsed && "overflow-hidden")}
          >
            {visibleItems.map((item) => (
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
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};



export const PlatformShell = ({ children, fullBleed }: { children: ReactNode, fullBleed?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { 
    user: platformUser,
    isLoading: platformLoading, 
    menuConfig, 
    tenant,
    isDeveloper,
    modules,
    connectionError,
    connectionErrorMessage,
    isOffline,
    refetchContext,
    isBuilderFullscreen
  } = usePlatform();

  const isTenantAdmin = isDeveloper || 
    platformUser?.role === 'TENANT_ADMIN' || 
    platformUser?.role?.toLowerCase() === 'tenant admin' || 
    platformUser?.role?.toLowerCase() === 'admin' || 
    platformUser?.isSuperAdmin === true || 
    platformUser?.licenceType === 'Developer';
  
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith('/admin');
  const isSettingsMode = location.pathname.startsWith('/workspace/settings') || location.pathname.startsWith('/dashboard/settings');
  const searchParams = new URLSearchParams(location.search);
  const isReportBuilder = (location.pathname.includes('/report-management') || location.pathname.includes('/reports')) && 
                          searchParams.get('mode') === 'builder';
  const isSolutionBuilder = (location.pathname.includes('/solutions') || location.pathname.includes('/solution')) &&
                           (searchParams.get('mode') === 'studio' || searchParams.get('mode') === 'builder' || searchParams.has('id') || searchParams.has('solutionId'));

  const isModuleBuilder = location.pathname.includes('/builder') || 
                          location.pathname.includes('/ai-builder') ||
                          location.pathname.includes('/agent-builder') ||
                          location.pathname.includes('/workspace/apps/doc-editor') ||
                          isReportBuilder ||
                          isSolutionBuilder ||
                          isBuilderFullscreen;
  const pathnames = location.pathname.split('/').filter(x => x);
  const isModuleMainView = (pathnames[0] === 'workspace' && pathnames[1] === 'modules' && pathnames[2] && pathnames[3] !== 'records') ||
    (pathnames[0] === 'workspace' && pathnames[1] === 'pages' && pathnames[3] === 'modules' && pathnames[4] && pathnames[5] !== 'records');
  const isQueueMainView = (pathnames[0] === 'workspace' && pathnames[1] === 'queues' && pathnames[2] && pathnames[3] !== 'records');
  const isPageMainView = (pathnames[0] === 'workspace' && pathnames[1] === 'pages' && pathnames[2] && pathnames[3] !== 'modules');
  const shouldHideShellBreadcrumbs = isModuleMainView || isQueueMainView || isPageMainView;
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (location.pathname === '/workspace/settings/builder/new') return false;
    const rawStyle = tenant?.branding?.layout_style || 'sidebar';
    if (rawStyle === 'slim') return false;
    return true;
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('collapsedSidebarSections');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [settingsSearchQuery] = useState('');
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

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('collapsedSidebarSections', JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save collapsed sidebar sections", e);
      }
      return next;
    });
  };

  const isActive = (path: string) => {
    try {
      const targetUrl = new URL(path, window.location.origin);
      const currentUrl = new URL(location.pathname + location.search, window.location.origin);
      
      if (targetUrl.pathname === '/workspace/settings' || targetUrl.pathname === '/workspace/settings/') {
        return currentUrl.pathname === '/workspace/settings' || currentUrl.pathname === '/workspace/settings/';
      }

      if (targetUrl.pathname.replace(/\/$/, '') === '/workspace/settings/platform-modules') {
        return currentUrl.pathname.replace(/\/$/, '') === '/workspace/settings/platform-modules';
      }

      if (currentUrl.pathname !== targetUrl.pathname) {
        if (currentUrl.pathname.startsWith(targetUrl.pathname + '/')) {
          return true;
        }
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

  const renderConfigureButton = (label: string, onClick: () => void, iconName: string = 'SlidersHorizontal') => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.SlidersHorizontal;
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-center w-7.5 h-7.5 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all shadow-2xs group shrink-0 cursor-pointer select-none"
        title={label}
      >
        <IconComponent size={14} className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
      </button>
    );
  };

  const navigateWithReturn = (targetUrl: string) => {
    const currentPath = location.pathname + location.search;
    const separator = targetUrl.includes('?') ? '&' : '?';
    const urlWithParam = `${targetUrl}${separator}returnUrl=${encodeURIComponent(currentPath)}`;
    navigate(urlWithParam, { state: { returnUrl: currentPath } });
  };

  const getContextualAction = () => {
    if (!isTenantAdmin) return null;
    
    // 1. Check if viewing a custom workspace page: /workspace/pages/:pageId
    if (pathnames[0] === 'workspace' && pathnames[1] === 'pages' && pathnames[2]) {
      if (pathnames[3] === 'modules' && pathnames[4]) {
        const moduleId = pathnames[4];
        const matchedMod = modules?.find((m: any) => m.type !== 'PAGE' && (m.id === moduleId || slugify(m.name) === moduleId || m.name.toLowerCase() === moduleId.toLowerCase()));
        const targetId = matchedMod ? matchedMod.id : moduleId;
        return renderConfigureButton(
          'Configure Module', 
          () => navigateWithReturn(`/workspace/settings/builder/${targetId}`),
          'SlidersHorizontal'
        );
      }
      const pageId = pathnames[2];
      const matchedPage = modules?.find((m: any) => m.type === 'PAGE' && (m.id === pageId || slugify(m.name) === pageId || m.name.toLowerCase() === pageId.toLowerCase()));
      const targetId = matchedPage ? matchedPage.id : pageId;
      return renderConfigureButton(
        'Configure Page', 
        () => navigateWithReturn(`/workspace/settings/builder/page/${targetId}`),
        'Layout'
      );
    }
    
    // 2. Check if viewing a custom module page or record detail view: /workspace/modules/:moduleId
    if (pathnames[0] === 'workspace' && pathnames[1] === 'modules' && pathnames[2]) {
      let moduleId = pathnames[2];
      if (pathnames[3] === 'records' && pathnames[5] === 'sub' && pathnames[6]) {
        moduleId = pathnames[6];
      }
      const matchedMod = modules?.find((m: any) => m.type !== 'PAGE' && (m.id === moduleId || slugify(m.name) === moduleId || m.name.toLowerCase() === moduleId.toLowerCase()));
      const targetId = matchedMod ? matchedMod.id : moduleId;
      return renderConfigureButton(
        'Configure Module', 
        () => navigateWithReturn(`/workspace/settings/builder/${targetId}`),
        'SlidersHorizontal'
      );
    }

    // 3. Check if viewing a queue page: /workspace/queues/:queueId
    if (pathnames[0] === 'workspace' && pathnames[1] === 'queues' && pathnames[2]) {
      if (pathnames[3] === 'modules' && pathnames[4]) {
        const moduleId = pathnames[4];
        const matchedMod = modules?.find((m: any) => m.type !== 'PAGE' && (m.id === moduleId || slugify(m.name) === moduleId || m.name.toLowerCase() === moduleId.toLowerCase()));
        const targetId = matchedMod ? matchedMod.id : moduleId;
        return renderConfigureButton(
          'Configure Module', 
          () => navigateWithReturn(`/workspace/settings/builder/${targetId}`),
          'SlidersHorizontal'
        );
      }
      return renderConfigureButton(
        'Configure Queue', 
        () => navigateWithReturn('/workspace/settings/navigation/builder'),
        'SlidersHorizontal'
      );
    }

    // 4. Platform Operations & System Modules: /workspace/platform/*
    if (pathnames[0] === 'workspace' && pathnames[1] === 'platform' && pathnames[2]) {
      const feature = pathnames[2];
      
      if (feature === 'work-distribution' || feature === 'intake') {
        return renderConfigureButton('Configure Work Distribution', () => navigateWithReturn('/workspace/settings/platform-modules/work-distribution'), 'Inbox');
      }
      if (feature === 'people-organisations' || feature === 'entities') {
        return renderConfigureButton('Configure Directory', () => navigateWithReturn('/workspace/settings/platform-modules/people-organisations'), 'Users');
      }
      if (feature === 'knowledge-base') {
        return renderConfigureButton('Configure Knowledge Base', () => navigateWithReturn('/workspace/settings/platform-modules/knowledge-base'), 'BookOpen');
      }
      if (feature === 'pricing-catalog') {
        return renderConfigureButton('Configure Pricing Catalog', () => navigateWithReturn('/workspace/settings/platform-modules/pricing-catalog'), 'Tag');
      }
      if (feature === 'inventory-manager') {
        return renderConfigureButton('Configure Inventory', () => navigateWithReturn('/workspace/settings/platform-modules/inventory-manager'), 'Boxes');
      }
      if (feature === 'global-lists') {
        return renderConfigureButton('Configure Lists', () => navigateWithReturn('/workspace/settings/platform-modules/global-lists'), 'ListTodo');
      }
      if (feature === 'workforce') {
        return renderConfigureButton('Configure Workforce', () => navigateWithReturn('/workspace/settings/platform-modules/workforce-management'), 'Users');
      }
      if (feature === 'integrations') {
        return renderConfigureButton('Configure Integrations', () => navigateWithReturn('/workspace/settings/platform-modules/integration-management'), 'Plug');
      }
      if (feature === 'sites') {
        return renderConfigureButton('Configure Sites', () => navigateWithReturn('/workspace/settings/platform-modules/sites'), 'Globe');
      }
      if (feature === 'automations') {
        return renderConfigureButton('Configure Automations', () => navigateWithReturn('/workspace/settings/platform-modules/automation-management'), 'Zap');
      }
      if (feature === 'templates') {
        return renderConfigureButton('Configure Templates', () => navigateWithReturn('/workspace/settings/platform-modules/document-generation'), 'FileText');
      }
      if (feature === 'reports') {
        return renderConfigureButton('Configure Reports', () => navigateWithReturn('/workspace/settings/platform-modules/report-management'), 'BarChart2');
      }
      if (feature === 'api') {
        return renderConfigureButton('Configure API', () => navigateWithReturn('/workspace/settings/platform-modules/api-management'), 'Key');
      }
      if (feature === 'records-management') {
        return renderConfigureButton('Configure Records', () => navigateWithReturn('/workspace/settings/platform-modules/records-management'), 'Archive');
      }
    }

    // 5. Utility Apps: /workspace/apps/*
    if (pathnames[0] === 'workspace' && pathnames[1] === 'apps' && pathnames[2]) {
      const appName = pathnames[2];
      if (appName === 'docs') {
        return renderConfigureButton('Configure Documents', () => navigateWithReturn('/workspace/settings/platform-modules/document-generation'), 'FileText');
      }
      if (appName === 'drive') {
        return renderConfigureButton('Configure Storage', () => navigateWithReturn('/workspace/settings/platform-modules/records-management'), 'Folder');
      }
    }

    // 6. Analytics: /workspace/analytics
    if (pathnames[0] === 'workspace' && pathnames[1] === 'analytics') {
      return renderConfigureButton('Configure Reports', () => navigateWithReturn('/workspace/settings/platform-modules/report-management'), 'BarChart2');
    }

    // 7. My Work: /workspace/my-work
    if (pathnames[0] === 'workspace' && pathnames[1] === 'my-work') {
      return renderConfigureButton('Configure Work Queue', () => navigateWithReturn('/workspace/settings/platform-modules/work-distribution'), 'ClipboardList');
    }
    
    return null;
  };

  const SETTINGS_NAV_GROUPS = [
    {
      category: 'General & Security',
      icon: LucideIcons.ShieldCheck,
      items: [
        { label: 'Overview', icon: LayoutDashboard, to: '/workspace/settings' },
        { label: 'Organisation', icon: Building, to: '/workspace/settings/organization' },
        { label: 'Workforce & Access', icon: LucideIcons.Users, to: '/workspace/settings/platform-modules/workforce-management' },
        { label: 'Subscription', icon: CreditCard, to: '/workspace/settings/subscription' },
        { label: 'AI Services', icon: Sparkles, to: '/workspace/settings/ai-services' },
        { label: 'Email & Inboxes', icon: LucideIcons.Mail, to: '/workspace/settings/email-connections' },
        { label: 'Branding', icon: Palette, to: '/workspace/settings/branding' },
        { label: 'Notifications', icon: LucideIcons.Bell, to: '/workspace/settings/notifications' },
      ]
    },
    {
      category: 'Build & Customize',
      icon: Layout,
      items: [
        { label: 'Solutions', icon: LucideIcons.Boxes, to: '/workspace/settings/platform-modules/solutions' },
        { label: 'Modules', icon: Layers, to: '/workspace/settings/platform-modules' },
        { label: 'Lists', icon: LucideIcons.ListTodo, to: '/workspace/settings/platform-modules/global-lists' },
        { label: 'Queries', icon: LucideIcons.Database, to: '/workspace/settings/platform-modules/queries-library' },
        { label: 'Rules', icon: LucideIcons.ShieldCheck, to: '/workspace/settings/platform-modules/validations-library' },
        { label: 'Integrations', icon: LucideIcons.Plug, to: '/workspace/settings/platform-modules/integration-management' },
        { label: 'Workflows', icon: LucideIcons.GitBranch, to: '/workspace/settings/platform-modules/workflows-library' },
        { label: 'Automations', icon: LucideIcons.Zap, to: '/workspace/settings/platform-modules/automation-management' },
        { label: 'Queues', icon: LucideIcons.ListOrdered, to: '/workspace/settings/platform-modules/queues-management' },
        { label: 'Agents', icon: LucideIcons.Bot, to: '/workspace/settings/platform-modules/agents' },
        { label: 'Forms', icon: LucideIcons.FileText, to: '/workspace/settings/platform-modules/forms-library' },
        { label: 'Pages', icon: Layout, to: '/workspace/settings/pages' },
        { label: 'Menus', icon: Compass, to: '/workspace/settings/navigation' },
        { label: 'Sites', icon: LucideIcons.Globe, to: '/workspace/settings/platform-modules/sites' },
        { label: 'Templates', icon: LucideIcons.FileText, to: '/workspace/settings/platform-modules/document-generation' },
        { label: 'Reports', icon: LucideIcons.BarChart2, to: '/workspace/settings/platform-modules/report-management' },
      ]
    },

    {
      category: 'Develop',
      icon: LucideIcons.Code2,
      items: [
        { label: 'Data Migration', icon: ArrowRightLeft, to: '/workspace/settings/migration' },
        { label: 'API Management', icon: LucideIcons.Key, to: '/workspace/settings/platform-modules/api-management' },
        { label: 'Testing', icon: LucideIcons.FlaskConical, to: '/workspace/settings/testing' },
      ]
    },

    {
      category: 'Configure',
      icon: LucideIcons.Sliders,
      items: [
        { label: 'Work Distribution', icon: LucideIcons.Inbox, to: '/workspace/settings/platform-modules/work-distribution' },
        { label: 'Financial Management', icon: LucideIcons.Banknote, to: '/workspace/settings/platform-modules/financial-management' },
        { label: 'Pricing Catalog', icon: LucideIcons.Tag, to: '/workspace/settings/platform-modules/pricing-catalog' },
        { label: 'Inventory Manager', icon: LucideIcons.Boxes, to: '/workspace/settings/platform-modules/inventory-manager' },
        { label: 'People & Organisations', icon: LucideIcons.Users, to: '/workspace/settings/platform-modules/people-organisations' },
      ]
    },
    {
      category: 'Analytics & Content',
      icon: LucideIcons.BarChart2,
      items: [
        { label: 'Knowledge Base', icon: LucideIcons.BookOpen, to: '/workspace/settings/platform-modules/knowledge-base' },
        { label: 'Records Management', icon: LucideIcons.Archive, to: '/workspace/settings/platform-modules/records-management' },
      ]
    }

  ];


  const filteredSettingsGroups = useMemo(() => {
    if (!settingsSearchQuery) return SETTINGS_NAV_GROUPS;
    const query = settingsSearchQuery.toLowerCase();
    
    return SETTINGS_NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(query) ||
        group.category.toLowerCase().includes(query)
      )
    })).filter(group => group.items.length > 0);
  }, [settingsSearchQuery]);

  const rawLayoutStyle = tenant?.branding?.layout_style || 'sidebar';
  const layoutStyle = (isSettingsMode || isAdminPath) ? 'sidebar' : rawLayoutStyle;

  const isSidebarReallyOpen = layoutStyle === 'top' ? false : isSidebarOpen;

  const currentWidth = isModuleBuilder || isBuilderFullscreen || layoutStyle === 'top'
    ? 0
    : (isSidebarReallyOpen ? sidebarWidth : 64);

  const collapsed = !isSidebarReallyOpen;

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
    return <PageLoader label="Loading your workspace..." />;
  }

  if (isOffline || connectionError) {
    return (
      <ConnectionErrorPage 
        isOffline={isOffline}
        errorMessage={connectionErrorMessage || undefined}
        onRetry={refetchContext}
      />
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      <TransitionBar />
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
      {!isBuilderFullscreen && !isModuleBuilder && <Navbar />}

      {/* Top Mounted Mega Menu */}
      {layoutStyle === 'top' && !isSettingsMode && !isAdminPath && (
        <div className="sticky top-16 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-12 flex items-center px-6 lg:px-12 w-full shrink-0">
          <TopMegaMenu menuConfig={resolvedConfig} isDeveloper={isTenantAdmin} />
        </div>
      )}

      <div className="flex">
        {!isModuleBuilder && !isBuilderFullscreen && layoutStyle !== 'top' && (
          <aside 
            style={{ width: `${currentWidth}px` }}
            className={cn(
              "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-45 flex flex-col",
              (isModuleBuilder || isBuilderFullscreen || layoutStyle === 'top') && "opacity-0 pointer-events-none border-none",
              !isResizing && !isModuleBuilder && !isBuilderFullscreen && "transition-all duration-300"
            )}
          >
            <div className={cn("flex-1 min-h-0 overflow-y-auto custom-scrollbar", isSidebarReallyOpen ? "p-4 overflow-x-hidden" : "p-2 overflow-x-visible")}>
              <div className={cn(collapsed ? "space-y-1" : "space-y-6")}>
                {/* System Governance / Super Admin Mode */}
                {isAdminPath && (
                  <div className={cn("flex flex-col h-full", isSidebarReallyOpen ? "space-y-6" : "space-y-1")}>
                    {isSidebarReallyOpen && (
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        Super Admin Suite
                      </div>
                    )}
                    
                    <div className={cn("overflow-y-auto custom-scrollbar flex-1", isSidebarReallyOpen ? "space-y-6" : "space-y-1")}>
                      {[
                        {
                          category: 'Overview',
                          items: [
                            { label: 'Dashboard', icon: LucideIcons.LayoutDashboard, to: '/admin' },
                          ]
                        },
                        {
                          category: 'Tenants & Users',
                          items: [
                            { label: 'Tenants', icon: LucideIcons.Globe, to: '/admin/tenants' },
                            { label: 'Users', icon: LucideIcons.Users, to: '/admin/users' },
                            { label: 'Roles & Permissions', icon: LucideIcons.ShieldCheck, to: '/admin/roles-access' },
                          ]
                        },
                        {
                          category: 'Billing & Revenue',
                          items: [
                            { label: 'Subscriptions', icon: LucideIcons.CreditCard, to: '/admin/subscriptions' },
                            { label: 'Revenue Analytics', icon: LucideIcons.TrendingUp, to: '/admin/revenue' },
                          ]
                        },
                        {
                          category: 'Infrastructure & Servers',
                          items: [
                            { label: 'Cloud Resources', icon: LucideIcons.Zap, to: '/admin/provisioning' },
                            { label: 'Server Usage', icon: LucideIcons.Activity, to: '/admin/server-loads' },
                            { label: 'Storage & Backups', icon: LucideIcons.Database, to: '/admin/storage' },
                          ]
                        },
                        {
                          category: 'Health & AI Monitoring',
                          items: [
                            { label: 'System Health', icon: LucideIcons.HeartPulse, to: '/admin/health' },
                            { label: 'AI Usage & Costs', icon: LucideIcons.Sparkles, to: '/admin/ai-monitoring' },
                            { label: 'Performance Metrics', icon: LucideIcons.Gauge, to: '/admin/system-monitoring' },
                          ]
                        },
                        {
                          category: 'Logs & Support',
                          items: [
                            { label: 'Audit Logs', icon: LucideIcons.FileText, to: '/admin/logs' },
                            { label: 'Support Tickets', icon: LucideIcons.Bug, to: '/admin/bugs' },
                            { label: 'Platform Updates', icon: LucideIcons.Code, to: '/admin/development' },
                          ]
                        },
                        {
                          category: 'Governance',
                          items: [
                            { label: 'Admin Settings', icon: LucideIcons.Settings2, to: '/admin/settings' },
                          ]
                        }
                      ].map((group) => {
                        const isGroupCollapsed = !!collapsedSections[`admin_${group.category}`];
                        return (
                          <div key={group.category} className={cn("space-y-1", !isSidebarReallyOpen && "space-y-0")}>
                            {isSidebarReallyOpen && (
                              <button
                                type="button"
                                onClick={() => toggleSectionCollapse(`admin_${group.category}`)}
                                className="flex items-center justify-between w-full px-3 py-1 -my-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/header select-none text-left cursor-pointer"
                              >
                                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-colors truncate">
                                  {group.category}
                                </span>
                                <ChevronDown 
                                  size={13} 
                                  className={cn(
                                    "text-zinc-400 dark:text-zinc-500 group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-transform duration-200 shrink-0",
                                    isGroupCollapsed ? "-rotate-90" : "rotate-0"
                                  )} 
                                />
                              </button>
                            )}
                            <AnimatePresence initial={false}>
                              {(!isGroupCollapsed || !isSidebarReallyOpen) && (
                                <motion.nav 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className={cn("space-y-0.5", isSidebarReallyOpen && "overflow-hidden")}
                                >
                                  {group.items.map((item, idx) => (
                                    <SidebarItem
                                      key={`${item.to}-${item.label}-${idx}`}
                                      icon={item.icon}
                                      label={item.label}
                                      to={item.to}
                                      active={isActive(item.to)}
                                      collapsed={collapsed}
                                    />
                                  ))}
                                </motion.nav>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isAdminPath && !isSettingsMode && resolvedConfig && (
                  <div className={cn(collapsed ? "space-y-1" : "space-y-6")}>
                    {resolvedConfig.sections.map((section) => (
                      <SidebarSectionRenderer 
                        key={section.id}
                        section={section}
                        collapsed={collapsed}
                        isActive={isActive}
                        expandedItems={expandedItems}
                        onToggleExpand={toggleExpand}
                        isSectionCollapsed={!!collapsedSections[section.id || section.title]}
                        onToggleSectionCollapse={toggleSectionCollapse}
                      />
                    ))}

                    {resolvedConfig.sections.length === 0 && (
                      <div className={cn("text-center", collapsed ? "px-1 py-4" : "px-4 py-6 space-y-4")}>
                        {isTenantAdmin ? (
                          collapsed ? (
                            <button
                              onClick={() => navigateWithReturn('/workspace/settings/navigation/builder')}
                              className="w-10 h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 flex items-center justify-center transition-all mx-auto animate-pulse"
                              title="Configure Menu"
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
                                onClick={() => navigateWithReturn('/workspace/settings/navigation/builder')}
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
                  <div className={cn("flex flex-col h-full", isSidebarReallyOpen ? "space-y-6" : "space-y-1")}>
                    {isSidebarReallyOpen && (
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                        Settings Suite
                      </div>
                    )}

                    <div className={cn("overflow-y-auto custom-scrollbar flex-1", isSidebarReallyOpen ? "space-y-6" : "space-y-1")}>
                      {filteredSettingsGroups.map((group) => {
                        const isGroupCollapsed = !settingsSearchQuery && !!collapsedSections[`settings_${group.category}`];
                        return (
                          <div key={group.category} className={cn("space-y-1", !isSidebarReallyOpen && "space-y-0")}>
                            {isSidebarReallyOpen && (
                              <button
                                type="button"
                                onClick={() => toggleSectionCollapse(`settings_${group.category}`)}
                                className="flex items-center justify-between w-full px-3 py-1 -my-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group/header select-none text-left cursor-pointer"
                              >
                                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-colors truncate">
                                  {group.category}
                                </span>
                                <ChevronDown 
                                  size={13} 
                                  className={cn(
                                    "text-zinc-400 dark:text-zinc-500 group-hover/header:text-zinc-600 dark:group-hover/header:text-zinc-300 transition-transform duration-200 shrink-0",
                                    isGroupCollapsed ? "-rotate-90" : "rotate-0"
                                  )} 
                                />
                              </button>
                            )}
                            <AnimatePresence initial={false}>
                              {(!isGroupCollapsed || !isSidebarReallyOpen) && (
                                <motion.nav 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className={cn("space-y-0.5", isSidebarReallyOpen && "overflow-hidden")}
                                >
                                  {group.items.map((item, idx) => (
                                    <SidebarItem
                                      key={`${item.to}-${item.label}-${idx}`}
                                      icon={item.icon}
                                      label={item.label}
                                      to={item.to}
                                      active={isActive(item.to)}
                                      collapsed={collapsed}
                                    />
                                  ))}
                                </motion.nav>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              let lastPlatformPath = localStorage.getItem('lastPlatformPath') || '/workspace';
              if (lastPlatformPath.includes('/settings')) {
                lastPlatformPath = '/workspace';
              }
              return (
                <div className={cn(
                  "shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center w-full transition-all duration-300",
                  isSidebarReallyOpen ? "h-12" : "h-auto py-2 px-1.5 flex-col gap-1.5"
                )}>
                  {!isAdminPath && (
                    <div className={cn("min-w-0", isSidebarReallyOpen ? "flex-1 px-2" : "w-full")}>
                      <SidebarItem
                        icon={isSettingsMode ? LayoutGrid : Settings}
                        label={isSettingsMode ? "Workspace" : "Settings"}
                        onClick={() => {
                          if (isSettingsMode) {
                            navigate(lastPlatformPath);
                          } else {
                            navigate('/workspace/settings');
                          }
                        }}
                        collapsed={collapsed}
                      />
                    </div>
                  )}

                  {!isAdminPath && !isSettingsMode && (
                    isSidebarReallyOpen ? (
                      <button
                        onClick={() => navigateWithReturn('/workspace/settings/navigation/builder')}
                        className="h-full px-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-colors shrink-0 flex items-center justify-center border-l border-zinc-200 dark:border-zinc-800 cursor-pointer"
                        title="Configure Navigation Menu"
                      >
                        <SlidersHorizontal size={15} />
                      </button>
                    ) : (
                      <div className="w-full">
                        <SidebarItem
                          icon={SlidersHorizontal}
                          label="Navigation Builder"
                          onClick={() => navigateWithReturn('/workspace/settings/navigation/builder')}
                          collapsed={collapsed}
                        />
                      </div>
                    )
                  )}

                  {isSidebarReallyOpen ? (
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className={cn(
                        "h-full px-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-colors shrink-0 flex items-center justify-center cursor-pointer",
                        !isAdminPath ? "border-l border-zinc-200 dark:border-zinc-800" : "ml-auto"
                      )}
                      title="Collapse Sidebar"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  ) : (
                    <div className="w-full">
                      <SidebarItem
                        icon={ChevronRight}
                        label="Expand Sidebar"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        collapsed={collapsed}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

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
            "flex-1 flex flex-col min-h-0",
            (fullBleed || isAdminPath || isBuilderFullscreen || isModuleBuilder) ? "overflow-hidden" : "overflow-y-auto",
            !isResizing && !isModuleBuilder && !isBuilderFullscreen && "transition-all duration-300",
            (isBuilderFullscreen || isModuleBuilder)
              ? "h-screen" 
              : (layoutStyle === 'top' && !isSettingsMode && !isAdminPath 
                  ? "h-[calc(100vh-7rem)]" 
                  : "h-[calc(100vh-4rem)]")
          )}
        >
          <div className={cn(
            "mx-auto flex flex-col min-h-0 flex-1 h-full",
            (fullBleed || isAdminPath || isBuilderFullscreen || isModuleBuilder) ? "w-full flex-1 h-full" : "max-w-7xl w-full"
          )}>
            {pathnames.length > 0 && !isModuleBuilder && !isBuilderFullscreen && !shouldHideShellBreadcrumbs && (isSettingsMode || tenant?.branding?.show_breadcrumbs !== false || isTenantAdmin) && (
              <div className="sticky top-0 z-30 h-10 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shrink-0">
                <Breadcrumbs />
                {getContextualAction()}
              </div>
            )}
            {children}
          </div>
        </main>
        <GlobalDrawers />
      </div>
    </div>
  );
};

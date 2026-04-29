import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';
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
  GripVertical,
  Eye,
  EyeOff,
  Save,
  Edit2,
  X,
  Plus,
  Trash2,
  Search,
  Settings2,
  ChevronDown,
  LayoutDashboard,
  Building,
  UserCircle,
  CreditCard,
  BarChart2,
  Layers,
  Plug,
  Zap,
  ClipboardList,
  FileText,
  ListTodo,
  Terminal,
  Database,
  Lock,
  History,
  MessageSquare,
  BarChart,
  BookOpen,
  Key,
  TestTube,
  RotateCcw,
  Palette,
  Globe,
  LayoutGrid,
  Code2,
  Wrench,
  ArrowRightLeft,
  Banknote,
  Tag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';
import { SidebarItem } from '../Navigation/SidebarItem';
import { Navbar } from '../Navigation/Navbar';
import { Login } from '../Auth/Login';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuSection, MenuItem } from '../../types/menu';
import { AIAssistant } from '../AI/AIAssistant';
import { ChatDrawer } from '../AI/ChatDrawer';
import { AnimatePresence, motion } from 'motion/react';
import { Breadcrumbs } from '../Navigation/Breadcrumbs';
import { AppLauncher } from '../Navigation/AppLauncher';
import { NotificationsDrawer } from '../Navigation/NotificationsDrawer';

const SortableSidebarItem = ({ 
  item, 
  isEditMode, 
  collapsed, 
  active, 
  onToggleVisibility 
}: { 
  item: MenuItem, 
  isEditMode: boolean, 
  collapsed: boolean, 
  active: boolean,
  onToggleVisibility: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const IconComponent = (LucideIcons as any)[item.iconName] || LucideIcons.Box;

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      <div className={cn("flex items-center gap-1", isEditMode && !collapsed && "pr-2")}>
        {isEditMode && !collapsed && (
          <div {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <GripVertical size={14} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <SidebarItem 
            icon={IconComponent} 
            label={item.label} 
            to={item.to} 
            active={active} 
            collapsed={collapsed}
            className={cn(!item.isVisible && "opacity-50 grayscale")}
          />
        </div>
        {isEditMode && !collapsed && (
          <button 
            type="button"
            onClick={() => onToggleVisibility(item.id)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            {item.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};

const SortableSection = ({ 
  section, 
  isEditMode, 
  collapsed, 
  isActive, 
  sensors, 
  onDragEnd, 
  onToggleVisibility,
  onRename,
  onDelete
}: { 
  section: MenuSection, 
  isEditMode: boolean, 
  collapsed: boolean,
  isActive: (path: string) => boolean,
  sensors: any,
  onDragEnd: (event: DragEndEvent, sectionId: string) => void,
  onToggleVisibility: (itemId: string) => void,
  onRename: (id: string, name: string) => void,
  onDelete: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-center group/section">
        {isEditMode && !collapsed && (
          <div {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 opacity-0 group-hover/section:opacity-100 transition-opacity">
            <GripVertical size={12} />
          </div>
        )}
        {collapsed ? (
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4 mx-2" />
        ) : (
          <div className="flex items-center justify-between w-full px-3">
            {isEditMode ? (
              <input 
                value={section.title}
                onChange={(e) => onRename(section.id, e.target.value)}
                className="text-[10px] font-bold text-zinc-500 bg-transparent border-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full uppercase tracking-[0.2em]"
              />
            ) : (
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{section.title}</p>
            )}
            {isEditMode && (
              <button 
                type="button"
                onClick={() => onDelete(section.id)}
                className="p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover/section:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onDragEnd(e, section.id)}
      >
        <SortableContext
          items={section.items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <nav className="space-y-0.5">
            {section.items.map((item) => (
              (item.isVisible || isEditMode) && (
                <SortableSidebarItem 
                  key={item.id} 
                  item={item} 
                  isEditMode={isEditMode} 
                  collapsed={collapsed} 
                  active={item.to ? isActive(item.to) : false}
                  onToggleVisibility={onToggleVisibility}
                />
              )
            ))}
          </nav>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const SidebarAccordion = ({ 
  label, 
  icon: Icon, 
  items, 
  isOpen, 
  onToggle, 
  collapsed,
  isActive
}: { 
  label: string, 
  icon: any, 
  items: any[], 
  isOpen: boolean, 
  onToggle: () => void,
  collapsed: boolean,
  isActive: (to: string) => boolean
}) => {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group",
          collapsed ? "justify-center" : "justify-between",
          isOpen && !collapsed ? "bg-zinc-100 dark:bg-white/5" : "hover:bg-zinc-50 dark:hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon size={16} className={cn(
            "shrink-0 transition-colors",
            isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
          )} />
          {!collapsed && (
            <span className={cn(
              "text-sm font-medium transition-colors text-left leading-tight truncate",
              isOpen ? "text-zinc-900 dark:text-white" : "text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-400"
            )}>
              {label}
            </span>
          )}
        </div>
        {!collapsed && (
          <ChevronDown 
            size={12} 
            className={cn(
              "text-zinc-400 transition-transform duration-300",
              isOpen ? "rotate-180" : "rotate-0"
            )} 
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2 pl-4 space-y-0.5 border-l border-zinc-100 dark:border-white/5 ml-5 mt-1">
              {items.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  to={item.to}
                  active={isActive(item.to)}
                  collapsed={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    user: platformUser, 
    isLoading: platformLoading, 
    isDeveloper, 
    modules, 
    menuConfig, 
    updateMenuConfig, 
    setMenuConfig,
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');

  const toggleAccordion = (label: string) => {
    setOpenAccordions(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (path: string) => location.pathname === path;

  const SETTINGS_NAV_GROUPS = [
    {
      category: 'General',
      icon: Settings2,
      items: [
        { label: 'Overview', icon: LayoutDashboard, to: '/workspace/settings' },
        { label: 'Organisation', icon: Building, to: '/workspace/settings/organization' },
        { label: 'Billing & Plan', icon: CreditCard, to: '/workspace/settings/billing' },
        { label: 'Model Usage', icon: BarChart2, to: '/workspace/settings/usage' },
      ]
    },
    {
      category: 'Look & Feel',
      icon: Palette,
      items: [
        { label: 'Appearance', icon: Palette, to: '/workspace/settings/appearance' },
      ]
    },
    {
      category: 'Apps & Websites',
      icon: Globe,
      items: [
        { label: 'Sites', icon: Globe, to: '/workspace/settings/sites' },
      ]
    },
    {
      category: 'People & Teams',
      icon: LucideIcons.Users,
      items: [
        { label: 'Workforce', icon: UserCircle, to: '/workspace/settings/workforce' },
      ]
    },
    {
      category: 'Billing & Payments',
      icon: Banknote,
      items: [
        { label: 'Finance', icon: Banknote, to: '/workspace/settings/finance' },
        { label: 'Fees & Products', icon: Tag, to: '/workspace/settings/fees-products' },
      ]
    },
    {
      category: 'Modules & Apps',
      icon: LucideIcons.Layout,
      items: [
        { label: 'Modules', icon: Layers, to: '/workspace/settings/modules' },
        { label: 'Platform Modules', icon: Cpu, to: '/workspace/settings/platform-modules' },
        { label: 'Apps', icon: LayoutGrid, to: '/workspace/settings/apps' },
      ]
    },
    {
      category: 'Automations & Sync',
      icon: Zap,
      items: [
        { label: 'Automations', icon: Zap, to: '/workspace/settings/automations' },
        { label: 'Connectors', icon: Plug, to: '/workspace/settings/connectors' },
      ]
    },
    {
      category: 'Forms & Templates',
      icon: ClipboardList,
      items: [
        { label: 'Intake', icon: ClipboardList, to: '/workspace/settings/intake' },
        { label: 'Templates', icon: FileText, to: '/workspace/settings/templates' },
      ]
    },
    {
      category: 'Data & Logic',
      icon: Terminal,
      items: [
        { label: 'Logic', icon: Terminal, to: '/workspace/settings/logic' },
        { label: 'Database', icon: Database, to: '/workspace/settings/database' },
        { label: 'Records', icon: Database, to: '/workspace/settings/records' },
        { label: 'Lists', icon: ListTodo, to: '/workspace/settings/lists' },
        { label: 'Migration Tools', icon: ArrowRightLeft, to: '/workspace/settings/migration' },
      ]
    },
    {
      category: 'Security & Activity',
      icon: LucideIcons.Shield,
      items: [
        { label: 'Security', icon: Lock, to: '/workspace/settings/security' },
        { label: 'Audit Log', icon: History, to: '/workspace/settings/audit' },
        { label: 'Message Logs', icon: MessageSquare, to: '/workspace/settings/messaging' },
      ]
    },
    {
      category: 'Reporting',
      icon: BarChart,
      items: [
        { label: 'Reports', icon: BarChart, to: '/workspace/settings/reports' },
      ]
    },
    {
      category: 'Knowledge',
      icon: BookOpen,
      items: [
        { label: 'Knowledge Base', icon: BookOpen, to: '/workspace/settings/knowledge' },
      ]
    },
    {
      category: 'Development',
      icon: Code2,
      items: [
        { label: 'Developer API', icon: Key, to: '/workspace/settings/api' },
        { label: 'Testing', icon: TestTube, to: '/workspace/settings/testing' },
        { label: 'Releases', icon: CloudUpload, to: '/workspace/settings/deploy' },
      ]
    },
    {
      category: 'Maintenance',
      icon: Wrench,
      items: [
        { label: 'Factory Reset', icon: RotateCcw, to: '/workspace/settings/reset' },
      ]
    }
  ];

  const filteredSettingsGroups = useMemo(() => {
    if (!settingsSearchQuery) return SETTINGS_NAV_GROUPS;
    const query = settingsSearchQuery.toLowerCase();
    
    return SETTINGS_NAV_GROUPS.map(group => {
      const filteredItems = group.items.filter(item => 
        item.label.toLowerCase().includes(query)
      );
      if (filteredItems.length > 0) {
        return { ...group, items: filteredItems };
      }
      return null;
    }).filter(Boolean) as typeof SETTINGS_NAV_GROUPS;
  }, [settingsSearchQuery, SETTINGS_NAV_GROUPS]);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isSettingsMode = location.pathname.startsWith('/workspace/settings') || location.pathname.startsWith('/dashboard/settings');
  const isNewBuilder = location.pathname === '/workspace/settings/builder/new';

  const lastPathname = useRef(location.pathname);

  useEffect(() => {
    if (isSettingsMode) {
      const newOpen = new Set(openAccordions);
      let changed = false;

      // Expand matches for search - this should always happen while searching
      if (settingsSearchQuery) {
        filteredSettingsGroups.forEach(group => {
          if (!newOpen.has(group.category)) {
            newOpen.add(group.category);
            changed = true;
          }
        });
      }

      // Auto-expand on navigation ONLY if the path actually changed
      if (location.pathname !== lastPathname.current) {
        SETTINGS_NAV_GROUPS.forEach(group => {
          if (group.items.some(item => isActive(item.to))) {
            if (!newOpen.has(group.category)) {
              newOpen.add(group.category);
              changed = true;
            }
          }
        });
        lastPathname.current = location.pathname;
      }

      if (changed) setOpenAccordions(newOpen);
    }
  }, [location.pathname, isSettingsMode, settingsSearchQuery, filteredSettingsGroups]);

  // Automatically collapse sidebar ONLY when entering the module builder for a new module
  // and expand it when leaving that specific page
  useEffect(() => {
    if (isNewBuilder) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isNewBuilder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
       activationConstraint: {
         distance: 8,
       },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const enabledModules = modules.filter(m => m.status === 'ACTIVE');

  const resolvedConfig = useMemo(() => {
    if (!menuConfig) return null;

    // Inject active modules that are missing from the configuration
    const sections = menuConfig.sections.map(section => {
      if (section.id === 'modules') {
        // Only include items that are in enabledModules (in case some were deactivated but not yet removed from saved config)
        const activeModuleIds = new Set(enabledModules.map(m => `module:${m.id}`));
        const currentItems = section.items
          .filter(i => activeModuleIds.has(i.id))
          .map(item => {
            const mod = enabledModules.find(m => `module:${m.id}` === item.id);
            return mod ? { 
              ...item, 
              label: mod.name, 
              iconName: mod.iconName || item.iconName 
            } : item;
          });
        const existingModuleIds = new Set(currentItems.map(i => i.id));

        const newModules = enabledModules
          .filter(m => !existingModuleIds.has(`module:${m.id}`))
          .map(m => ({
            id: `module:${m.id}`,
            label: m.name,
            iconName: m.iconName || 'Box',
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
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center relative overflow-hidden">
        <AuroraBackground />
        <div className="relative z-10 p-8 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Initializing Aurora</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menuConfig) return;

    // Handle Item Reordering
    const sectionIndex = menuConfig.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex !== -1) {
      const oldItemIndex = menuConfig.sections[sectionIndex].items.findIndex(i => i.id === active.id);
      const newItemIndex = menuConfig.sections[sectionIndex].items.findIndex(i => i.id === over.id);

      if (oldItemIndex !== -1 && newItemIndex !== -1) {
        const newSections = [...menuConfig.sections];
        newSections[sectionIndex] = {
          ...newSections[sectionIndex],
          items: arrayMove(newSections[sectionIndex].items, oldItemIndex, newItemIndex)
        };
        setMenuConfig({ ...menuConfig, sections: newSections });
        return;
      }
    }

    // Handle Section Reordering
    const oldSectionIndex = menuConfig.sections.findIndex(s => s.id === active.id);
    const newSectionIndex = menuConfig.sections.findIndex(s => s.id === over.id);

    if (oldSectionIndex !== -1 && newSectionIndex !== -1) {
      setMenuConfig({
        ...menuConfig,
        sections: arrayMove(menuConfig.sections, oldSectionIndex, newSectionIndex)
      });
    }
  };

  const toggleItemVisibility = (itemId: string) => {
    if (!menuConfig) return;
    const newSections = menuConfig.sections.map(section => ({
      ...section,
      items: section.items.map(item => 
        item.id === itemId ? { ...item, isVisible: !item.isVisible } : item
      )
    }));
    setMenuConfig({ ...menuConfig, sections: newSections });
  };

  const renameSection = (sectionId: string, newTitle: string) => {
    if (!menuConfig) return;
    const newSections = menuConfig.sections.map(section => 
      section.id === sectionId ? { ...section, title: newTitle } : section
    );
    setMenuConfig({ ...menuConfig, sections: newSections });
  };

  const deleteSection = (sectionId: string) => {
    if (!menuConfig) return;
    // Don't delete the last section or critical sections?
    setMenuConfig({
      ...menuConfig,
      sections: menuConfig.sections.filter(s => s.id !== sectionId)
    });
  };

  const addSection = () => {
    if (!menuConfig) return;
    const newSection: MenuSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      items: []
    };
    setMenuConfig({
      ...menuConfig,
      sections: [...menuConfig.sections, newSection]
    });
  };

  const handleSave = async (scope: 'user' | 'tenant') => {
    if (!resolvedConfig) return;
    // We save the resolved config so that any new modules are persisted where they were placed
    await updateMenuConfig(resolvedConfig, scope);
    setIsEditMode(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
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
      <div className="flex">
        <aside className={cn(
          "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300 z-40 overflow-y-auto overflow-x-hidden",
          isSidebarOpen ? "w-64" : "w-16"
        )}>
          <div className={cn("flex flex-col h-full", isSidebarOpen ? "p-4" : "p-2")}>
            <div className="flex-1 space-y-6">
              {/* System Governance (Admin Mode Only) */}
              {isAdminPath && (
                <div>
                  {isSidebarOpen ? (
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                      System Governance
                    </div>
                  ) : (
                    <div className="h-px bg-zinc-200 dark:border-zinc-800 mb-4 mx-2" />
                  )}
                  <nav className="space-y-1">
                    <SidebarItem icon={ShieldCheck} label="Global Registry" to="/admin" active={isActive('/admin')} collapsed={!isSidebarOpen} />
                    <SidebarItem icon={Activity} label="Platform Health" to="/admin/health" active={isActive('/admin/health')} collapsed={!isSidebarOpen} />
                    <SidebarItem icon={Cpu} label="Compute Matrix" to="/admin/compute" active={isActive('/admin/compute')} collapsed={!isSidebarOpen} />
                    <SidebarItem icon={CloudUpload} label="Fleet Deploy" to="/admin/fleet" active={isActive('/admin/fleet')} collapsed={!isSidebarOpen} />
                  </nav>
                </div>
              )}

              {!isAdminPath && !isSettingsMode && resolvedConfig && (
                <div className="space-y-8">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'ROOT_SECTIONS')}
                  >
                    <SortableContext
                      items={resolvedConfig.sections.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-6">
                        {resolvedConfig.sections.map((section) => (
                          <SortableSection 
                            key={section.id}
                            section={section}
                            isEditMode={isEditMode}
                            collapsed={!isSidebarOpen}
                            isActive={isActive}
                            sensors={sensors}
                            onDragEnd={handleDragEnd}
                            onToggleVisibility={toggleItemVisibility}
                            onDelete={deleteSection}
                            onRename={renameSection}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {isEditMode && isSidebarOpen && (
                    <button
                      onClick={addSection}
                      className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-indigo-500 hover:border-indigo-500 transition-all text-xs font-medium"
                    >
                      <Plus size={14} />
                      Add Section
                    </button>
                  )}
                </div>
              )}

                  {!isAdminPath && isSettingsMode && (
                    <div className="flex flex-col h-full">
                      <nav className={cn("mb-6", isSidebarOpen ? "px-2" : "px-0")}>
                        <button
                          onClick={() => navigate('/workspace')}
                          className={cn(
                            "w-full flex items-center transition-all duration-300 group relative mb-4",
                            isSidebarOpen 
                              ? "premium-pill h-9 gap-2 px-4" 
                              : "justify-center h-9 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400"
                          )}
                        >
                          <ArrowLeft size={16} className={cn("shrink-0", isSidebarOpen ? "text-zinc-400 group-hover:text-white" : "")} />
                          {isSidebarOpen && (
                            <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 truncate">
                              Back to Workspace
                            </span>
                          )}
                        </button>

                        {isSidebarOpen && (
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
                      
                      <div className={cn("flex-1 space-y-1 overflow-y-auto custom-scrollbar", isSidebarOpen ? "px-2" : "px-0")}>
                        {filteredSettingsGroups.map((group) => (
                          <SidebarAccordion
                            key={group.category}
                            label={group.category}
                            icon={group.icon}
                            items={group.items}
                            collapsed={!isSidebarOpen}
                            isActive={isActive}
                            isOpen={openAccordions.has(group.category)}
                            onToggle={() => toggleAccordion(group.category)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1 mt-auto">
              {isEditMode ? (
                <div className="flex flex-col gap-1 px-1 mb-2">
                  <button
                    onClick={() => handleSave('user')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    <Save size={14} />
                    {isSidebarOpen && "Save to Profile"}
                  </button>
                  {(platformUser?.licenceType === 'Developer' || platformUser?.isSuperAdmin) && (
                    <button
                      onClick={() => handleSave('tenant')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-200 rounded-md hover:bg-zinc-700 transition-colors border border-zinc-700"
                    >
                      <Save size={14} />
                      {isSidebarOpen && "Set as Org Default"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      // Ideally we should reload context to discard changes
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                  >
                    <X size={14} />
                    {isSidebarOpen && "Cancel"}
                  </button>
                </div>
              ) : (
                !isAdminPath && !isSettingsMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={cn(
                      "w-full flex items-center p-2 mb-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors",
                      isSidebarOpen ? "px-3 gap-2" : "justify-center px-0"
                    )}
                    title="Customize Sidebar"
                  >
                    <Edit2 size={16} />
                    {isSidebarOpen && <span className="text-xs font-medium">Customize</span>}
                  </button>
                )
              )}

              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "w-full flex items-center p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors",
                  isSidebarOpen ? "justify-end px-3" : "justify-center px-0"
                )}
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>
            </div>
          </div>
        </aside>

        <main className={cn(
          "flex-1 h-[calc(100vh-4rem)] flex flex-col overflow-y-auto transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-16",
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

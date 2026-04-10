import { ReactNode, useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  Trash2
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

export const PlatformShell = ({ children, fullBleed }: { children: ReactNode, fullBleed?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: platformLoading, modules, menuConfig, updateMenuConfig, setMenuConfig } = usePlatform();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  
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
  const isAdminPath = location.pathname.startsWith('/admin');
  const isSettingsMode = location.pathname.startsWith('/workspace/settings');

  const resolvedConfig = useMemo(() => {
    if (!menuConfig) return null;

    // Inject active modules that are missing from the configuration
    const sections = menuConfig.sections.map(section => {
      if (section.id === 'modules') {
        const existingModuleIds = new Set(section.items.map(i => i.id));
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
          items: [...section.items, ...newModules]
        };
      }
      return section;
    });

    return { ...menuConfig, sections };
  }, [menuConfig, enabledModules]);

  if (authLoading || platformLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isActive = (path: string) => location.pathname === path;

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
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300 overflow-x-hidden">
      <Navbar />
      <div className="flex">
        <aside className={cn(
          "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300 z-40 overflow-y-auto overflow-x-hidden",
          isSidebarOpen ? "w-64" : "w-16"
        )}>
          <div className="p-4 flex flex-col h-full">
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
                            onRename={renameSection}
                            onDelete={deleteSection}
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
                <div>
                  <nav className="mb-6">
                    <SidebarItem icon={ArrowLeft} label="Back to Workspace" to="/workspace" collapsed={!isSidebarOpen} />
                  </nav>
                  <div className="space-y-6">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                        General
                      </div>
                      <nav className="space-y-1">
                        <SidebarItem 
                          icon={LucideIcons.Building} 
                          label="General" 
                          to="/workspace/settings" 
                          active={location.pathname === '/workspace/settings'} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.Users} 
                          label="Users" 
                          to="/workspace/settings/team" 
                          active={isActive('/workspace/settings/team')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.CreditCard} 
                          label="Billing & Plan" 
                          to="/workspace/settings/billing" 
                          active={isActive('/workspace/settings/billing')} 
                          collapsed={!isSidebarOpen} 
                        />
                      </nav>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                        Studio Assets
                      </div>
                      <nav className="space-y-1">
                        <SidebarItem 
                          icon={LucideIcons.Layers} 
                          label="Modules" 
                          to="/workspace/settings/modules" 
                          active={isActive('/workspace/settings/modules')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.LayoutGrid} 
                          label="Apps" 
                          to="/workspace/settings/apps" 
                          active={isActive('/workspace/settings/apps')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.FileText} 
                          label="Templates" 
                          to="/workspace/settings/templates" 
                          active={isActive('/workspace/settings/templates')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.Zap} 
                          label="Automations" 
                          to="/workspace/settings/automations" 
                          active={isActive('/workspace/settings/automations')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.Terminal} 
                          label="Logic" 
                          to="/workspace/settings/logic" 
                          active={isActive('/workspace/settings/logic')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.Lock} 
                          label="Security" 
                          to="/workspace/settings/security" 
                          active={isActive('/workspace/settings/security')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.Globe} 
                          label="Portals" 
                          to="/portal" 
                          active={isActive('/portal')} 
                          collapsed={!isSidebarOpen} 
                        />
                        <SidebarItem 
                          icon={LucideIcons.BarChart3} 
                          label="Reports" 
                          to="/workspace/settings/reports" 
                          active={isActive('/workspace/settings/reports')} 
                          collapsed={!isSidebarOpen} 
                        />
                      </nav>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                        System
                      </div>
                      <nav className="space-y-1">
                        <SidebarItem 
                          icon={LucideIcons.CloudUpload} 
                          label="Deployments" 
                          to="/workspace/settings/deploy" 
                          active={isActive('/workspace/settings/deploy')} 
                          collapsed={!isSidebarOpen} 
                        />
                      </nav>
                    </div>
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
                  {user.role === 'admin' && (
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
          "flex-1 transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-16",
          fullBleed && "h-[calc(100vh-4rem)] overflow-y-auto"
        )}>
          <div className={cn(
            "mx-auto",
            fullBleed ? "w-full h-full" : "p-8 max-w-7xl"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

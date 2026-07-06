import { useState, useEffect, useMemo } from 'react';
import { 
  Columns,
  Rows,
  Save,
  Plus,
  ArrowRight,
  Sparkles,
  Link2,
  Trash2,
  ListPlus,
  RefreshCw,
  FolderOpen,
  Layout,
  Layers,
  Cpu,
  Globe,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { NavigationArchitect } from '../../components/Settings/NavigationArchitect';
import { systemDefaultMenuConfig } from '../../config/menuDefaults';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { PLATFORM_MODULES } from '../../config/platformModules';

// Types
type LayoutStyle = 'sidebar' | 'slim' | 'top';

interface MenuItem {
  id: string;
  label: string;
  iconName: string;
  to?: string;
  isVisible?: boolean;
  isSubtitle?: boolean;
  children?: MenuItem[];
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface AdvancedMenuConfig {
  default: { sections: MenuSection[] };
  roles: Record<string, { sections: MenuSection[] }>;
  teams: Record<string, { sections: MenuSection[] }>;
  positions: Record<string, { sections: MenuSection[] }>;
  users: Record<string, { sections: MenuSection[] }>;
}

const COMMON_ICONS = [
  'LayoutDashboard', 'Users', 'ClipboardList', 'FileText', 'Inbox', 'BookOpen', 
  'BarChart', 'Settings', 'Database', 'Lock', 'Shield', 'Globe', 'Layers', 
  'MessageSquare', 'Calendar', 'Folder', 'Zap', 'Terminal', 'Heart', 'HelpCircle'
];

export const NavigationSettingsPage = () => {
  const { tenant, menuConfig, updateMenuConfig, updateTenant, refetchContext, modules, members, teams } = usePlatform();
  const { session } = useAuth();
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('sidebar');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);

  // Target scope: default, role, team, position, user
  const [activeScope, setActiveScope] = useState<{ type: 'default' | 'role' | 'team' | 'position' | 'user'; id: string }>({ type: 'default', id: '' });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Advanced Menu Config State
  const [menuConfigState, setMenuConfigState] = useState<AdvancedMenuConfig>({
    default: { sections: [] },
    roles: {},
    teams: {},
    positions: {},
    users: {}
  });

  // Custom link form state
  const [customItemType, setCustomItemType] = useState<'link' | 'subtitle'>('link');
  const [customLabel, setCustomLabel] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [customIcon, setCustomIcon] = useState('Link2');
  const [customIconInput, setCustomIconInput] = useState('');

  // Fetch Positions on Mount
  useEffect(() => {
    const fetchPositions = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/positions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPositions(data);
        }
      } catch (err) {
        console.error('Failed to fetch positions:', err);
      }
    };
    fetchPositions();
  }, [tenant, session]);

  // Initialize from tenant branding and menuConfig
  useEffect(() => {
    if (menuConfig && !initialized) {
      const advanced: AdvancedMenuConfig = {
        default: (menuConfig as any).default || (menuConfig.sections ? menuConfig : { sections: [] }),
        roles: (menuConfig as any).roles || {},
        teams: (menuConfig as any).teams || {},
        positions: (menuConfig as any).positions || {},
        users: (menuConfig as any).users || {}
      };

      // Ensure default has fallback sections
      if (!advanced.default.sections || advanced.default.sections.length === 0) {
        advanced.default = JSON.parse(JSON.stringify(systemDefaultMenuConfig));
      }

      setMenuConfigState(advanced);

      if (tenant?.branding && tenant.branding.layout_style) {
        setLayoutStyle(tenant.branding.layout_style as LayoutStyle);
      }
      setInitialized(true);
    }
  }, [menuConfig, tenant, initialized]);

  // Set default selected section once sections load
  const activeSections = useMemo(() => {
    const { type, id } = activeScope;
    if (type === 'default') return menuConfigState.default?.sections || [];
    if (type === 'role') return menuConfigState.roles?.[id]?.sections || menuConfigState.default?.sections || [];
    if (type === 'team') return menuConfigState.teams?.[id]?.sections || menuConfigState.default?.sections || [];
    if (type === 'position') return menuConfigState.positions?.[id]?.sections || menuConfigState.default?.sections || [];
    if (type === 'user') return menuConfigState.users?.[id]?.sections || menuConfigState.default?.sections || [];
    return [];
  }, [menuConfigState, activeScope]);

  useEffect(() => {
    if (activeSections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(activeSections[0].id);
    }
  }, [activeSections, selectedSectionId]);

  const handleSectionsChange = (newSections: MenuSection[]) => {
    setMenuConfigState(prev => {
      const { type, id } = activeScope;
      const updated = { ...prev };

      if (type === 'default') {
        updated.default = { ...updated.default, sections: newSections };
      } else if (type === 'role') {
        updated.roles = { ...updated.roles, [id]: { ...(updated.roles[id] || {}), sections: newSections } };
      } else if (type === 'team') {
        updated.teams = { ...updated.teams, [id]: { ...(updated.teams[id] || {}), sections: newSections } };
      } else if (type === 'position') {
        updated.positions = { ...updated.positions, [id]: { ...(updated.positions[id] || {}), sections: newSections } };
      } else if (type === 'user') {
        updated.users = { ...updated.users, [id]: { ...(updated.users[id] || {}), sections: newSections } };
      }

      return updated;
    });
  };

  const handleResetOverride = () => {
    const { type, id } = activeScope;
    if (type === 'default') return;

    setMenuConfigState(prev => {
      const updated = { ...prev };
      if (type === 'role') {
        const { [id]: _, ...rest } = updated.roles;
        updated.roles = rest;
      } else if (type === 'team') {
        const { [id]: _, ...rest } = updated.teams;
        updated.teams = rest;
      } else if (type === 'position') {
        const { [id]: _, ...rest } = updated.positions;
        updated.positions = rest;
      } else if (type === 'user') {
        const { [id]: _, ...rest } = updated.users;
        updated.users = rest;
      }
      return updated;
    });
    toast.success('Override reset. Target will now inherit the default navigation.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Only update tenant branding if layout style actually changed
      if (!isOverrideActive && tenant?.branding?.layout_style !== layoutStyle) {
        promises.push(updateTenant({
          branding: {
            ...tenant?.branding,
            layout_style: layoutStyle
          }
        }));
      }

      // 2. Save advanced menu config
      promises.push(updateMenuConfig(menuConfigState as any, 'tenant'));

      await Promise.all(promises);
      await refetchContext();
    } catch (error) {
      toast.error('Failed to update navigation settings');
    } finally {
      setSaving(false);
    }
  };

  // Add Item to active sections helper
  const addItemToActiveSection = (item: MenuItem) => {
    if (activeSections.length === 0) {
      toast.error('Please create a section in the structure first.');
      return;
    }

    const targetIndex = activeSections.findIndex(s => s.id === selectedSectionId) !== -1
      ? activeSections.findIndex(s => s.id === selectedSectionId)
      : 0;

    const updated = [...activeSections];
    updated[targetIndex] = {
      ...updated[targetIndex],
      items: [...(updated[targetIndex].items || []), item]
    };

    handleSectionsChange(updated);
    toast.success(`Added "${item.label}" to section "${updated[targetIndex].title}"`);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) {
      toast.error('Please enter a label.');
      return;
    }

    const icon = customIconInput.trim() || customIcon;
    const isSubtitle = customItemType === 'subtitle';

    const newItem: MenuItem = {
      id: `custom:${Date.now()}`,
      label: customLabel,
      iconName: icon,
      isVisible: true,
      ...(isSubtitle ? { isSubtitle: true } : { to: customPath })
    };

    addItemToActiveSection(newItem);
    setCustomLabel('');
    setCustomPath('');
    setCustomIconInput('');
  };

  // Platform modules
  const PLATFORM_MODULES_LIST = PLATFORM_MODULES.map(mod => ({
    label: mod.name,
    icon: mod.iconName,
    path: mod.path
  }));

  // System Enabled Apps Mapping
  const appIconsMap: Record<string, string> = {
    inbox: 'Inbox', docs: 'FileText', drive: 'Folder', chat: 'MessageSquare',
    meet: 'Video', calendar: 'Calendar', notes: 'StickyNote', reminders: 'Bell',
    reports: 'BarChart', converter: 'FileText', feed: 'Rss', draw: 'Palette',
    whiteboard: 'Layout', calculator: 'Terminal', snipper: 'Scissors'
  };

  const enabledApps = tenant?.enabledApps || [];

  const isOverrideActive = activeScope.type !== 'default';

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Navigation Builder</h1>
          <p className="text-xs text-zinc-500">Configure global layout shell, horizontal/vertical shell styles, and custom overrides.</p>
        </div>
        <Button onClick={handleSave} loading={saving} className="gap-2 shadow-lg shadow-indigo-500/10">
          <Save size={16} />
          Save Settings
        </Button>
      </div>

      {/* Main Two Column layout (Height constrained to avoid page scrolls) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8 overflow-hidden min-h-0">
        
        {/* Left Column - Scope, Layout, Toolbox (COLUMNS 5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Target Scope Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Configuration Target</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Edit navigation defaults or target roles, teams, positions, or specific users.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <select
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={`${activeScope.type}:${activeScope.id}`}
                onChange={(e) => {
                  const [type, id] = e.target.value.split(':');
                  setActiveScope({ type: type as any, id });
                }}
              >
                <option value="default:">Default (All Users)</option>
                
                <optgroup label="Roles">
                  <option value="role:Admin">Role: Admin</option>
                  <option value="role:Developer">Role: Developer</option>
                  <option value="role:Standard">Role: Standard</option>
                </optgroup>
                
                <optgroup label="Teams">
                  {teams.map(t => (
                    <option key={t.id} value={`team:${t.id}`}>Team: {t.name}</option>
                  ))}
                </optgroup>

                <optgroup label="Positions">
                  {positions.map(p => (
                    <option key={p.id} value={`position:${p.id}`}>Position: {p.title}</option>
                  ))}
                </optgroup>
                
                <optgroup label="Users">
                  {members.map(m => (
                    <option key={m.id} value={`user:${m.id}`}>User: {m.name} ({m.email})</option>
                  ))}
                </optgroup>
              </select>

              {isOverrideActive && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    Active Override
                  </span>
                  <button
                    onClick={handleResetOverride}
                    className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 font-bold uppercase transition-colors"
                  >
                    <RefreshCw size={10} />
                    Reset Override
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Layout Picker (Only shown for Default scope) */}
          {!isOverrideActive && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Layout Presentation</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setLayoutStyle('sidebar')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all",
                    layoutStyle === 'sidebar' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/5 text-indigo-600" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500"
                  )}
                >
                  <Rows size={18} />
                  <span className="text-[10px] font-bold uppercase">Sidebar</span>
                </button>

                <button
                  onClick={() => setLayoutStyle('slim')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all",
                    layoutStyle === 'slim' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/5 text-indigo-600" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500"
                  )}
                >
                  <Layout size={18} />
                  <span className="text-[10px] font-bold uppercase">Slim Hover</span>
                </button>

                <button
                  onClick={() => setLayoutStyle('top')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all",
                    layoutStyle === 'top' 
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-600/5 text-indigo-600" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500"
                  )}
                >
                  <Columns size={18} />
                  <span className="text-[10px] font-bold uppercase">Top Menu</span>
                </button>
              </div>
            </div>
          )}

          {/* Add Elements toolbox */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Element Toolbox</h3>
              <p className="text-[11px] text-zinc-500">Insert custom elements, platform panels, custom modules, or apps.</p>
            </div>

            {/* Custom Link/Subtitle Form */}
            <form onSubmit={handleAddCustomItem} className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-3.5 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <ListPlus size={12} /> Custom Link / Subtitle
                </span>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCustomItemType('link')}
                    className={cn("px-1.5 py-0.5 rounded font-bold uppercase", customItemType === 'link' ? "bg-indigo-600 text-white" : "text-zinc-400")}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomItemType('subtitle')}
                    className={cn("px-1.5 py-0.5 rounded font-bold uppercase", customItemType === 'subtitle' ? "bg-indigo-600 text-white" : "text-zinc-400")}
                  >
                    Subtitle
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Label / Text"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
                
                {customItemType === 'link' && (
                  <input
                    type="text"
                    placeholder="Route Path (e.g. /workspace/custom)"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                  />
                )}

                <div className="flex gap-2">
                  <select
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                  >
                    {COMMON_ICONS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Custom Lucide Icon Name"
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500/50"
                    value={customIconInput}
                    onChange={(e) => setCustomIconInput(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" variant="secondary" size="sm" className="w-full text-xs gap-1">
                <Plus size={12} /> Add to Menu
              </Button>
            </form>

            {/* Platform Modules list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                <Cpu size={12} /> Platform Modules
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {PLATFORM_MODULES_LIST.map((mod) => (
                  <button
                    key={mod.path}
                    onClick={() => addItemToActiveSection({
                      id: `platform-${mod.path.split('/').pop()}-${Date.now()}`,
                      label: mod.label,
                      iconName: mod.icon,
                      to: mod.path,
                      isVisible: true
                    })}
                    className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-left transition-colors"
                  >
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{mod.label}</span>
                    <Plus size={14} className="text-zinc-400 hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Modules list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                <Layers size={12} /> Custom Modules
              </h4>
              {(() => {
                const activeCustomModules = modules.filter((mod: any) => mod.status === 'ACTIVE' || mod.enabled);
                if (activeCustomModules.length === 0) {
                  return <p className="text-[10px] text-zinc-400 italic">No active custom modules.</p>;
                }
                return (
                  <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                    {activeCustomModules.map((mod) => (
                      <button
                        key={mod.id}
                        onClick={() => addItemToActiveSection({
                          id: `module:${mod.id}`,
                          label: mod.name,
                          iconName: mod.icon || 'Box',
                          to: `/workspace/modules/${mod.id}`,
                          isVisible: true
                        })}
                        className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-left transition-colors"
                      >
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{mod.name}</span>
                        <Plus size={14} className="text-zinc-400 hover:text-indigo-500" />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Enabled apps list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                <LayoutGrid size={12} /> Enabled Apps
              </h4>
              {enabledApps.length === 0 ? (
                <p className="text-[10px] text-zinc-400 italic">No apps enabled in app catalog.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {enabledApps.map((appId: string) => {
                    const iconName = appIconsMap[appId] || 'Layout';
                    const appLabel = appId.charAt(0).toUpperCase() + appId.slice(1);
                    return (
                      <button
                        key={appId}
                        onClick={() => addItemToActiveSection({
                          id: `app:${appId}-${Date.now()}`,
                          label: appLabel,
                          iconName: iconName,
                          to: `/workspace/apps/${appId}`,
                          isVisible: true
                        })}
                        className="flex items-center justify-between p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-left transition-colors"
                      >
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate pr-1">{appLabel}</span>
                        <Plus size={12} className="text-zinc-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column - Navigation Architect (COLUMNS 7/12 - Full Height, Scroll constrained) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div>
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Menu Structure</h2>
              <p className="text-[11px] text-zinc-500">Edit sections and items. Element target additions will land in the selected section.</p>
            </div>
            
            {activeSections.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-medium uppercase">Active Target Section:</span>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] outline-none"
                >
                  {activeSections.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <NavigationArchitect 
              sections={activeSections} 
              onChange={handleSectionsChange}
              layout={layoutStyle}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

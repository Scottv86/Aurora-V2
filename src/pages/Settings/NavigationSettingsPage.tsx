import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Columns,
  Rows,
  Save,
  Plus,
  ListPlus,
  RefreshCw,
  Layout,
  Layers,
  Cpu,
  Trash2,
  ArrowLeft,
  Compass,
  Sliders,
  Shield,
  Settings,
  Eye,
  EyeOff,
  LayoutGrid,
  Loader2,
  Search,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { NavigationArchitect } from '../../components/Settings/NavigationArchitect';
import { systemDefaultMenuConfig } from '../../config/menuDefaults';
import { cn, flattenFields, slugify } from '../../lib/utils';
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
  moduleId?: string;
  moduleIds?: string[];
  isUnifiedQueue?: boolean;
  queueConfig?: {
    conditions: any;
    columns: string[];
  };
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

const ALL_CATALOG_APPS = [
  { id: 'inbox', label: 'Inbox', iconName: 'Inbox', to: '/workspace/apps/inbox' },
  { id: 'docs', label: 'Documents', iconName: 'FileText', to: '/workspace/apps/docs' },
  { id: 'drive', label: 'Drive', iconName: 'Folder', to: '/workspace/apps/drive' },
  { id: 'query', label: 'Query', iconName: 'Database', to: '/workspace/apps/query' },
  { id: 'chat', label: 'Chat', iconName: 'MessageSquare', to: '/workspace/apps/chat' },
  { id: 'meet', label: 'Meet', iconName: 'Video', to: '/workspace/apps/meet' },
  { id: 'calendar', label: 'Calendar', iconName: 'Calendar', to: '/workspace/apps/calendar' },
  { id: 'notes', label: 'Notes', iconName: 'StickyNote', to: '/workspace/apps/notes' },
  { id: 'reminders', label: 'Reminders', iconName: 'Bell', to: '/workspace/apps/reminders' },
  { id: 'reports', label: 'Reports', iconName: 'BarChart3', to: '/workspace/apps/reports' },
  { id: 'converter', label: 'File Converter', iconName: 'FileType', to: '/workspace/apps/converter' },
  { id: 'feed', label: 'Feed', iconName: 'Rss', to: '/workspace/apps/feed' },
  { id: 'draw', label: 'Draw', iconName: 'Palette', to: '/workspace/apps/draw' },
  { id: 'whiteboard', label: 'Whiteboard', iconName: 'Presentation', to: '/workspace/apps/whiteboard' },
  { id: 'calculator', label: 'Calculator', iconName: 'Calculator', to: '/workspace/apps/calculator' },
  { id: 'snipper', label: 'Snipping Tool', iconName: 'Scissors', to: '/workspace/apps/snipper' },
  { id: 'flowchart', label: 'Flowchart', iconName: 'Workflow', to: '/workspace/apps/flowchart' },
  { id: 'pdf-editor', label: 'PDF Editor', iconName: 'FileEdit', to: '/workspace/apps/pdf-editor' },
  { id: 'redact', label: 'Redact', iconName: 'EyeOff', to: '/workspace/apps/redact' },
  { id: 'slideshow', label: 'Slideshow', iconName: 'MonitorPlay', to: '/workspace/apps/slideshow' },
  { id: 'graphics', label: 'Graphics', iconName: 'Image', to: '/workspace/apps/graphics' },
  { id: 'campaigns', label: 'Campaigns', iconName: 'Send', to: '/workspace/apps/campaigns' },
  { id: 'spreadsheet', label: 'Spreadsheet', iconName: 'Table', to: '/workspace/apps/spreadsheet' }
];

export const NavigationSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant, updateMenuConfig, updateTenant, refetchContext, modules, members, teams, isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();
  const { session } = useAuth();

  useEffect(() => {
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('sidebar');
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<any[]>([]);
  const [navigationName, setNavigationName] = useState('');

  // Selection state for Right Properties Panel
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Target scope: default, role, team, position, user
  const initialScopeType = (searchParams.get('scopeType') as any) || 'default';
  const initialScopeId = searchParams.get('scopeId') || '';
  const [activeScope, setActiveScope] = useState<{ type: 'default' | 'role' | 'team' | 'position' | 'user'; id: string }>({ 
    type: initialScopeType, 
    id: initialScopeId 
  });

  // Advanced Menu Config State
  const [menuConfigState, setMenuConfigState] = useState<AdvancedMenuConfig>({
    default: { sections: [] },
    roles: {},
    teams: {},
    positions: {},
    users: {}
  });

  // Synchronize navigation title based on active scope
  useEffect(() => {
    const { type, id } = activeScope;
    if (type === 'default') {
      setNavigationName((menuConfigState.default as any)?.title || 'Workspace Navigation');
    } else if (type === 'role') {
      setNavigationName((menuConfigState.roles?.[id] as any)?.title || `${id} Role Navigation`);
    } else if (type === 'team') {
      const t = teams.find(team => team.id === id);
      const teamName = t ? t.name : id;
      setNavigationName((menuConfigState.teams?.[id] as any)?.title || `${teamName} Team Navigation`);
    } else if (type === 'position') {
      const p = positions.find(pos => pos.id === id);
      const posTitle = p ? p.title : id;
      setNavigationName((menuConfigState.positions?.[id] as any)?.title || `${posTitle} Position Navigation`);
    } else if (type === 'user') {
      const m = members.find(mem => mem.id === id);
      const userName = m ? m.name : id;
      setNavigationName((menuConfigState.users?.[id] as any)?.title || `${userName} Navigation`);
    }
  }, [activeScope, menuConfigState, teams, positions, members]);

  // Modal / Add tool states
  const [activeAddTool, setActiveAddTool] = useState<'link' | 'subtitle' | 'queue' | 'page' | 'system' | 'custom' | 'app' | null>(null);
  const [appSearchQuery, setAppSearchQuery] = useState('');

  // Custom link form state
  const [customLabel, setCustomLabel] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [customIcon, setCustomIcon] = useState('Link2');
  const [customIconInput, setCustomIconInput] = useState('');

  // Queue form state
  const [queueItemType, setQueueItemType] = useState<'single' | 'unified'>('single');
  const [queueLabel, setQueueLabel] = useState('');
  const [queueIcon, setQueueIcon] = useState('ClipboardList');
  const [queueModuleId, setQueueModuleId] = useState('');
  const [queueModuleIds, setQueueModuleIds] = useState<string[]>([]);
  const [queueRules, setQueueRules] = useState<{ fieldId: string; operator: string; value: string }[]>([
    { fieldId: '', operator: 'equals', value: '' }
  ]);
  const [queueColumns, setQueueColumns] = useState<string[]>([
    'id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'
  ]);

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

  // Initialize from tenant branding and tenant.menuConfig
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (tenant) {
      const tConfig = tenant.menuConfig as any;
      const advanced: AdvancedMenuConfig = {
        default: tConfig?.default || (tConfig?.sections ? tConfig : { sections: [] }),
        roles: tConfig?.roles || {},
        teams: tConfig?.teams || {},
        positions: tConfig?.positions || {},
        users: tConfig?.users || {}
      };

      if (!advanced.default.sections || advanced.default.sections.length === 0) {
        advanced.default = JSON.parse(JSON.stringify(systemDefaultMenuConfig));
      }

      setMenuConfigState(advanced);

      if (tenant?.branding) {
        if (tenant.branding.layout_style) {
          setLayoutStyle(tenant.branding.layout_style as LayoutStyle);
        }
        setShowBreadcrumbs(tenant.branding.show_breadcrumbs !== false);
      }

      timer = setTimeout(() => {
        setLoading(false);
      }, 400);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [tenant]);

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
    if (activeSections.length > 0 && (!selectedSectionId || !activeSections.some(s => s.id === selectedSectionId))) {
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

  const handleDropToolboxItem = (sectionId: string, toolData: any) => {
    const { toolType } = toolData;
    let newItem: MenuItem | null = null;

    if (toolType === 'link') {
      newItem = {
        id: `link-${Date.now()}`,
        label: 'Custom Link',
        iconName: 'Link2',
        to: '/workspace/custom-link',
        isVisible: true
      };
    } else if (toolType === 'subtitle') {
      newItem = {
        id: `sub-${Date.now()}`,
        label: 'SECTION LABEL',
        iconName: 'Sliders',
        isSubtitle: true,
        isVisible: true
      };
    } else if (toolType === 'page') {
      setSelectedSectionId(sectionId);
      setActiveAddTool('page');
      return;
    } else if (toolType === 'system') {
      setSelectedSectionId(sectionId);
      setActiveAddTool('system');
      return;
    } else if (toolType === 'custom') {
      setSelectedSectionId(sectionId);
      setActiveAddTool('custom');
      return;
    } else if (toolType === 'app') {
      setSelectedSectionId(sectionId);
      setActiveAddTool('app');
      return;
    } else if (toolType === 'queue') {
      setSelectedSectionId(sectionId);
      setActiveAddTool('queue');
      return;
    }

    if (newItem) {
      const updated = activeSections.map(sec => {
        if (sec.id === sectionId) {
          return { ...sec, items: [...sec.items, newItem!] };
        }
        return sec;
      });
      handleSectionsChange(updated);
      setSelectedItemId(newItem.id);
      toast.success(`Added "${newItem.label}" to section`);
    }
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
    toast.success('Override reset. Target will now inherit default navigation.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];

      const brandingLayoutChanged = tenant?.branding?.layout_style !== layoutStyle;
      const brandingBreadcrumbsChanged = (tenant?.branding?.show_breadcrumbs !== false) !== showBreadcrumbs;

      if (!isOverrideActive && (brandingLayoutChanged || brandingBreadcrumbsChanged)) {
        promises.push(updateTenant({
          branding: {
            ...tenant?.branding,
            layout_style: layoutStyle,
            show_breadcrumbs: showBreadcrumbs
          }
        }));
      }

      const updatedConfig = { ...menuConfigState };
      const { type, id } = activeScope;

      if (type === 'default') {
        updatedConfig.default = { ...updatedConfig.default, title: navigationName } as any;
      } else if (type === 'role') {
        updatedConfig.roles[id] = { ...(updatedConfig.roles[id] || { sections: [] }), title: navigationName } as any;
      } else if (type === 'team') {
        updatedConfig.teams[id] = { ...(updatedConfig.teams[id] || { sections: [] }), title: navigationName } as any;
      } else if (type === 'position') {
        updatedConfig.positions[id] = { ...(updatedConfig.positions[id] || { sections: [] }), title: navigationName } as any;
      } else if (type === 'user') {
        updatedConfig.users[id] = { ...(updatedConfig.users[id] || { sections: [] }), title: navigationName } as any;
      }

      promises.push(updateMenuConfig(updatedConfig as any, 'tenant'));

      await Promise.all(promises);
      await refetchContext();
      toast.success('Navigation layout saved successfully!');
    } catch (error) {
      toast.error('Failed to update navigation settings');
    } finally {
      setSaving(false);
    }
  };

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
    setSelectedItemId(item.id);
  };

  const handleAddCustomItem = (type: 'link' | 'subtitle') => {
    if (!customLabel.trim()) {
      toast.error('Please enter a label.');
      return;
    }

    const icon = customIconInput.trim() || customIcon;
    const isSubtitle = type === 'subtitle';

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
    setActiveAddTool(null);
  };

  const activeCustomModules = useMemo(() => {
    return modules.filter((mod: any) => {
      if (mod.type === 'PAGE') return false;
      if (mod.status !== 'ACTIVE' && !mod.enabled) return false;
      const isPlatform = PLATFORM_MODULES.some(pm => pm.id === mod.id || pm.id === mod.templateId || pm.name === mod.name || pm.slug === mod.templateId);
      if (isPlatform) return false;
      if (mod.isGlobal || mod.isIntakeTriage || mod.config?.isIntakeTriage) return false;
      return true;
    });
  }, [modules]);

  const queueAvailableFields = useMemo(() => {
    const list: { id: string; label: string; origin?: string }[] = [
      { id: 'currentUser.teamName', label: 'Current User: Team Name' },
      { id: 'currentUser.teamId', label: 'Current User: Team ID' },
      { id: 'currentUser.role', label: 'Current User: Role' },
      { id: 'currentUser.id', label: 'Current User: Member ID' },
      { id: 'status', label: 'Status' },
      { id: 'priority', label: 'Priority' },
      { id: 'assigneeId', label: 'Assignee ID' }
    ];

    const targetModuleIds = queueItemType === 'single' 
      ? (queueModuleId ? [queueModuleId] : []) 
      : queueModuleIds;

    targetModuleIds.forEach(mId => {
      const mod = modules.find(m => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach(f => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(item => item.id === f.id)) {
              list.push({ id: f.id, label: `${f.label || f.name} (${mod.name})`, origin: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [queueItemType, queueModuleId, queueModuleIds, modules]);

  const queueColumnOptions = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [
      { id: 'id', label: 'Record ID', group: 'System' },
      { id: 'moduleId', label: 'Module Name', group: 'System' },
      { id: 'title', label: 'Title/Key', group: 'System' },
      { id: 'status', label: 'Status', group: 'System' },
      { id: 'priority', label: 'Priority', group: 'System' },
      { id: 'assigneeId', label: 'Assignee', group: 'System' },
      { id: 'createdAt', label: 'Created At', group: 'System' },
      { id: 'updatedAt', label: 'Updated At', group: 'System' }
    ];

    const targetModuleIds = queueItemType === 'single' 
      ? (queueModuleId ? [queueModuleId] : []) 
      : queueModuleIds;

    targetModuleIds.forEach(mId => {
      const mod = modules.find(m => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach(f => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(item => item.id === f.id)) {
              list.push({ id: f.id, label: f.label || f.name, group: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [queueItemType, queueModuleId, queueModuleIds, modules]);

  const handleAddQueueItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueLabel.trim()) {
      toast.error('Please enter a queue label.');
      return;
    }

    if (queueItemType === 'single' && !queueModuleId) {
      toast.error('Please select a target module.');
      return;
    }

    if (queueItemType === 'unified' && queueModuleIds.length === 0) {
      toast.error('Please select at least one module.');
      return;
    }

    const validRules = queueRules
      .filter(r => r.fieldId)
      .map(r => {
        const isVar = r.fieldId.startsWith('currentUser.');
        return {
          fieldId: r.fieldId,
          fieldType: isVar ? 'variable' : 'field',
          operator: r.operator,
          value: r.value,
          valueType: 'literal'
        };
      });

    const conditions = {
      type: 'group',
      logicalOperator: 'AND',
      rules: validRules
    };

    if (!tenant?.id) return;

    const newSlug = slugify(queueLabel);
    const getAllQueues = (items: any[]): any[] => {
      const q: any[] = [];
      items.forEach(it => {
        if (it.isUnifiedQueue || it.to?.startsWith('/workspace/queues/')) {
          q.push(it);
        }
        if (it.children) {
          q.push(...getAllQueues(it.children));
        }
      });
      return q;
    };
    const existingQueues = getAllQueues(activeSections.flatMap(s => s.items || []));
    const isDuplicate = existingQueues.some(q => slugify(q.label) === newSlug);
    if (isDuplicate) {
      toast.error(`A queue with the label "${queueLabel}" (slug: "${newSlug}") already exists.`);
      return;
    }

    const queueId = `queue_${Date.now()}`;
    const newItem: MenuItem = {
      id: queueId,
      label: queueLabel,
      iconName: queueIcon,
      isVisible: true,
      moduleId: queueItemType === 'single' ? queueModuleId : undefined,
      moduleIds: queueItemType === 'unified' ? queueModuleIds : undefined,
      isUnifiedQueue: queueItemType === 'unified',
      to: queueItemType === 'single' 
        ? `/workspace/modules/${(() => {
            const mod = modules.find((m: any) => m.id === queueModuleId);
            return mod ? slugify(mod.name) : queueModuleId;
          })()}?queueId=${slugify(queueLabel)}`
        : `/workspace/queues/${slugify(queueLabel)}`,
      queueConfig: {
        conditions,
        columns: queueItemType === 'unified' ? queueColumns : []
      }
    };

    addItemToActiveSection(newItem);
    setQueueLabel('');
    setQueueRules([{ fieldId: '', operator: 'equals', value: '' }]);
    setActiveAddTool(null);
  };

  const PLATFORM_MODULES_LIST = PLATFORM_MODULES.map(mod => ({
    label: mod.name,
    icon: mod.iconName,
    path: mod.path
  }));

  const availableCatalogApps = useMemo(() => {
    const list = [...ALL_CATALOG_APPS];
    if (tenant?.enabledApps && Array.isArray(tenant.enabledApps)) {
      for (const appId of tenant.enabledApps) {
        if (!list.some(a => a.id === appId)) {
          list.push({
            id: appId,
            label: appId.charAt(0).toUpperCase() + appId.slice(1).replace(/-/g, ' '),
            iconName: 'Layout',
            to: `/workspace/apps/${appId}`
          });
        }
      }
    }
    return list;
  }, [tenant?.enabledApps]);

  const filteredCatalogApps = useMemo(() => {
    if (!appSearchQuery.trim()) return availableCatalogApps;
    const q = appSearchQuery.toLowerCase().trim();
    return availableCatalogApps.filter(app => 
      app.label.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)
    );
  }, [availableCatalogApps, appSearchQuery]);

  const isOverrideActive = activeScope.type !== 'default';

  // Find currently selected item across sections & children
  const selectedItemInfo = useMemo(() => {
    if (!selectedItemId) return null;
    for (const sec of activeSections) {
      for (const item of sec.items || []) {
        if (item.id === selectedItemId) return { item, sectionId: sec.id, isChild: false, parentId: null };
        if (item.children) {
          for (const child of item.children) {
            if (child.id === selectedItemId) return { item: child, sectionId: sec.id, isChild: true, parentId: item.id };
          }
        }
      }
    }
    return null;
  }, [selectedItemId, activeSections]);

  // Helper to update the currently selected item in activeSections
  const updateSelectedItemInSections = (updates: Partial<MenuItem>) => {
    if (!selectedItemInfo) return;
    handleSectionsChange(activeSections.map(sec => {
      if (sec.id !== selectedItemInfo.sectionId) return sec;
      return {
        ...sec,
        items: sec.items.map(it => {
          if (it.id === selectedItemInfo.item.id) return { ...it, ...updates };
          if (it.children) {
            return {
              ...it,
              children: it.children.map(child => child.id === selectedItemInfo.item.id ? { ...child, ...updates } : child)
            };
          }
          return it;
        })
      };
    }));
  };

  const isSelectedItemQueue = Boolean(
    selectedItemInfo?.item.queueConfig || 
    selectedItemInfo?.item.isUnifiedQueue || 
    selectedItemInfo?.item.moduleId || 
    (selectedItemInfo?.item.moduleIds && selectedItemInfo.item.moduleIds.length > 0) || 
    selectedItemInfo?.item.to?.startsWith('/workspace/queues/') || 
    selectedItemInfo?.item.to?.includes('queueId=')
  );

  const selectedItemAvailableFields = useMemo(() => {
    if (!selectedItemInfo) return [];
    const item = selectedItemInfo.item;
    const isUnified = item.isUnifiedQueue;
    const targetModuleIds = isUnified 
      ? (item.moduleIds || []) 
      : (item.moduleId ? [item.moduleId] : []);

    const list: { id: string; label: string; origin?: string }[] = [
      { id: 'currentUser.teamName', label: 'Current User: Team Name' },
      { id: 'currentUser.teamId', label: 'Current User: Team ID' },
      { id: 'currentUser.role', label: 'Current User: Role' },
      { id: 'currentUser.id', label: 'Current User: Member ID' },
      { id: 'status', label: 'Status' },
      { id: 'priority', label: 'Priority' },
      { id: 'assigneeId', label: 'Assignee ID' }
    ];

    targetModuleIds.forEach(mId => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach((f: any) => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(entry => entry.id === f.id)) {
              list.push({ id: f.id, label: `${f.label || f.name} (${mod.name})`, origin: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [selectedItemInfo, modules]);

  const selectedItemColumnOptions = useMemo(() => {
    if (!selectedItemInfo) return [];
    const item = selectedItemInfo.item;
    const isUnified = item.isUnifiedQueue;
    const targetModuleIds = isUnified 
      ? (item.moduleIds || []) 
      : (item.moduleId ? [item.moduleId] : []);

    const list: { id: string; label: string; group: string }[] = [
      { id: 'id', label: 'Record ID', group: 'System' },
      { id: 'moduleId', label: 'Module Name', group: 'System' },
      { id: 'title', label: 'Title/Key', group: 'System' },
      { id: 'status', label: 'Status', group: 'System' },
      { id: 'priority', label: 'Priority', group: 'System' },
      { id: 'assigneeId', label: 'Assignee', group: 'System' },
      { id: 'createdAt', label: 'Created At', group: 'System' },
      { id: 'updatedAt', label: 'Updated At', group: 'System' }
    ];

    targetModuleIds.forEach(mId => {
      const mod = modules.find((m: any) => m.id === mId);
      if (mod?.layout) {
        const flat = flattenFields(mod.layout);
        flat.forEach((f: any) => {
          if (f.type && !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(f.type)) {
            if (!list.some(entry => entry.id === f.id)) {
              list.push({ id: f.id, label: f.label || f.name, group: mod.name });
            }
          }
        });
      }
    });

    return list;
  }, [selectedItemInfo, modules]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 w-full h-full bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-zinc-500 text-sm font-medium">Loading visual builder...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none transition-all duration-300",
      isBuilderFullscreen ? "h-screen" : "h-full"
    )}>
      
      {/* Top Header Bar (Unified Builder style) */}
      <div className={cn(
        "px-6 lg:px-12 py-5 border-b border-zinc-200/80 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl shrink-0 flex items-center justify-between z-20 relative transition-all duration-300",
        isBuilderFullscreen && "py-2 px-4 lg:px-6 bg-white/80 dark:bg-zinc-950/80 shadow-sm"
      )}>
        
        {/* Left: Back, Icon, Title, Subtitle */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsBuilderFullscreen(false);
              navigate('/workspace/settings/navigation');
            }}
            className={cn(
              "rounded-xl border border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-white/[0.01]",
              isBuilderFullscreen ? "p-1.5" : "p-2.5"
            )}
          >
            <ArrowLeft size={16} />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <Compass className="text-indigo-500 shrink-0" size={isBuilderFullscreen ? 16 : 18} />
              <input
                type="text"
                placeholder="Enter Navigation Name..."
                value={navigationName}
                onChange={(e) => setNavigationName(e.target.value)}
                className={cn(
                  "font-black text-zinc-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/20 rounded px-1 transition-all",
                  isBuilderFullscreen ? "text-sm font-bold" : "text-lg"
                )}
              />
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ml-1 shrink-0",
                isOverrideActive
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
              )}>
                {activeScope.type === 'default' ? 'Default Layout' : `${activeScope.type}: ${activeScope.id}`}
              </span>
            </div>
            {!isBuilderFullscreen && (
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Visual Navigation Builder</p>
            )}
          </div>
        </div>

        {/* Right Header Controls & Save Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleBuilderFullscreen}
            variant={isBuilderFullscreen ? "primary" : "secondary"}
            className={cn(
              "gap-1.5 font-bold uppercase tracking-wider",
              isBuilderFullscreen ? "bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 text-[11px]" : "text-xs"
            )}
            title={isBuilderFullscreen ? "Exit Full Screen (Press Esc)" : "Full Screen Mode"}
          >
            {isBuilderFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={16} />}
            <span className="hidden sm:inline text-[10px]">{isBuilderFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
          </Button>
          
          {/* Scope Selector */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium">
            <Sliders size={13} className="text-zinc-400" />
            <select
              className="bg-transparent text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              value={`${activeScope.type}:${activeScope.id}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':');
                setActiveScope({ type: type as any, id });
              }}
            >
              <option value="default:" className="bg-white dark:bg-zinc-900">Default (All Users)</option>
              <optgroup label="Roles" className="bg-white dark:bg-zinc-900 font-bold">
                <option value="role:Admin">Role: Admin</option>
                <option value="role:Developer">Role: Developer</option>
                <option value="role:Standard">Role: Standard</option>
              </optgroup>
              <optgroup label="Teams" className="bg-white dark:bg-zinc-900 font-bold">
                {teams.map(t => (
                  <option key={t.id} value={`team:${t.id}`}>Team: {t.name}</option>
                ))}
              </optgroup>
              <optgroup label="Positions" className="bg-white dark:bg-zinc-900 font-bold">
                {positions.map(p => (
                  <option key={p.id} value={`position:${p.id}`}>Position: {p.title}</option>
                ))}
              </optgroup>
              <optgroup label="Users" className="bg-white dark:bg-zinc-900 font-bold">
                {members.map(m => (
                  <option key={m.id} value={`user:${m.id}`}>User: {m.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {isOverrideActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetOverride}
              className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold"
            >
              <RefreshCw size={13} />
              Reset Override
            </Button>
          )}

          {/* Layout Presentation Toggle */}
          {!isOverrideActive && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setLayoutStyle('sidebar')}
                  className={cn("px-2 py-1 rounded-lg font-bold transition-all", layoutStyle === 'sidebar' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
                  title="Sidebar layout"
                >
                  <Rows size={14} />
                </button>
                <button
                  onClick={() => setLayoutStyle('slim')}
                  className={cn("px-2 py-1 rounded-lg font-bold transition-all", layoutStyle === 'slim' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
                  title="Slim sidebar layout"
                >
                  <Columns size={14} />
                </button>
                <button
                  onClick={() => setLayoutStyle('top')}
                  className={cn("px-2 py-1 rounded-lg font-bold transition-all", layoutStyle === 'top' ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
                  title="Top menu layout"
                >
                  <Layout size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-white/10">
                <span className="text-xs font-medium text-zinc-400 select-none">Breadcrumbs:</span>
                <button
                  type="button"
                  onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    showBreadcrumbs ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                  )}
                  title="Toggle breadcrumbs display"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                      showBreadcrumbs ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          <Button onClick={handleSave} loading={saving} className={cn("gap-2 shadow-lg shadow-indigo-500/10 font-bold", isBuilderFullscreen && "py-1.5 px-3 text-xs")}>
            <Save size={16} />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Main Split Screen Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        {/* LEFT SIDEBAR (Navigation Toolbox - Page Builder style) */}
        <div className="w-72 border-r border-zinc-200/50 dark:border-white/10 p-4 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
          <div>
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-250 uppercase tracking-widest">Navigation Toolbox</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Click an item to add it to your navigation canvas.</p>
          </div>

          {/* Quick Add Cards */}
          <div className="grid grid-cols-1 gap-2 text-xs">
            
            {/* Custom Route Link */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'link' }));
              }}
              onClick={() => setActiveAddTool('link')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <ListPlus size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Custom Link</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Drag to canvas or click to add custom URL.</p>
              </div>
            </button>

            {/* Subtitle / Section Header */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'subtitle' }));
              }}
              onClick={() => setActiveAddTool('subtitle')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <Sliders size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Subtitle / Label</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Drag section headers inside menu categories.</p>
              </div>
            </button>

            {/* Work Queue Builder */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'queue' }));
              }}
              onClick={() => setActiveAddTool('queue')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <Cpu size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Work Queue</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Build filtered single or unified queues.</p>
              </div>
            </button>

            {/* Workspace Pages */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'page' }));
              }}
              onClick={() => setActiveAddTool('page')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <Layout size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Workspace Pages</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Embed published visual workspace pages.</p>
              </div>
            </button>

            {/* Platform System Panels */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'system' }));
              }}
              onClick={() => setActiveAddTool('system')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <Shield size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Platform System Panels</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Add core system modules like Records Management.</p>
              </div>
            </button>

            {/* Custom Modules */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'custom' }));
              }}
              onClick={() => setActiveAddTool('custom')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <Layers size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Custom Modules</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Link custom modules created in Module Builder.</p>
              </div>
            </button>

            {/* Catalog Apps */}
            <button
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ toolType: 'app' }));
              }}
              onClick={() => setActiveAddTool('app')}
              className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group cursor-grab active:cursor-grabbing"
            >
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                <LayoutGrid size={16} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-850 dark:text-white">Catalog Apps</h4>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">Add enabled apps from tenant catalog.</p>
              </div>
            </button>

          </div>
        </div>

        {/* CENTER CANVAS AREA */}
        <div 
          className="flex-1 p-6 overflow-y-auto bg-zinc-50/10 dark:bg-white/[0.005] relative custom-scrollbar select-none z-10"
          onClick={() => setSelectedItemId(null)}
        >
          {/* Tree Architect Canvas */}
          <NavigationArchitect 
            sections={activeSections} 
            onChange={handleSectionsChange}
            layout={layoutStyle}
            modules={modules}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onDropToolboxItem={handleDropToolboxItem}
          />
        </div>

        {/* RIGHT SIDEBAR (Properties Panel - Page Builder style) */}
        <div className="w-80 border-l border-zinc-200/50 dark:border-white/10 p-5 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
          {selectedItemInfo ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500" />
                  Item Properties
                </h3>
                <button 
                  onClick={() => setSelectedItemId(null)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white uppercase"
                >
                  Deselect
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Item Label */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block">Item Label</label>
                  <input
                    type="text"
                    value={selectedItemInfo.item.label}
                    onChange={(e) => {
                      const updatedLabel = e.target.value;
                      let updatedTo = selectedItemInfo.item.to;

                      if (isSelectedItemQueue) {
                        const labelSlug = slugify(updatedLabel);
                        if (selectedItemInfo.item.isUnifiedQueue) {
                          updatedTo = `/workspace/queues/${labelSlug}`;
                        } else if (selectedItemInfo.item.moduleId) {
                          const mod = modules.find((m: any) => m.id === selectedItemInfo.item.moduleId);
                          const modSlug = mod ? slugify(mod.name) : selectedItemInfo.item.moduleId;
                          updatedTo = `/workspace/modules/${modSlug}?queueId=${labelSlug}`;
                        }
                      }

                      updateSelectedItemInSections({ label: updatedLabel, ...(updatedTo ? { to: updatedTo } : {}) });
                    }}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Route Path */}
                {!selectedItemInfo.item.isSubtitle && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Route Path</label>
                    <input
                      type="text"
                      value={selectedItemInfo.item.to || ''}
                      onChange={(e) => {
                        updateSelectedItemInSections({ to: e.target.value });
                      }}
                      className="w-full bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30 font-mono"
                    />
                  </div>
                )}

                {/* Icon Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block">Icon Name</label>
                  <select
                    value={selectedItemInfo.item.iconName}
                    onChange={(e) => {
                      updateSelectedItemInSections({ iconName: e.target.value });
                    }}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                  >
                    {COMMON_ICONS.map(i => (
                      <option key={i} value={i} className="bg-white dark:bg-zinc-900">{i}</option>
                    ))}
                  </select>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between border-t border-zinc-200/50 dark:border-white/5 pt-3">
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 block">Item Visibility</span>
                    <span className="text-[10px] text-zinc-400">Show or hide this item in the sidebar navigation.</span>
                  </div>
                  <button
                    onClick={() => {
                      updateSelectedItemInSections({ isVisible: selectedItemInfo.item.isVisible === false });
                    }}
                    className={cn(
                      "p-2 rounded-xl border transition-all",
                      selectedItemInfo.item.isVisible !== false ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" : "bg-zinc-100 dark:bg-white/5 text-zinc-400 border-zinc-200 dark:border-white/10"
                    )}
                  >
                    {selectedItemInfo.item.isVisible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                {/* Work Queue Configuration Section */}
                {!selectedItemInfo.item.isSubtitle && (
                  <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                        <Cpu size={13} className="text-purple-500" /> Work Queue Settings
                      </label>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">
                        {isSelectedItemQueue ? (selectedItemInfo.item.isUnifiedQueue ? 'Unified' : 'Single') : 'Disabled'}
                      </span>
                    </div>

                    {/* Queue Mode Selector Buttons */}
                    <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedItemInSections({
                            isUnifiedQueue: false,
                            moduleId: undefined,
                            moduleIds: undefined,
                            queueConfig: undefined
                          });
                        }}
                        className={cn(
                          "py-1 rounded-lg font-bold transition-all text-center",
                          !isSelectedItemQueue ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        Plain Link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultMod = activeCustomModules[0]?.id || '';
                          const labelSlug = slugify(selectedItemInfo.item.label || 'queue');
                          const mod = modules.find((m: any) => m.id === defaultMod);
                          const modSlug = mod ? slugify(mod.name) : defaultMod;
                          updateSelectedItemInSections({
                            isUnifiedQueue: false,
                            moduleId: selectedItemInfo.item.moduleId || defaultMod,
                            moduleIds: undefined,
                            to: `/workspace/modules/${modSlug}?queueId=${labelSlug}`,
                            queueConfig: selectedItemInfo.item.queueConfig || {
                              conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
                              columns: []
                            }
                          });
                        }}
                        className={cn(
                          "py-1 rounded-lg font-bold transition-all text-center",
                          isSelectedItemQueue && !selectedItemInfo.item.isUnifiedQueue ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        Single Queue
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultMods = selectedItemInfo.item.moduleIds?.length ? selectedItemInfo.item.moduleIds : (activeCustomModules[0]?.id ? [activeCustomModules[0].id] : []);
                          const labelSlug = slugify(selectedItemInfo.item.label || 'queue');
                          updateSelectedItemInSections({
                            isUnifiedQueue: true,
                            moduleId: undefined,
                            moduleIds: defaultMods,
                            to: `/workspace/queues/${labelSlug}`,
                            queueConfig: selectedItemInfo.item.queueConfig || {
                              conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
                              columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
                            }
                          });
                        }}
                        className={cn(
                          "py-1 rounded-lg font-bold transition-all text-center",
                          isSelectedItemQueue && selectedItemInfo.item.isUnifiedQueue ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        Unified Queue
                      </button>
                    </div>

                    {/* Single Queue Module Selector */}
                    {isSelectedItemQueue && !selectedItemInfo.item.isUnifiedQueue && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block">Target Custom Module</label>
                        <select
                          value={selectedItemInfo.item.moduleId || ''}
                          onChange={(e) => {
                            const newModId = e.target.value;
                            const mod = modules.find((m: any) => m.id === newModId);
                            const modSlug = mod ? slugify(mod.name) : newModId;
                            const labelSlug = slugify(selectedItemInfo.item.label || 'queue');
                            updateSelectedItemInSections({
                              moduleId: newModId,
                              to: `/workspace/modules/${modSlug}?queueId=${labelSlug}`
                            });
                          }}
                          className="w-full bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none"
                        >
                          <option value="">Select custom module...</option>
                          {activeCustomModules.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Unified Multi-Module Selector */}
                    {isSelectedItemQueue && selectedItemInfo.item.isUnifiedQueue && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block">Target Custom Modules</label>
                        <div className="bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                          {activeCustomModules.map(m => {
                            const isChecked = (selectedItemInfo.item.moduleIds || []).includes(m.id);
                            return (
                              <label key={m.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const currentIds = selectedItemInfo.item.moduleIds || [];
                                    const updatedIds = e.target.checked
                                      ? [...currentIds, m.id]
                                      : currentIds.filter(id => id !== m.id);
                                    updateSelectedItemInSections({ moduleIds: updatedIds });
                                  }}
                                  className="rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="truncate">{m.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Queue Filter Rules Editor */}
                    {isSelectedItemQueue && (
                      <div className="space-y-2 pt-2 border-t border-zinc-200/50 dark:border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block">Filter Rules (AND)</label>
                          <button
                            type="button"
                            onClick={() => {
                              const currentConfig = selectedItemInfo.item.queueConfig || { conditions: { type: 'group', logicalOperator: 'AND', rules: [] }, columns: [] };
                              const currentRules = currentConfig.conditions?.rules || [];
                              const newRule = { fieldId: '', fieldType: 'field', operator: 'equals', value: '', valueType: 'literal' };
                              updateSelectedItemInSections({
                                queueConfig: {
                                  ...currentConfig,
                                  conditions: {
                                    ...currentConfig.conditions,
                                    rules: [...currentRules, newRule]
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase hover:underline"
                          >
                            <Plus size={11} /> Add Rule
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(selectedItemInfo.item.queueConfig?.conditions?.rules || []).length === 0 ? (
                            <div className="text-[10px] text-zinc-400 italic p-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-center">
                              No filter rules defined. Queue matches all records.
                            </div>
                          ) : (
                            (selectedItemInfo.item.queueConfig?.conditions?.rules || []).map((rule: any, rIdx: number) => (
                              <div key={rIdx} className="flex flex-col gap-1.5 p-2 bg-zinc-50/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={rule.fieldId || ''}
                                    onChange={(e) => {
                                      const fieldId = e.target.value;
                                      const isVar = fieldId.startsWith('currentUser.');
                                      const currentConfig = selectedItemInfo.item.queueConfig || { conditions: { type: 'group', logicalOperator: 'AND', rules: [] }, columns: [] };
                                      const rules = [...(currentConfig.conditions?.rules || [])];
                                      rules[rIdx] = { ...rules[rIdx], fieldId, fieldType: isVar ? 'variable' : 'field' };
                                      updateSelectedItemInSections({
                                        queueConfig: {
                                          ...currentConfig,
                                          conditions: { ...currentConfig.conditions, rules }
                                        }
                                      });
                                    }}
                                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[11px] outline-none"
                                  >
                                    <option value="">Select Field...</option>
                                    {selectedItemAvailableFields.map(f => (
                                      <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentConfig = selectedItemInfo.item.queueConfig!;
                                      const rules = (currentConfig.conditions?.rules || []).filter((_: any, i: number) => i !== rIdx);
                                      updateSelectedItemInSections({
                                        queueConfig: {
                                          ...currentConfig,
                                          conditions: { ...currentConfig.conditions, rules }
                                        }
                                      });
                                    }}
                                    className="text-zinc-400 hover:text-red-500 p-1"
                                    title="Delete rule"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={rule.operator || 'equals'}
                                    onChange={(e) => {
                                      const operator = e.target.value;
                                      const currentConfig = selectedItemInfo.item.queueConfig || { conditions: { type: 'group', logicalOperator: 'AND', rules: [] }, columns: [] };
                                      const rules = [...(currentConfig.conditions?.rules || [])];
                                      rules[rIdx] = { ...rules[rIdx], operator };
                                      updateSelectedItemInSections({
                                        queueConfig: {
                                          ...currentConfig,
                                          conditions: { ...currentConfig.conditions, rules }
                                        }
                                      });
                                    }}
                                    className="w-28 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[11px] outline-none"
                                  >
                                    <option value="equals">equals</option>
                                    <option value="not_equals">not equals</option>
                                    <option value="contains">contains</option>
                                    <option value="is_empty">is empty</option>
                                    <option value="not_empty">not empty</option>
                                  </select>

                                  {rule.operator !== 'is_empty' && rule.operator !== 'not_empty' && (
                                    <input
                                      type="text"
                                      placeholder="Value"
                                      value={rule.value || ''}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const currentConfig = selectedItemInfo.item.queueConfig || { conditions: { type: 'group', logicalOperator: 'AND', rules: [] }, columns: [] };
                                        const rules = [...(currentConfig.conditions?.rules || [])];
                                        rules[rIdx] = { ...rules[rIdx], value };
                                        updateSelectedItemInSections({
                                          queueConfig: {
                                            ...currentConfig,
                                            conditions: { ...currentConfig.conditions, rules }
                                          }
                                        });
                                      }}
                                      className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[11px] outline-none"
                                    />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Display Columns Selection (for Unified Queues) */}
                    {isSelectedItemQueue && selectedItemInfo.item.isUnifiedQueue && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-white/5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block">Display Columns</label>
                        <div className="bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-2 custom-scrollbar">
                          {Array.from(new Set(selectedItemColumnOptions.map(c => c.group))).map(groupName => (
                            <div key={groupName} className="space-y-1">
                              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                                {groupName} Fields
                              </div>
                              <div className="grid grid-cols-1 gap-1 pl-1">
                                {selectedItemColumnOptions.filter(c => c.group === groupName).map(col => {
                                  const currentCols = selectedItemInfo.item.queueConfig?.columns || [];
                                  const isChecked = currentCols.includes(col.id);
                                  return (
                                    <label key={col.id} className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentConfig = selectedItemInfo.item.queueConfig || { conditions: { type: 'group', logicalOperator: 'AND', rules: [] }, columns: [] };
                                          const updatedCols = e.target.checked
                                            ? [...(currentConfig.columns || []), col.id]
                                            : (currentConfig.columns || []).filter((c: string) => c !== col.id);
                                          updateSelectedItemInSections({
                                            queueConfig: {
                                              ...currentConfig,
                                              columns: updatedCols
                                            }
                                          });
                                        }}
                                        className="rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500 h-3 w-3"
                                      />
                                      <span className="truncate">{col.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Remove Item */}
                <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleSectionsChange(activeSections.map(sec => {
                        if (sec.id !== selectedItemInfo.sectionId) return sec;
                        return {
                          ...sec,
                          items: sec.items.filter(it => it.id !== selectedItemInfo.item.id).map(it => ({
                            ...it,
                            children: it.children?.filter(c => c.id !== selectedItemInfo.item.id)
                          }))
                        };
                      }));
                      setSelectedItemId(null);
                      toast.success(`Removed "${selectedItemInfo.item.label}"`);
                    }}
                    className="w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold"
                  >
                    <Trash2 size={14} /> Remove Item
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Settings size={28} className="text-zinc-300 dark:text-zinc-650" />
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Item Selected</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">Click on any menu item on the canvas to configure its settings.</p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ADD MODAL DRAWERS FOR TOOLBOX ITEMS */}
      {activeAddTool === 'link' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ListPlus size={18} className="text-indigo-500" /> Add Custom Link
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Label</label>
                <input
                  type="text"
                  placeholder="E.g., Client Portal"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Route Path</label>
                <input
                  type="text"
                  placeholder="E.g., /workspace/custom"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Icon</label>
                <select
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none"
                >
                  {COMMON_ICONS.map(i => (
                    <option key={i} value={i} className="bg-white dark:bg-zinc-900">{i}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setActiveAddTool(null)}>Cancel</Button>
              <Button onClick={() => handleAddCustomItem('link')}>Add to Canvas</Button>
            </div>
          </div>
        </div>
      )}

      {activeAddTool === 'subtitle' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders size={18} className="text-indigo-500" /> Add Subtitle Header
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Subtitle Text</label>
                <input
                  type="text"
                  placeholder="E.g., MANAGEMENT PANELS"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setActiveAddTool(null)}>Cancel</Button>
              <Button onClick={() => handleAddCustomItem('subtitle')}>Add Subtitle</Button>
            </div>
          </div>
        </div>
      )}

      {activeAddTool === 'queue' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddQueueItem} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu size={18} className="text-indigo-500" /> Work Queue Builder
            </h3>
            
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQueueItemType('single')}
                className={cn("flex-1 py-1.5 rounded-xl font-bold uppercase border transition-all", queueItemType === 'single' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
              >
                Single Module
              </button>
              <button
                type="button"
                onClick={() => setQueueItemType('unified')}
                className={cn("flex-1 py-1.5 rounded-xl font-bold uppercase border transition-all", queueItemType === 'unified' ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}
              >
                Unified Multi-Module
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {queueItemType === 'single' ? (
                <div>
                  <label className="font-bold text-zinc-500 uppercase block mb-1">Target Module</label>
                  <select
                    value={queueModuleId}
                    onChange={(e) => setQueueModuleId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Select custom module...</option>
                    {activeCustomModules.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-zinc-500 uppercase block mb-1">Target Modules</label>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                    {activeCustomModules.map(m => {
                      const isChecked = queueModuleIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setQueueModuleIds([...queueModuleIds, m.id]);
                              else setQueueModuleIds(queueModuleIds.filter(id => id !== m.id));
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600"
                          />
                          <span>{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Queue Name</label>
                <input
                  type="text"
                  placeholder="E.g., Priority Admissions Inbox"
                  value={queueLabel}
                  onChange={(e) => setQueueLabel(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-500 uppercase block mb-1">Queue Icon</label>
                <select
                  value={queueIcon}
                  onChange={(e) => setQueueIcon(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none"
                >
                  {COMMON_ICONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              {/* Filtering Rules */}
              <div className="border-t border-zinc-200/50 dark:border-white/10 pt-3 space-y-2">
                <label className="font-bold text-zinc-500 uppercase block">Filter Rules (AND)</label>
                <div className="space-y-2">
                  {queueRules.map((rule, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs outline-none"
                        value={rule.fieldId}
                        onChange={(e) => {
                          const updated = [...queueRules];
                          updated[idx].fieldId = e.target.value;
                          setQueueRules(updated);
                        }}
                      >
                        <option value="">Select Field...</option>
                        {queueAvailableFields.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>

                      <select
                        className="w-24 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs outline-none"
                        value={rule.operator}
                        onChange={(e) => {
                          const updated = [...queueRules];
                          updated[idx].operator = e.target.value;
                          setQueueRules(updated);
                        }}
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="is_empty">is empty</option>
                        <option value="not_empty">not empty</option>
                      </select>

                      {rule.operator !== 'is_empty' && rule.operator !== 'not_empty' && (
                        <input
                          type="text"
                          placeholder="Value"
                          className="w-24 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs outline-none"
                          value={rule.value}
                          onChange={(e) => {
                            const updated = [...queueRules];
                            updated[idx].value = e.target.value;
                            setQueueRules(updated);
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setQueueRules(queueRules.filter((_, i) => i !== idx))}
                        disabled={queueRules.length === 1}
                        className="text-zinc-400 hover:text-red-500 disabled:opacity-30 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setQueueRules([...queueRules, { fieldId: '', operator: 'equals', value: '' }])}
                  className="flex items-center gap-1 text-xs text-indigo-500 font-bold uppercase mt-1 hover:underline"
                >
                  <Plus size={12} /> Add Rule
                </button>
              </div>

              {/* Display Columns Selection (Unified Queues) */}
              {queueItemType === 'unified' && (
                <div className="border-t border-zinc-200/50 dark:border-white/10 pt-3 space-y-2">
                  <label className="font-bold text-zinc-500 uppercase block">Display Columns</label>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2 custom-scrollbar">
                    {Array.from(new Set(queueColumnOptions.map(c => c.group))).map(groupName => (
                      <div key={groupName} className="space-y-1">
                        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                          {groupName} Fields
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pl-1">
                          {queueColumnOptions.filter(c => c.group === groupName).map(col => {
                            const isChecked = queueColumns.includes(col.id);
                            return (
                              <label key={col.id} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setQueueColumns([...queueColumns, col.id]);
                                    } else {
                                      setQueueColumns(queueColumns.filter(c => c !== col.id));
                                    }
                                  }}
                                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <span className="truncate">{col.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200/50 dark:border-white/10">
              <Button type="button" variant="ghost" onClick={() => setActiveAddTool(null)}>Cancel</Button>
              <Button type="submit">Create Queue Item</Button>
            </div>
          </form>
        </div>
      )}

      {activeAddTool === 'page' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layout size={18} className="text-indigo-500" /> Select Workspace Page
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {modules.filter((mod: any) => mod.type === 'PAGE' && (mod.status === 'ACTIVE' || mod.enabled)).map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    addItemToActiveSection({
                      id: `module:${page.id}`,
                      label: page.name,
                      iconName: (page as any).iconName || (page as any).icon || 'Layers',
                      to: `/workspace/pages/${slugify(page.name)}`,
                      isVisible: true
                    });
                    setActiveAddTool(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 text-left transition-all group"
                >
                  <span className="font-bold text-xs">{page.name}</span>
                  <Plus size={16} className="text-zinc-400 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setActiveAddTool(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {activeAddTool === 'system' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Shield size={18} className="text-indigo-500" /> Select Platform Module
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {PLATFORM_MODULES_LIST.map(mod => (
                <button
                  key={mod.path}
                  onClick={() => {
                    addItemToActiveSection({
                      id: `platform-${mod.path.split('/').pop()}-${Date.now()}`,
                      label: mod.label,
                      iconName: mod.icon,
                      to: mod.path,
                      isVisible: true
                    });
                    setActiveAddTool(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 text-left transition-all group"
                >
                  <span className="font-bold text-xs">{mod.label}</span>
                  <Plus size={16} className="text-zinc-400 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setActiveAddTool(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {activeAddTool === 'custom' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} className="text-indigo-500" /> Select Custom Module
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {activeCustomModules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => {
                    addItemToActiveSection({
                      id: `module:${mod.id}`,
                      label: mod.name,
                      iconName: mod.icon || 'Box',
                      to: `/workspace/modules/${mod.id}`,
                      isVisible: true
                    });
                    setActiveAddTool(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-500/5 text-left transition-all group"
                >
                  <span className="font-bold text-xs">{mod.name}</span>
                  <Plus size={16} className="text-zinc-400 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setActiveAddTool(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {activeAddTool === 'app' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid size={18} className="text-indigo-500" /> Select Catalog App
              </h3>
              <button onClick={() => { setActiveAddTool(null); setAppSearchQuery(''); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input
                type="text"
                placeholder="Search catalog apps (e.g. Query, Drive, Docs)..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-colors text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {filteredCatalogApps.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-zinc-400">
                  No catalog apps matching "{appSearchQuery}"
                </div>
              ) : (
                filteredCatalogApps.map((app) => {
                  const IconComp = (LucideIcons as any)[app.iconName] || LucideIcons.Layout;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        addItemToActiveSection({
                          id: `app:${app.id}-${Date.now()}`,
                          label: app.label,
                          iconName: app.iconName,
                          to: app.to,
                          isVisible: true
                        });
                        setActiveAddTool(null);
                        setAppSearchQuery('');
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-indigo-500 hover:bg-indigo-500/5 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 text-indigo-500 shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          <IconComp size={15} />
                        </div>
                        <span className="font-bold text-xs truncate text-zinc-800 dark:text-zinc-200">{app.label}</span>
                      </div>
                      <Plus size={14} className="text-zinc-400 group-hover:text-indigo-500 shrink-0 ml-1" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" onClick={() => { setActiveAddTool(null); setAppSearchQuery(''); }}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

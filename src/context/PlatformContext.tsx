import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment, BillingUsage, TenantMember, Team, Module } from '../types/platform';
import { API_BASE_URL } from '../config';
import { MenuConfig } from '../types/menu';
import { systemDefaultMenuConfig } from '../config/menuDefaults';
import { toast } from 'sonner';
import { slugify } from '../lib/utils';

export interface NotificationItem {
  id: string;
  type: 'scheduled_task' | 'message' | 'system' | 'security' | 'alert' | 'user';
  audience?: 'developer' | 'business' | 'all';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  priority?: 'high' | 'medium' | 'low';
  status?: 'running' | 'completed' | 'failed';
  taskId?: string;
  taskName?: string;
  sessionId?: string;
  link?: string;
  result?: string;
}

export interface RunningTask {
  taskId: string;
  taskName: string;
  sessionId?: string;
  startTime: Date;
}

interface PlatformContextType {
  user: User | null;
  tenant: Tenant | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isLoading: boolean;
  refetchContext: () => Promise<void>;
  isDeveloper: boolean;
  capabilities: Set<string>;
  modules: Module[];
  modulesLoading: boolean;
  refreshModules: () => Promise<void>;
  menuConfig: MenuConfig | null;
  setMenuConfig: (config: MenuConfig) => void;
  updateMenuConfig: (config: MenuConfig, scope?: 'user' | 'tenant') => Promise<void>;
  billingUsage: BillingUsage | null;
  billingLoading: boolean;
  refreshBilling: () => Promise<void>;
  updateTenant: (updates: Partial<Tenant>) => Promise<void>;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isAppLauncherOpen: boolean;
  setIsAppLauncherOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isRecyclingBinOpen: boolean;
  setIsRecyclingBinOpen: (open: boolean) => void;
  breadcrumbOverrides: Record<string, string>;
  setBreadcrumbOverride: (id: string, label: string) => void;
  members: TenantMember[];
  membersLoading: boolean;
  refreshMembers: () => Promise<void>;
  teams: Team[];
  teamsLoading: boolean;
  refreshTeams: () => Promise<void>;
  notifications: NotificationItem[];
  runningTasks: RunningTask[];
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: Date; isRead?: boolean }) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const fallbackContext: PlatformContextType = {
  user: null,
  tenant: null,
  environment: 'DEV',
  setEnvironment: () => {},
  isLoading: false,
  refetchContext: async () => {},
  isDeveloper: false,
  capabilities: new Set(),
  modules: [],
  modulesLoading: false,
  refreshModules: async () => {},
  menuConfig: null,
  setMenuConfig: () => {},
  updateMenuConfig: async () => {},
  billingUsage: null,
  billingLoading: false,
  refreshBilling: async () => {},
  updateTenant: async () => {},
  isAIAssistantOpen: false,
  setIsAIAssistantOpen: () => {},
  isChatOpen: false,
  setIsChatOpen: () => {},
  isAppLauncherOpen: false,
  setIsAppLauncherOpen: () => {},
  isNotificationsOpen: false,
  setIsNotificationsOpen: () => {},
  isRecyclingBinOpen: false,
  setIsRecyclingBinOpen: () => {},
  breadcrumbOverrides: {},
  setBreadcrumbOverride: () => {},
  members: [],
  membersLoading: false,
  refreshMembers: async () => {},
  teams: [],
  teamsLoading: false,
  refreshTeams: async () => {},
  notifications: [],
  runningTasks: [],
  addNotification: () => {},
  markNotificationAsRead: () => {},
  markAllNotificationsAsRead: () => {},
  deleteNotification: () => {},
  clearNotifications: () => {},
  unreadCount: 0
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    console.warn(
      '[usePlatform] Warning: usePlatform was called outside of PlatformProvider. ' +
      'Check if PlatformProvider is correctly wrapping the component tree in App.tsx. ' +
      'Returning fallback context to prevent application crash.'
    );
    return fallbackContext;
  }
  return context;
};


export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user: supabaseUser, loading: authLoading, session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());
  
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRecyclingBinOpen, setIsRecyclingBinOpen] = useState(false);
  const [breadcrumbOverrides, setBreadcrumbOverrides] = useState<Record<string, string>>({});
  
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Global Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('aurora_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));
        }
      }
    } catch (e) {
      console.error('[PlatformContext] Error loading notifications from localStorage:', e);
    }
    return [
      {
        id: 'notif-welcome',
        type: 'system',
        title: 'Welcome to Aurora Platform',
        content: 'All agent workflows and scheduled task monitoring active.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        isRead: false,
        priority: 'low'
      }
    ];
  });

  const [runningTasks, setRunningTasks] = useState<RunningTask[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('[PlatformContext] Error saving notifications to localStorage:', e);
    }
  }, [notifications]);

  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: Date; isRead?: boolean }) => {
    const newNotif: NotificationItem = {
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: notif.timestamp || new Date(),
      isRead: notif.isRead ?? false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Global socket listener for tenant scheduled tasks
  useEffect(() => {
    const token = session?.access_token;
    if (!tenant?.id) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join_tenant', tenant.id);
    });

    socket.on('scheduled_task_triggered', (data: any) => {
      const taskId = data.taskId || data.id;
      const taskName = data.taskName || 'Scheduled Task';
      const sessionId = data.sessionId;

      setRunningTasks(prev => {
        if (prev.some(t => t.taskId === taskId)) return prev;
        return [...prev, { taskId, taskName, sessionId, startTime: new Date() }];
      });

      const notifId = `sched_task_${taskId}`;
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notifId);
        return [
          {
            id: notifId,
            type: 'scheduled_task',
            audience: 'all',
            title: `Scheduled Task Running: ${taskName}`,
            content: `Task "${taskName}" started executing in background...`,
            timestamp: new Date(),
            isRead: false,
            status: 'running',
            taskId,
            taskName,
            sessionId,
            priority: 'medium'
          },
          ...filtered
        ];
      });
    });

    socket.on('scheduled_task_completed', (data: any) => {
      const taskId = data.taskId || data.id;
      const taskName = data.taskName || 'Scheduled Task';
      const sessionId = data.sessionId;
      const isFailed = data.status === 'failed';
      const resultText = data.result || (isFailed ? 'Task execution failed' : 'Execution completed successfully');

      setRunningTasks(prev => prev.filter(t => t.taskId !== taskId));

      const notifId = `sched_task_${taskId}`;
      setNotifications(prev => {
        const existing = prev.find(n => n.id === notifId);
        const updated: NotificationItem = {
          id: notifId,
          type: 'scheduled_task',
          audience: 'all',
          title: isFailed ? `Scheduled Task Failed: ${taskName}` : `Scheduled Task Completed: ${taskName}`,
          content: `Task "${taskName}" finished: ${resultText}`,
          timestamp: new Date(),
          isRead: false,
          status: isFailed ? 'failed' : 'completed',
          taskId,
          taskName,
          sessionId: sessionId || existing?.sessionId,
          result: resultText,
          priority: isFailed ? 'high' : 'medium'
        };
        return [updated, ...prev.filter(n => n.id !== notifId)];
      });
    });

    const handleRecordAssignment = (data: any) => {
      if (!data || !data.id) return;
      const currentUserId = user?.id || supabaseUser?.id;
      const currentUserEmail = user?.email || supabaseUser?.email;
      const currentUserName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

      const assignee = data.assigneeId || data.assignedTo || data.assignee || data._assigneeId || data.assignedUserId;
      if (!assignee) return;

      const isMatch = (currentUserId && String(assignee) === String(currentUserId)) ||
                      (currentUserEmail && String(assignee).toLowerCase() === String(currentUserEmail).toLowerCase()) ||
                      (currentUserName && typeof assignee === 'string' && assignee.toLowerCase().includes(currentUserName.toLowerCase()));

      if (isMatch) {
        const recordName = data.name || data.title || data.subject || data.ticketNumber || `#${String(data.id).slice(-6)}`;
        const moduleObj = modules.find((m: any) => m.id === data.moduleId);
        const moduleName = moduleObj?.name || 'Workspace Module';
        const notifId = `assign_${data.id}_${Date.now()}`;

        addNotification({
          id: notifId,
          type: 'user',
          audience: 'business',
          title: `Assigned to Record: ${recordName}`,
          content: `You have been assigned to record "${recordName}" in ${moduleName}.`,
          timestamp: new Date(),
          isRead: false,
          priority: 'high',
          link: data.moduleId ? `/modules/${data.moduleId}` : '/workspace'
        });
      }
    };

    socket.on('record_added', (data: any) => {
      handleRecordAssignment(data);
    });

    socket.on('record_updated', (data: any) => {
      handleRecordAssignment(data);
    });

    socket.on('sla_status_changed', (data: any) => {
      const isBreached = data.slaStatus === 'BREACHED';
      const notifId = `sla_${data.recordId}_${data.slaStatus}`;
      addNotification({
        id: notifId,
        type: 'alert',
        audience: 'business',
        title: isBreached ? `SLA Breached: Record #${String(data.recordId).slice(-6)}` : `SLA Warning: Record #${String(data.recordId).slice(-6)}`,
        content: `Record in module "${data.moduleName || 'Triage'}" has ${isBreached ? 'breached its SLA deadline' : 'entered the SLA warning window'}.`,
        timestamp: new Date(),
        isRead: false,
        priority: isBreached ? 'high' : 'medium',
        status: isBreached ? 'failed' : 'running',
        link: data.moduleId ? `/modules/${data.moduleId}` : '/triage'
      });
    });

    socket.on('connector_sync_failed', (data: any) => {
      const notifId = `connector_err_${data.connectorId}_${Date.now()}`;
      addNotification({
        id: notifId,
        type: 'system',
        audience: 'developer',
        title: `Connector Sync Failed: ${data.connectorName || 'Integration'}`,
        content: `Sync failed for ${data.connectorName}: ${data.error || 'Connection error'}.`,
        timestamp: new Date(),
        isRead: false,
        priority: 'high',
        status: 'failed',
        link: '/workspace/settings'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [tenant?.id, session?.access_token]);

  const userRef = useRef<User | null>(null);
  const tenantRef = useRef<Tenant | null>(null);

  useEffect(() => {
    userRef.current = user;
    tenantRef.current = tenant;
  }, [user, tenant]);

  const setBreadcrumbOverride = useCallback((id: string, label: string) => {
    setBreadcrumbOverrides(prev => ({ ...prev, [id]: label }));
  }, []);

  const isSeedingRef = useRef(false);

  const seedDefaultPages = useCallback(async (tenantId: string, token: string) => {
    if (isSeedingRef.current) return;
    isSeedingRef.current = true;

    try {
      console.log('[PlatformContext] Seeding default configurable pages...');

      // 1. Create Dashboard page
      const dashRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: 'Dashboard',
          category: 'Workspace Pages',
          iconName: 'LayoutDashboard',
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          config: {
            widgets: [
              { id: `stats-grid-1`, type: 'stats-grid', title: 'Overview Stats', w: 12 },
              { id: `active-workflows-1`, type: 'active-workflows', title: 'Active Workflows', w: 12 }
            ]
          }
        })
      });

      // 2. Create My Work page
      const workRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: 'My Work',
          category: 'Workspace Pages',
          iconName: 'ClipboardList',
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          config: {
            widgets: [
              { id: `work-queue-1`, type: 'work-queue', title: 'My Work Inbox', w: 12 }
            ]
          }
        })
      });

      if (dashRes.ok && workRes.ok) {
        const dashPage = await dashRes.json();
        const workPage = await workRes.json();

        // 3. Construct default Workspace menu section
        const newMenuConfig = {
          sections: [
            {
              id: 'workspace-section',
              title: 'Workspace',
              items: [
                {
                  id: `module:${dashPage.id}`,
                  label: 'Dashboard',
                  iconName: 'LayoutDashboard',
                  to: `/workspace/pages/${slugify(dashPage.name || 'Dashboard')}`,
                  isVisible: true
                },
                {
                  id: `module:${workPage.id}`,
                  label: 'My Work',
                  iconName: 'ClipboardList',
                  to: `/workspace/pages/${slugify(workPage.name || 'My Work')}`,
                  isVisible: true
                }
              ]
            }
          ]
        };

        // 4. Update tenant menu configuration
        const menuConfigRes = await fetch(`${API_BASE_URL}/api/platform/menu-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          },
          body: JSON.stringify({ config: newMenuConfig, scope: 'tenant' })
        });

        if (menuConfigRes.ok) {
          setMenuConfig(newMenuConfig);
        }

        // 5. Reload modules list
        const refreshRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        if (refreshRes.ok) {
          const freshMods = await refreshRes.json();
          setModules(freshMods);
        }

        toast.success('Successfully provisioned configurable Workspace Pages!');
      }
    } catch (err) {
      console.error('[PlatformContext] Error seeding default pages:', err);
    } finally {
      isSeedingRef.current = false;
    }
  }, []);

  const refreshModules = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setModulesLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/data/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data: Module[] = await res.json();
        setModules(data);

        // Auto-provision default pages if none exist yet
        const pages = data.filter((m: any) => m.type === 'PAGE');
        if (pages.length === 0) {
          seedDefaultPages(tenant.id, token);
        }
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch modules:', err);
    } finally {
      setModulesLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token, seedDefaultPages]);

  const updateMenuConfig = async (config: MenuConfig, scope: 'user' | 'tenant' = 'user') => {
    if (!tenant?.id) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/platform/menu-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({ config, scope })
      });

      if (res.ok) {
        let resolvedConfig = config;
        // If it's an advanced mapping configuration (tenant scope), resolve it for the active user
        if (config && typeof config === 'object' && !Array.isArray(config) && ('default' in config || 'roles' in config || 'teams' in config || 'positions' in config || 'users' in config)) {
          const tConfig = config as any;
          const userAny = user as any;
          const memberId = userAny?.memberId || userAny?.cuid;
          const teamId = userAny?.teamId;
          const positionId = userAny?.positionId;
          const roleId = userAny?.roleId || userAny?.role || 'USER';

          resolvedConfig = 
            (memberId && tConfig.users?.[memberId]) ||
            (teamId && tConfig.teams?.[teamId]) ||
            (positionId && tConfig.positions?.[positionId]) ||
            (roleId && tConfig.roles?.[roleId]) ||
            tConfig.default ||
            systemDefaultMenuConfig;
        }
        setMenuConfig(resolvedConfig);
        toast.success(`Menu configuration saved to ${scope === 'tenant' ? 'organization' : 'profile'}.`);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      console.error('[PlatformContext] Failed to update menu config:', err);
      toast.error(err.message);
    }
  };

  const updateTenant = async (updates: Partial<Tenant>) => {
    if (!tenant?.id) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      console.log('[PlatformContext] Updating tenant:', updates);
      const res = await fetch(`${API_BASE_URL}/api/platform/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[PlatformContext] Update response:', data);
        setTenant(prev => prev ? { ...prev, ...data.tenant } : data.tenant);
        toast.success('Organization settings updated.');
      } else {
        const error = await res.json();
        console.log('[PlatformContext] Update error:', error);
        throw new Error(error.error || 'Failed to update settings');
      }
    } catch (err: any) {
      console.error('[PlatformContext] Failed to update tenant:', err);
      toast.error(err.message);
    }
  };

  const refreshBilling = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setBillingLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/billing/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBillingUsage(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch billing usage:', err);
    } finally {
      setBillingLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);

  const refreshMembers = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setMembersLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);

  const refreshTeams = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setTeamsLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);


  const fetchContext = useCallback(async () => {
    if (!supabaseUser) return;

    // Only show global spinner if we don't have the core context yet
    if (!userRef.current || !tenantRef.current) {
      setIsLoading(true);
    }
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/platform/context`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Sync failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Prevent redundant state updates if data hasn't changed
      // We check user and tenant separately to be more granular
      const currentUserStr = JSON.stringify(userRef.current);
      const tenantRefStr = JSON.stringify(tenantRef.current);
      
      const newUserStr = JSON.stringify(data.user);
      const newTenantStr = JSON.stringify(data.tenant);

      if (currentUserStr !== newUserStr) {
        const synchronizedUser = data.user ? {
          ...data.user,
          // Extract memberId and organizational details from the nested member object or top-level fallbacks
          memberId: data.user.memberId || data.member?.id || data.membership?.id || data.tenantMember?.id,
          cuid: data.user.memberId || data.member?.id || data.membership?.id || data.tenantMember?.id,
          teamId: data.user.teamId || data.user.team_id || data.member?.teamId || data.member?.team_id || data.membership?.teamId || data.membership?.team_id || data.tenantMember?.teamId || data.tenantMember?.team_id,
          team: data.user.team || data.member?.team || data.membership?.team || data.tenantMember?.team,
          positionId: data.user.positionId || data.user.position_id || data.member?.positionId || data.member?.position_id || data.membership?.positionId || data.membership?.position_id || data.tenantMember?.positionId || data.tenantMember?.position_id,
          position: data.user.position || data.member?.position || data.membership?.position || data.tenantMember?.position
        } : null;
        setUser(synchronizedUser);
      }

      if (tenantRefStr !== newTenantStr) {
        setTenant(data.tenant);
      }
      
      // Use backend menuConfig if available, otherwise fall back to system default (empty)
      let resolvedConfig: MenuConfig;
      if (data.menuConfig && Array.isArray(data.menuConfig.sections)) {
        resolvedConfig = data.menuConfig;
      } else {
        resolvedConfig = systemDefaultMenuConfig;
      }
      setMenuConfig(resolvedConfig);
    } catch (err: any) {
      console.error('[PlatformContext] Sync Critical Failure:', err.message);
      setUser(null);
      setTenant(null);
      setMenuConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseUser, session?.access_token]);

  const refetchContext = async () => {
    await fetchContext();
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!supabaseUser) {
      setUser(null);
      setTenant(null);
      setModules([]);
      setMenuConfig(null);
      setCapabilities(new Set());
      setIsLoading(false);
      return;
    }

    fetchContext();
  }, [supabaseUser, authLoading, fetchContext]);

  useEffect(() => {
    console.log('[PlatformTrace] PlatformProvider Mounted', { 
      hasSupabaseUser: !!supabaseUser, 
      authLoading, 
      hasSession: !!session 
    });
  }, []);

  // Fetch modules once tenant is available
  useEffect(() => {
    if (tenant?.id) {
      refreshModules();
      refreshBilling();
      refreshMembers();
      refreshTeams();
    }
  }, [tenant?.id, supabaseUser, refreshModules, refreshBilling, refreshMembers, refreshTeams]);

  const isDevUser = user?.licenceType === 'Developer' || user?.isSuperAdmin || user?.role === 'TENANT_ADMIN' || user?.role === 'admin' || user?.role === 'Admin' || false;
  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => {
    if (!n || n.isRead) return false;
    const aud = n.audience || (n.type === 'scheduled_task' ? 'developer' : 'all');
    if (aud === 'developer' && !isDevUser) return false;
    return true;
  }).length;

  return (
    <PlatformContext.Provider value={{ 
      user, 
      tenant, 
      environment, 
      setEnvironment, 
      isLoading,
      refetchContext,
      isDeveloper: user?.licenceType === 'Developer' || user?.isSuperAdmin || user?.role === 'TENANT_ADMIN' || user?.role === 'admin' || user?.role === 'Admin' || false,
      capabilities,
      modules,
      modulesLoading,
      refreshModules,
      menuConfig,
      setMenuConfig,
      updateMenuConfig,
      billingUsage,
      billingLoading,
      refreshBilling,
      updateTenant,
      isAIAssistantOpen,
      setIsAIAssistantOpen,
      isChatOpen,
      setIsChatOpen,
      isAppLauncherOpen,
      setIsAppLauncherOpen,
      isNotificationsOpen,
      setIsNotificationsOpen,
      isRecyclingBinOpen,
      setIsRecyclingBinOpen,
      breadcrumbOverrides,
      setBreadcrumbOverride,
      members,
      membersLoading,
      refreshMembers,
      teams,
      teamsLoading,
      refreshTeams,
      notifications,
      runningTasks,
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      clearNotifications,
      unreadCount
    }}>
      {/* 
          IMPORTANT: We must always render children here. 
          If we return null during loading, components like ProtectedRoute (which usePlatform)
          will throw "must be used within PlatformProvider" because the Provider was unmounted.
      */}
      {children}
    </PlatformContext.Provider>
  );
};

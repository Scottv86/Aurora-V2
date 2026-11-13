import React, { useState, useEffect, useMemo } from 'react';
import {
  Headset,
  Save,
  Clock,
  ShieldAlert,
  Bot,
  Users,
  CheckCircle2,
  PhoneCall,
  Sliders,
  ExternalLink,
  RefreshCw,
  Bell,
  Sparkles,
  ArrowRight,
  ListTodo,
  ListOrdered,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  AlertTriangle,
  Layers,
  MessageSquare,
  HelpCircle,
  Activity,
  ChevronRight,
  Calendar,
  Zap,
  Star,
  Timer,
  Globe,
  ShieldCheck,
  Lock,
  Copy,
  ThumbsUp,
  ThumbsDown,
  HeartHandshake,
  Eye,
  AlertCircle
} from 'lucide-react';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { Button } from '../../../components/UI/Primitives';
import { toast } from 'sonner';
import { cn, slugify } from '../../../lib/utils';
import { usePlatform } from '../../../context/PlatformContext';
import { ServiceDeskService } from '../../../services/serviceDeskService';
import {
  ServiceDeskTenantSettings,
  DEFAULT_SERVICE_DESK_TENANT_SETTINGS,
  ServiceDeskAllocationMode,
  ServiceDeskFeedbackCase,
  ServiceDeskCannedResponse
} from '../../../types/serviceDesk';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SUB_NAV_ITEMS: SettingsSubNavItem[] = [
  { id: 'general', label: 'General & SLAs', icon: Clock, description: 'Response targets, concurrency & alerts' },
  { id: 'queues', label: 'Queues & Dispatch', icon: ListOrdered, description: 'Manage service queues, SLAs & routing' },
  { id: 'business_hours', label: 'Hours & Schedules', icon: Calendar, description: 'Operating times, timezones & off-hours' },
  { id: 'canned_responses', label: 'Canned Responses', icon: Zap, description: 'Quick-reply macros & dynamic snippets' },
  { id: 'feedback_loop', label: 'Feedback & Closed Loop', icon: Star, description: 'CSAT surveys & customer remediation SLA' },
  { id: 'inactivity', label: 'Inactivity & Ghosting', icon: Timer, description: 'Idle warnings & auto-close timers' },
  { id: 'widget', label: 'Chat Widget & Embed', icon: Globe, description: 'Launcher design, pre-chat intake & script' },
  { id: 'routing', label: 'Routing & Allocation', icon: Users, description: 'AI vs human routing & queue fallback' },
  { id: 'wrap_up', label: 'Wrap-Up & ACW', icon: CheckCircle2, description: 'Disposition codes, ACW timers & auto-fill' },
  { id: 'ai_guardrails', label: 'AI & HITL Guardrails', icon: Bot, description: 'Confidence thresholds & approvals' },
  { id: 'telephony', label: 'Telephony & Voice', icon: PhoneCall, description: 'Inbound lines, recording & greetings' },
  { id: 'security', label: 'Security & PII', icon: ShieldCheck, description: 'PII masking & data retention policy' }
];

const QUEUE_ICONS = [
  { id: 'MessageSquare', label: 'Chat / Inquiries', icon: MessageSquare },
  { id: 'PhoneCall', label: 'Voice / Telephony', icon: PhoneCall },
  { id: 'ShieldAlert', label: 'Escalations / Urgent', icon: ShieldAlert },
  { id: 'Bot', label: 'AI Assistant', icon: Bot },
  { id: 'Users', label: 'Team / Support', icon: Users },
  { id: 'HelpCircle', label: 'General Help', icon: HelpCircle }
];

const TIMEZONE_OPTIONS = [
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT UTC+9:30/10:30)' },
  { value: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST/AEDT UTC+10/11)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST UTC+10)' },
  { value: 'Australia/Perth', label: 'Perth (AWST UTC+8)' },
  { value: 'America/New_York', label: 'New York (EST/EDT UTC-5/4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT UTC-8/7)' },
  { value: 'Europe/London', label: 'London (GMT/BST UTC+0/1)' },
  { value: 'UTC', label: 'Universal Time (UTC)' }
];

export const ServiceDeskSettings: React.FC = () => {
  const { tenant } = usePlatform();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState<string>(currentTab);

  const [settings, setSettings] = useState<ServiceDeskTenantSettings>(DEFAULT_SERVICE_DESK_TENANT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Queues Management State
  const [queues, setQueues] = useState<any[]>([]);
  const [isQueuesLoading, setIsQueuesLoading] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'AI_FIRST' | 'HUMAN_FIRST'>('ALL');
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const [queueFormData, setQueueFormData] = useState({
    name: '',
    slug: '',
    description: '',
    slaMinutes: 15,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    targetAssigneeType: 'AI_FIRST' as 'AI_FIRST' | 'HUMAN_FIRST' | 'HYBRID_CO_PILOT',
    iconName: 'MessageSquare',
    status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT'
  });
  const [isSavingQueue, setIsSavingQueue] = useState(false);
  const [deleteConfirmQueue, setDeleteConfirmQueue] = useState<any | null>(null);
  const [isDeletingQueue, setIsDeletingQueue] = useState(false);

  // Canned Responses State
  const [cannedResponses, setCannedResponses] = useState<ServiceDeskCannedResponse[]>([]);
  const [isCannedLoading, setIsCannedLoading] = useState(false);
  const [cannedSearch, setCannedSearch] = useState('');
  const [cannedCategory, setCannedCategory] = useState<string>('ALL');
  const [isCannedModalOpen, setIsCannedModalOpen] = useState(false);
  const [editingCannedId, setEditingCannedId] = useState<string | null>(null);
  const [cannedFormData, setCannedFormData] = useState({
    shortcut: '',
    title: '',
    content: '',
    category: 'General',
    isShared: true
  });
  const [isSavingCanned, setIsSavingCanned] = useState(false);
  const [deleteConfirmCanned, setDeleteConfirmCanned] = useState<ServiceDeskCannedResponse | null>(null);

  // Customer Feedback Loop State
  const [feedbackCases, setFeedbackCases] = useState<ServiceDeskFeedbackCase[]>([]);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<any>({
    total: 0,
    pendingOutreach: 0,
    inRemediation: 0,
    closedLoopResolved: 0,
    avgScore: 5.0,
    slaComplianceRate: 100
  });
  const [feedbackFilter, setFeedbackFilter] = useState<string>('ALL');
  const [activeRemediationModalCase, setActiveRemediationModalCase] = useState<ServiceDeskFeedbackCase | null>(null);
  const [remediationFormData, setRemediationFormData] = useState({
    status: 'RESOLVED_CLOSED_LOOP' as any,
    rootCauseCategory: 'SERVICE_DELAY',
    remediationAction: 'PHONE_OUTREACH',
    remediationNotes: ''
  });
  const [isSavingRemediation, setIsSavingRemediation] = useState(false);

  // New Holiday Modal State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Synchronize Tab with URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Load General Settings
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const loaded = await ServiceDeskService.getSettings(tenant?.id);
        if (isMounted) {
          setSettings({
            ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS,
            ...loaded,
            businessHours: {
              ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS.businessHours,
              ...(loaded.businessHours || {})
            },
            inactivity: {
              ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS.inactivity,
              ...(loaded.inactivity || {})
            },
            feedbackLoop: {
              ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS.feedbackLoop,
              ...(loaded.feedbackLoop || {})
            },
            widget: {
              ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS.widget,
              ...(loaded.widget || {})
            },
            security: {
              ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS.security,
              ...(loaded.security || {})
            }
          });
          setIsDirty(false);
        }
      } catch (err: any) {
        console.error('Failed to load Service Desk settings:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  // Load Queues
  const loadQueues = async () => {
    setIsQueuesLoading(true);
    try {
      const loaded = await ServiceDeskService.listQueues(tenant?.id);
      setQueues(Array.isArray(loaded) ? loaded : []);
    } catch (err: any) {
      console.error('Failed to fetch queues:', err);
    } finally {
      setIsQueuesLoading(false);
    }
  };

  // Load Canned Responses
  const loadCannedResponses = async () => {
    setIsCannedLoading(true);
    try {
      const loaded = await ServiceDeskService.getCannedResponses(tenant?.id);
      setCannedResponses(Array.isArray(loaded) ? loaded : []);
    } catch (err: any) {
      console.error('Failed to load canned responses:', err);
    } finally {
      setIsCannedLoading(false);
    }
  };

  // Load Feedback Cases & Stats
  const loadFeedbackData = async () => {
    setIsFeedbackLoading(true);
    try {
      const [cases, stats] = await Promise.all([
        ServiceDeskService.getFeedbackCases({}, tenant?.id),
        ServiceDeskService.getFeedbackStats(tenant?.id)
      ]);
      setFeedbackCases(Array.isArray(cases) ? cases : []);
      if (stats) setFeedbackStats(stats);
    } catch (err: any) {
      console.error('Failed to load feedback cases:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queues') loadQueues();
    if (activeTab === 'canned_responses') loadCannedResponses();
    if (activeTab === 'feedback_loop') loadFeedbackData();
  }, [activeTab, tenant?.id]);

  const handleChange = <K extends keyof ServiceDeskTenantSettings>(key: K, value: ServiceDeskTenantSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleNestedChange = <
    K extends 'businessHours' | 'inactivity' | 'feedbackLoop' | 'widget' | 'security',
    SubK extends keyof ServiceDeskTenantSettings[K]
  >(
    section: K,
    key: SubK,
    value: ServiceDeskTenantSettings[K][SubK]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await ServiceDeskService.updateSettings(settings, tenant?.id);
      setSettings(prev => ({
        ...prev,
        ...saved
      }));
      setIsDirty(false);
      toast.success('Service Desk settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Queue Handlers
  const handleOpenCreateQueue = () => {
    setEditingQueueId(null);
    setQueueFormData({
      name: '',
      slug: '',
      description: '',
      slaMinutes: 15,
      priority: 'MEDIUM',
      targetAssigneeType: 'AI_FIRST',
      iconName: 'MessageSquare',
      status: 'PUBLISHED'
    });
    setIsQueueModalOpen(true);
  };

  const handleOpenEditQueue = (queue: any) => {
    setEditingQueueId(queue.id);
    const cfg = queue.queueConfig || {};
    setQueueFormData({
      name: queue.name || '',
      slug: queue.slug || '',
      description: queue.description || '',
      slaMinutes: cfg.slaMinutes || 15,
      priority: cfg.priority || 'MEDIUM',
      targetAssigneeType: cfg.targetAssigneeType || 'AI_FIRST',
      iconName: queue.iconName || 'MessageSquare',
      status: queue.status || 'PUBLISHED'
    });
    setIsQueueModalOpen(true);
  };

  const handleSaveQueueModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueFormData.name.trim()) {
      toast.error('Queue name is required');
      return;
    }

    setIsSavingQueue(true);
    try {
      const existingQueue = editingQueueId ? queues.find(q => q.id === editingQueueId) : null;
      const slug = queueFormData.slug.trim() || slugify(queueFormData.name);

      const queueRecord = {
        ...(existingQueue || {}),
        id: editingQueueId || `queue-${slug}-${Date.now()}`,
        name: queueFormData.name.trim(),
        slug,
        description: queueFormData.description.trim(),
        iconName: queueFormData.iconName,
        status: queueFormData.status,
        isGlobal: true,
        queueConfig: {
          ...(existingQueue?.queueConfig || {}),
          slaMinutes: Number(queueFormData.slaMinutes) || 15,
          priority: queueFormData.priority,
          targetAssigneeType: queueFormData.targetAssigneeType
        }
      };

      await ServiceDeskService.upsertQueue(queueRecord, tenant?.id);
      toast.success(editingQueueId ? 'Queue updated successfully' : 'New queue created');
      setIsQueueModalOpen(false);
      await loadQueues();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save queue');
    } finally {
      setIsSavingQueue(false);
    }
  };

  const handleDeleteQueue = async () => {
    if (!deleteConfirmQueue) return;
    setIsDeletingQueue(true);
    try {
      await ServiceDeskService.deleteQueue(deleteConfirmQueue.id, tenant?.id);
      toast.success(`Queue "${deleteConfirmQueue.name}" deleted`);
      setDeleteConfirmQueue(null);
      await loadQueues();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete queue');
    } finally {
      setIsDeletingQueue(false);
    }
  };

  // Canned Response Handlers
  const handleOpenCreateCanned = () => {
    setEditingCannedId(null);
    setCannedFormData({
      shortcut: '',
      title: '',
      content: '',
      category: 'General',
      isShared: true
    });
    setIsCannedModalOpen(true);
  };

  const handleOpenEditCanned = (item: ServiceDeskCannedResponse) => {
    setEditingCannedId(item.id);
    setCannedFormData({
      shortcut: item.shortcut,
      title: item.title,
      content: item.content,
      category: item.category,
      isShared: item.isShared
    });
    setIsCannedModalOpen(true);
  };

  const handleSaveCannedModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cannedFormData.shortcut.trim() || !cannedFormData.content.trim()) {
      toast.error('Shortcut and content are required');
      return;
    }

    setIsSavingCanned(true);
    try {
      await ServiceDeskService.upsertCannedResponse(cannedFormData, tenant?.id);
      toast.success(editingCannedId ? 'Canned response updated' : 'New canned macro created');
      setIsCannedModalOpen(false);
      await loadCannedResponses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save canned response');
    } finally {
      setIsSavingCanned(false);
    }
  };

  const handleDeleteCanned = async () => {
    if (!deleteConfirmCanned) return;
    try {
      await ServiceDeskService.deleteCannedResponse(deleteConfirmCanned.id, tenant?.id);
      toast.success(`Macro "${deleteConfirmCanned.shortcut}" deleted`);
      setDeleteConfirmCanned(null);
      await loadCannedResponses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete macro');
    }
  };

  // Closed Loop Remediation Handlers
  const handleOpenRemediationModal = (c: ServiceDeskFeedbackCase) => {
    setActiveRemediationModalCase(c);
    setRemediationFormData({
      status: c.status === 'NEW_UNASSIGNED' || c.status === 'IN_REVIEW' ? 'REMEDIATION_OFFERED' : c.status,
      rootCauseCategory: c.rootCauseCategory || 'SERVICE_DELAY',
      remediationAction: c.remediationAction || 'PHONE_OUTREACH',
      remediationNotes: c.remediationNotes || ''
    });
  };

  const handleSaveRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemediationModalCase) return;

    setIsSavingRemediation(true);
    try {
      await ServiceDeskService.updateFeedbackCase(
        activeRemediationModalCase.id,
        remediationFormData,
        tenant?.id
      );
      toast.success('Customer remediation recorded & case updated');
      setActiveRemediationModalCase(null);
      await loadFeedbackData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update feedback case');
    } finally {
      setIsSavingRemediation(false);
    }
  };

  // Holiday Calendar Handlers
  const handleAddHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.error('Holiday name and date are required');
      return;
    }
    const updated = [
      ...settings.businessHours.holidays,
      { id: `h-${Date.now()}`, name: newHolidayName.trim(), date: newHolidayDate }
    ];
    handleNestedChange('businessHours', 'holidays', updated);
    setNewHolidayName('');
    setNewHolidayDate('');
    toast.success('Holiday added');
  };

  const handleRemoveHoliday = (id: string) => {
    const updated = settings.businessHours.holidays.filter(h => h.id !== id);
    handleNestedChange('businessHours', 'holidays', updated);
  };

  // Filtered Queues & Stats
  const filteredQueues = useMemo(() => {
    return queues.filter(q => {
      const matchesSearch =
        q.name?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        q.slug?.toLowerCase().includes(queueSearch.toLowerCase()) ||
        q.description?.toLowerCase().includes(queueSearch.toLowerCase());
      if (!matchesSearch) return false;

      const assigneeType = q.queueConfig?.targetAssigneeType || 'AI_FIRST';
      if (queueFilter === 'AI_FIRST' && assigneeType !== 'AI_FIRST') return false;
      if (queueFilter === 'HUMAN_FIRST' && assigneeType === 'AI_FIRST') return false;
      return true;
    });
  }, [queues, queueSearch, queueFilter]);

  const queueStats = useMemo(() => {
    const total = queues.length;
    const aiFirst = queues.filter(q => (q.queueConfig?.targetAssigneeType || 'AI_FIRST') === 'AI_FIRST').length;
    const humanFirst = total - aiFirst;
    const avgSla = total > 0
      ? Math.round(queues.reduce((acc, q) => acc + (q.queueConfig?.slaMinutes || 15), 0) / total)
      : 15;
    return { total, aiFirst, humanFirst, avgSla };
  }, [queues]);

  // Filtered Canned Responses
  const filteredCanned = useMemo(() => {
    return cannedResponses.filter(c => {
      const matchesSearch =
        c.shortcut?.toLowerCase().includes(cannedSearch.toLowerCase()) ||
        c.title?.toLowerCase().includes(cannedSearch.toLowerCase()) ||
        c.content?.toLowerCase().includes(cannedSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (cannedCategory !== 'ALL' && c.category !== cannedCategory) return false;
      return true;
    });
  }, [cannedResponses, cannedSearch, cannedCategory]);

  // Filtered Feedback Cases
  const filteredFeedback = useMemo(() => {
    return feedbackCases.filter(c => {
      if (feedbackFilter === 'PENDING' && c.status !== 'NEW_UNASSIGNED' && c.status !== 'IN_REVIEW') return false;
      if (feedbackFilter === 'REMEDIATION' && c.status !== 'OUTREACH_SCHEDULED' && c.status !== 'REMEDIATION_OFFERED') return false;
      if (feedbackFilter === 'RESOLVED' && c.status !== 'RESOLVED_CLOSED_LOOP') return false;
      return true;
    });
  }, [feedbackCases, feedbackFilter]);

  const renderQueueIcon = (iconName?: string) => {
    switch (iconName) {
      case 'PhoneCall':
        return <PhoneCall className="w-4 h-4 text-emerald-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'Bot':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'Users':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'HelpCircle':
        return <HelpCircle className="w-4 h-4 text-cyan-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  const copyWidgetScript = () => {
    const scriptTag = `<script src="${window.location.origin}/widget.js" data-tenant-id="${tenant?.id || 'demo'}" async></script>`;
    navigator.clipboard.writeText(scriptTag);
    toast.success('Widget embed code copied to clipboard!');
  };

  return (
    <SettingsSubNavLayout
      title="Service Desk Settings"
      description="Omnichannel contact center configurations, SLAs, business hours, quick reply macros, and closed-loop feedback processes."
      items={SUB_NAV_ITEMS}
      activeId={activeTab}
      onTabChange={handleTabChange}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/workspace/apps/service-desk')}
            className="flex items-center gap-1.5 text-xs text-zinc-300 border-zinc-700 hover:bg-zinc-800"
          >
            <Headset size={14} className="text-indigo-400" />
            <span>Open Service Desk</span>
            <ExternalLink size={12} className="opacity-60" />
          </Button>

          {activeTab !== 'queues' && activeTab !== 'canned_responses' && activeTab !== 'feedback_loop' && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md",
                isDirty
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed opacity-60"
              )}
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-4xl space-y-6 pb-20">
        {/* =====================================================================
            TAB 1: GENERAL & SLAS
            ===================================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Clock size={16} className="text-indigo-500" />
                  Service Level Agreements (SLAs)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Set target response thresholds for chat conversations and inbound customer requests.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Default First Response Target (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.defaultSlaTargetMinutes}
                    onChange={e => handleChange('defaultSlaTargetMinutes', parseInt(e.target.value) || 15)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Interactions exceeding this handle time without an operator turn will flag as SLA Breached.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Breach Warning Window (Minutes prior)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.slaBreachWarningMinutes}
                    onChange={e => handleChange('slaBreachWarningMinutes', parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Warning pill appears in the queue when an interaction is within this window of breach.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sliders size={16} className="text-indigo-500" />
                  Operator Workload & Alerts
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Control simultaneous conversation limits and audio/visual desktop notifications.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Max Concurrent Chats per Operator
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxConcurrentChatsPerOperator}
                    onChange={e => handleChange('maxConcurrentChatsPerOperator', parseInt(e.target.value) || 3)}
                    className="w-48 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Audible Sound Alerts</div>
                      <div className="text-[11px] text-zinc-500">Play ringing sound on inbound voice calls and ping on customer chat replies</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableSoundAlerts}
                      onChange={e => handleChange('enableSoundAlerts', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Browser Desktop Notifications</div>
                      <div className="text-[11px] text-zinc-500">Trigger system notifications when an interaction is assigned while app is minimized</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableBrowserNotifications}
                      onChange={e => handleChange('enableBrowserNotifications', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: QUEUES & DISPATCH
            ===================================================================== */}
        {activeTab === 'queues' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Queues</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{queueStats.total}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Dispatched contact lines</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">AI First</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{queueStats.aiFirst}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Autonomous intake triage</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Human Escalations</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{queueStats.humanFirst}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Direct operator dispatch</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-cyan-500 uppercase tracking-wider">Avg SLA Target</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{queueStats.avgSla}m</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">First response commitment</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <ListOrdered size={16} className="text-indigo-500" />
                    Service Desk Queues & Dispatches
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage service queues, response SLAs, assignment policies, and contact channels.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/workspace/settings/platform-modules/queues-management')}
                    className="flex items-center gap-1.5 text-xs text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                  >
                    <Layers size={13} className="text-indigo-400" />
                    <span>Queue Builder</span>
                    <ExternalLink size={11} className="opacity-60" />
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleOpenCreateQueue}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-md shadow-indigo-600/20"
                  >
                    <Plus size={14} />
                    <span>New Queue</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={e => setQueueSearch(e.target.value)}
                    placeholder="Search queues by name or slug..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setQueueFilter('ALL')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                      queueFilter === 'ALL'
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    All ({queues.length})
                  </button>
                  <button
                    onClick={() => setQueueFilter('AI_FIRST')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                      queueFilter === 'AI_FIRST'
                        ? "bg-white dark:bg-zinc-800 text-indigo-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    AI First ({queueStats.aiFirst})
                  </button>
                  <button
                    onClick={() => setQueueFilter('HUMAN_FIRST')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                      queueFilter === 'HUMAN_FIRST'
                        ? "bg-white dark:bg-zinc-800 text-amber-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Human Escalation ({queueStats.humanFirst})
                  </button>
                </div>
              </div>

              {isQueuesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw size={20} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading queues...</span>
                </div>
              ) : filteredQueues.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <ListOrdered size={28} className="mx-auto text-zinc-600 mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-zinc-400">No queues found</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {filteredQueues.map(queue => {
                    const cfg = queue.queueConfig || {};
                    const isAiFirst = (cfg.targetAssigneeType || 'AI_FIRST') === 'AI_FIRST';
                    const priority = cfg.priority || 'MEDIUM';
                    const slaMinutes = cfg.slaMinutes || 15;

                    return (
                      <div
                        key={queue.id}
                        className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0 mt-0.5">
                            {renderQueueIcon(queue.iconName)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                {queue.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded">
                                {queue.slug || queue.id}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                {queue.status || 'PUBLISHED'}
                              </span>
                            </div>

                            {queue.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                {queue.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1",
                                  isAiFirst
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                )}
                              >
                                {isAiFirst ? <Bot size={11} /> : <Users size={11} />}
                                {isAiFirst ? 'AI Assistant First' : 'Human Operator First'}
                              </span>

                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 flex items-center gap-1">
                                <Clock size={11} />
                                {slaMinutes >= 60 ? `${slaMinutes / 60}h SLA` : `${slaMinutes}m SLA`}
                              </span>

                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                                  priority === 'URGENT'
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : priority === 'HIGH'
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                )}
                              >
                                {priority} Priority
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleOpenEditQueue(queue)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Edit Queue Configuration"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => navigate('/workspace/settings/platform-modules/queues-management', { state: { queueId: queue.id } })}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors"
                            title="Open in Full Queue Builder"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmQueue(queue)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Queue"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: BUSINESS HOURS & SCHEDULES
            ===================================================================== */}
        {activeTab === 'business_hours' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    Operating Schedules & Timezone
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Define when your live human contact center is open and how after-hours inquiries are handled.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-zinc-400">Enforce Schedule</span>
                  <input
                    type="checkbox"
                    checked={settings.businessHours.enabled}
                    onChange={e => handleNestedChange('businessHours', 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Operating Timezone
                </label>
                <select
                  value={settings.businessHours.timezone}
                  onChange={e => handleNestedChange('businessHours', 'timezone', e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              {/* Weekly Schedules Grid */}
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Weekly Schedule</div>
                {settings.businessHours.schedules.map((sched, idx) => (
                  <div
                    key={sched.day}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={sched.enabled}
                        onChange={e => {
                          const updated = [...settings.businessHours.schedules];
                          updated[idx] = { ...updated[idx], enabled: e.target.checked };
                          handleNestedChange('businessHours', 'schedules', updated);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                      />
                      <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200 w-24">
                        {sched.day}
                      </span>
                    </div>

                    {sched.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={sched.openTime}
                          onChange={e => {
                            const updated = [...settings.businessHours.schedules];
                            updated[idx] = { ...updated[idx], openTime: e.target.value };
                            handleNestedChange('businessHours', 'schedules', updated);
                          }}
                          className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                        />
                        <span className="text-zinc-500">to</span>
                        <input
                          type="time"
                          value={sched.closeTime}
                          onChange={e => {
                            const updated = [...settings.businessHours.schedules];
                            updated[idx] = { ...updated[idx], closeTime: e.target.value };
                            handleNestedChange('businessHours', 'schedules', updated);
                          }}
                          className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-500 font-medium italic pr-4">Closed</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Off-Hours Strategy */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Off-Hours Handling Policy</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'AI_CONCIERGE',
                      label: '24/7 AI Concierge',
                      desc: 'AI handles customer inquiries and takes callback notes.',
                      icon: Bot
                    },
                    {
                      id: 'AUTO_RESPONDER',
                      label: 'Auto-Responder',
                      desc: 'Sends custom out-of-office notification with hours.',
                      icon: MessageSquare
                    },
                    {
                      id: 'TICKET_LEAD',
                      label: 'Intake Ticket Form',
                      desc: 'Prompts visitor to create a formal offline support ticket.',
                      icon: ListTodo
                    }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleNestedChange('businessHours', 'offHoursStrategy', opt.id as any)}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between",
                        settings.businessHours.offHoursStrategy === opt.id
                          ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-white shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      <div>
                        <div className="font-bold mb-1">{opt.label}</div>
                        <div className="text-[11px] text-zinc-500 leading-relaxed">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Off-Hours Notice Message
                  </label>
                  <textarea
                    rows={2}
                    value={settings.businessHours.offHoursMessage}
                    onChange={e => handleNestedChange('businessHours', 'offHoursMessage', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Holiday Calendar */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Holiday Closure Exceptions</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. Boxing Day)"
                    value={newHolidayName}
                    onChange={e => setNewHolidayName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white"
                  />
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={e => setNewHolidayDate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white"
                  />
                  <Button variant="secondary" onClick={handleAddHoliday} className="text-xs px-3 py-1.5">
                    Add Holiday
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {settings.businessHours.holidays.map(h => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">{h.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{h.date}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveHoliday(h.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: CANNED RESPONSES & QUICK REPLY MACROS
            ===================================================================== */}
        {activeTab === 'canned_responses' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Zap size={16} className="text-indigo-500" />
                    Canned Responses & Quick Macros
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Pre-composed standard snippets operators can trigger with <code className="text-indigo-400 font-mono font-bold">/slash</code> commands in the chat composer.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleOpenCreateCanned}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-md"
                >
                  <Plus size={14} />
                  <span>New Macro</span>
                </Button>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={cannedSearch}
                    onChange={e => setCannedSearch(e.target.value)}
                    placeholder="Search by /shortcut or keyword..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs self-start sm:self-auto overflow-x-auto">
                  {['ALL', 'General', 'Support', 'Billing', 'Technical'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCannedCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap",
                        cannedCategory === cat
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Tokens Legend */}
              <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-zinc-400 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-indigo-400">Supported Merge Tokens:</span>
                <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">&#123;&#123;customerName&#125;&#125;</span>
                <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">&#123;&#123;operatorName&#125;&#125;</span>
                <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">&#123;&#123;siteName&#125;&#125;</span>
                <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">&#123;&#123;ticketId&#125;&#125;</span>
              </div>

              {/* Macro Cards */}
              {isCannedLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw size={20} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading macros...</span>
                </div>
              ) : filteredCanned.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Zap size={28} className="mx-auto text-zinc-600 mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-zinc-400">No canned macros match your filter</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {filteredCanned.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                            {item.shortcut}
                          </span>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 font-sans leading-relaxed bg-white/40 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                        <button
                          onClick={() => handleOpenEditCanned(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Edit Macro"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCanned(item)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Macro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 5: CUSTOMER FEEDBACK & CLOSED-LOOP PROCESS
            ===================================================================== */}
        {activeTab === 'feedback_loop' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Stat Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Average CSAT</div>
                <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1">
                  <Star size={20} className="fill-amber-400 text-amber-400" />
                  <span>{feedbackStats.avgScore}</span>
                  <span className="text-xs text-zinc-500 font-normal">/ 5.0</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{feedbackStats.total} ratings received</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Pending Outreach</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">{feedbackStats.pendingOutreach}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Low scores requiring action</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">In Remediation</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{feedbackStats.inRemediation}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Contacted / voucher issued</div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Closed-Loop SLA</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{feedbackStats.slaComplianceRate}%</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">24h supervisor resolution</div>
              </div>
            </div>

            {/* Closed-Loop Case Pipeline Studio */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <HeartHandshake size={16} className="text-rose-500" />
                    Closed-Loop Customer Remediation Cases
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    When dissatisfied customers leave low ratings, automated closed-loop cases require supervisor outreach within 24 hours.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                  {[
                    { id: 'ALL', label: 'All Cases' },
                    { id: 'PENDING', label: 'Action Required' },
                    { id: 'REMEDIATION', label: 'In Remediation' },
                    { id: 'RESOLVED', label: 'Closed Loop' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFeedbackFilter(f.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                        feedbackFilter === f.id
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {isFeedbackLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <RefreshCw size={20} className="animate-spin text-indigo-500" />
                  <span className="text-xs">Loading feedback pipeline...</span>
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <HeartHandshake size={28} className="mx-auto text-zinc-600 mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-zinc-400">No feedback cases in this view</p>
                  <p className="text-[11px] text-zinc-500 mt-1">All customer satisfaction reviews are up-to-date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFeedback.map(c => {
                    const isClosed = c.status === 'RESOLVED_CLOSED_LOOP';
                    const isLow = c.score <= 2;

                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          isLow && !isClosed
                            ? "bg-rose-950/10 border-rose-500/30 dark:bg-rose-950/20"
                            : "bg-zinc-50/60 dark:bg-zinc-950/60 border-zinc-200/80 dark:border-zinc-800/80"
                        )}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              {c.visitorName}
                            </span>
                            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-400 font-bold text-xs">
                              <Star size={11} className="fill-amber-400" />
                              <span>{c.score} / {c.maxScore}</span>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                c.status === 'NEW_UNASSIGNED'
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : c.status === 'OUTREACH_SCHEDULED' || c.status === 'REMEDIATION_OFFERED'
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              )}
                            >
                              {c.status.replace(/_/g, ' ')}
                            </span>
                            {c.rootCauseCategory && (
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                {c.rootCauseCategory.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          {c.comment && (
                            <p className="text-xs text-zinc-300 italic bg-white/40 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-200/40 dark:border-zinc-800/60">
                              "{c.comment}"
                            </p>
                          )}

                          {c.remediationNotes && (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 size={12} />
                              <span>Remediation: {c.remediationNotes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Button
                            variant="primary"
                            onClick={() => handleOpenRemediationModal(c)}
                            className={cn(
                              "text-xs px-3 py-1.5 rounded-xl font-semibold",
                              isClosed
                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                : "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
                            )}
                          >
                            {isClosed ? 'View Remediation' : 'Action Remediation'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CSAT Survey Configuration Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Star size={16} className="text-amber-500" />
                    Automated Post-Interaction CSAT Survey
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Trigger 1-click customer feedback surveys immediately upon closing chat conversations.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.feedbackLoop.enableCsatSurvey}
                  onChange={e => handleNestedChange('feedbackLoop', 'enableCsatSurvey', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Rating Scale Style
                  </label>
                  <select
                    value={settings.feedbackLoop.ratingType}
                    onChange={e => handleNestedChange('feedbackLoop', 'ratingType', e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CSAT_5_STAR">5-Star Scale (⭐ ⭐ ⭐ ⭐ ⭐)</option>
                    <option value="CSAT_EMOJI">3-Point Smiley Faces (😃 😐 🙁)</option>
                    <option value="NPS_10">10-Point Net Promoter Score (NPS 1–10)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Closed-Loop SLA Target (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.feedbackLoop.feedbackSlaHours}
                    onChange={e => handleNestedChange('feedbackLoop', 'feedbackSlaHours', parseInt(e.target.value) || 24)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Survey Headline Prompt
                  </label>
                  <input
                    type="text"
                    value={settings.feedbackLoop.surveyPrompt}
                    onChange={e => handleNestedChange('feedbackLoop', 'surveyPrompt', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Follow-Up Text Prompt
                  </label>
                  <input
                    type="text"
                    value={settings.feedbackLoop.followUpPrompt}
                    onChange={e => handleNestedChange('feedbackLoop', 'followUpPrompt', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 6: INACTIVITY & GHOSTING PREVENTION
            ===================================================================== */}
        {activeTab === 'inactivity' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Timer size={16} className="text-indigo-500" />
                  Inactivity Prompts & Auto-Close (Ghosting Prevention)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Keep agent queues clean by warning idle visitors and automatically wrapping up abandoned conversations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Customer Idle Warning Timer (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.inactivity.idleWarningMinutes}
                    onChange={e => handleNestedChange('inactivity', 'idleWarningMinutes', parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Duration of visitor silence before system sends a friendly check-in prompt.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Auto-Close Abandoned Session Timer (Minutes)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    value={settings.inactivity.autoCloseMinutes}
                    onChange={e => handleNestedChange('inactivity', 'autoCloseMinutes', parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    If visitor remains silent past this threshold, the session auto-resolves.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Idle Warning Prompt Message
                </label>
                <textarea
                  rows={2}
                  value={settings.inactivity.idleWarningMessage}
                  onChange={e => handleNestedChange('inactivity', 'idleWarningMessage', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Customer Reconnect Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={settings.inactivity.reconnectGraceMinutes}
                  onChange={e => handleNestedChange('inactivity', 'reconnectGraceMinutes', parseInt(e.target.value) || 15)}
                  className="w-48 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Returning visitors within this window resume the existing chat rather than starting a duplicate thread.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 7: CHAT WIDGET & EMBED SCRIPT
            ===================================================================== */}
        {activeTab === 'widget' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Globe size={16} className="text-indigo-500" />
                  Web Chat Widget Styling & Embed Code
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Customize the look and lead-capture form of the chat bubble embedded on your customer portals and websites.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Launcher Brand Accent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.widget.themeColor}
                      onChange={e => handleNestedChange('widget', 'themeColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-zinc-700 cursor-pointer p-0.5 bg-zinc-900"
                    />
                    <input
                      type="text"
                      value={settings.widget.themeColor}
                      onChange={e => handleNestedChange('widget', 'themeColor', e.target.value)}
                      className="w-28 px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Launcher Style
                  </label>
                  <select
                    value={settings.widget.launcherStyle}
                    onChange={e => handleNestedChange('widget', 'launcherStyle', e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white"
                  >
                    <option value="PILL">Pill with Text ("Chat with us")</option>
                    <option value="BUBBLE">Circular Icon Bubble</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Screen Position
                  </label>
                  <select
                    value={settings.widget.position}
                    onChange={e => handleNestedChange('widget', 'position', e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white"
                  >
                    <option value="BOTTOM_RIGHT">Bottom Right Corner</option>
                    <option value="BOTTOM_LEFT">Bottom Left Corner</option>
                  </select>
                </div>
              </div>

              {/* Pre-Chat Lead Capture Form */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Pre-Chat Intake Requirements</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <span className="text-xs font-medium text-white">Require Customer Name</span>
                    <input
                      type="checkbox"
                      checked={settings.widget.requireName}
                      onChange={e => handleNestedChange('widget', 'requireName', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <span className="text-xs font-medium text-white">Require Customer Email</span>
                    <input
                      type="checkbox"
                      checked={settings.widget.requireEmail}
                      onChange={e => handleNestedChange('widget', 'requireEmail', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <span className="text-xs font-medium text-white">Require Customer Phone</span>
                    <input
                      type="checkbox"
                      checked={settings.widget.requirePhone}
                      onChange={e => handleNestedChange('widget', 'requirePhone', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <span className="text-xs font-medium text-white">Allow Anonymous Instant Chat</span>
                    <input
                      type="checkbox"
                      checked={settings.widget.allowAnonymous}
                      onChange={e => handleNestedChange('widget', 'allowAnonymous', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>
                </div>
              </div>

              {/* One-Click Embed Snippet */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Website HTML Embed Script</span>
                  <Button variant="secondary" onClick={copyWidgetScript} className="text-xs flex items-center gap-1.5 py-1 px-2.5">
                    <Copy size={12} />
                    <span>Copy Snippet</span>
                  </Button>
                </div>

                <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  {`<script src="${window.location.origin}/widget.js" data-tenant-id="${tenant?.id || 'demo'}" async></script>`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 8: ROUTING & ALLOCATION
            ===================================================================== */}
        {activeTab === 'routing' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-indigo-500" />
                  Primary Interaction Routing Strategy
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Determines how incoming portal site chats and web inquiries are allocated upon arrival.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  {
                    id: 'AI_FIRST',
                    label: 'AI First (Concierge)',
                    desc: 'AI Assistant answers immediately, resolves FAQs from knowledge base, and escalates to humans only if requested or confidence is low.',
                    icon: Bot
                  },
                  {
                    id: 'HUMAN_FIRST',
                    label: 'Human First (Direct)',
                    desc: 'Chats immediately ring online operators based on Round-Robin and active presence queue readiness.',
                    icon: Users
                  },
                  {
                    id: 'TRIAGE_AGENT',
                    label: 'Triage Agent (Dispatcher)',
                    desc: 'A classifier agent gathers caller intent, company, and urgency before routing to the designated team queue.',
                    icon: Sparkles
                  }
                ].map(opt => {
                  const isSelected = settings.primaryAllocationMode === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChange('primaryAllocationMode', opt.id as ServiceDeskAllocationMode)}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        isSelected
                          ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-zinc-900 dark:text-white shadow-sm ring-1 ring-indigo-500/50"
                          : "bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Icon size={18} className={isSelected ? 'text-indigo-500' : 'text-zinc-400'} />
                          {isSelected && <CheckCircle2 size={16} className="text-indigo-500" />}
                        </div>
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[11px] leading-relaxed opacity-80">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                Human Fallback & Unanswered Timeout
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Queue Timeout before Fallback (Seconds)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="600"
                    value={settings.queueTimeoutSeconds}
                    onChange={e => handleChange('queueTimeoutSeconds', parseInt(e.target.value) || 120)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Auto-Fallback to Queue</div>
                      <div className="text-[11px] text-zinc-500">Re-route automatically if assigned operator does not answer</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.fallbackToQueueOnTimeout}
                      onChange={e => handleChange('fallbackToQueueOnTimeout', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 9: WRAP-UP & AFTER-CALL WORK (ACW)
            ===================================================================== */}
        {activeTab === 'wrap_up' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-indigo-500" />
                  Wrap-Up Dispositions & After-Call Work (ACW)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Enforce disposition logging, resolution tags, and follow-up notes when resolving interactions.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Mandatory Wrap-Up Before Closure</div>
                    <div className="text-[11px] text-zinc-500">
                      Require operators to choose an Outcome and Topic code before a session is marked Resolved
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.requireWrapUpToClose}
                    onChange={e => handleChange('requireWrapUpToClose', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    After-Call Work (ACW) Grace Period (Seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={settings.acwTimeoutSeconds}
                    onChange={e => handleChange('acwTimeoutSeconds', parseInt(e.target.value) || 60)}
                    className="w-48 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-400" />
                      AI Auto-Suggested Wrap-Up
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Gemini analyzes transcript to pre-fill Outcome code, Topic, and AI Summary
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAiWrapUpAutoSuggest}
                    onChange={e => handleChange('enableAiWrapUpAutoSuggest', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>
              </div>
            </div>

            {/* Quick Links to System Lists */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ListTodo size={16} className="text-indigo-500" />
                Underlying System Lookup Lists
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => navigate('/workspace/settings/platform-modules/global-lists?filter=system')}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-zinc-50 dark:bg-zinc-950 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                      Service Desk Wrap-Up Outcomes
                    </span>
                    <ArrowRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Configure resolution codes (Resolved, Escalated, Callback, etc.)</p>
                </div>

                <div
                  onClick={() => navigate('/workspace/settings/platform-modules/global-lists?filter=system')}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 bg-zinc-50 dark:bg-zinc-950 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                      Service Desk Interaction Topics
                    </span>
                    <ArrowRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Configure root cause categories (Billing, Tech Support, Sales, etc.)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 10: AI & HITL GUARDRAILS
            ===================================================================== */}
        {activeTab === 'ai_guardrails' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bot size={16} className="text-indigo-500" />
                  AI Confidence Thresholds & HITL Approvals
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Ensure autonomous AI agents stay within compliance and escalate when uncertain.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Escalation Confidence Threshold
                    </label>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {Math.round(settings.aiConfidenceEscalationThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.95"
                    step="0.05"
                    value={settings.aiConfidenceEscalationThreshold}
                    onChange={e => handleChange('aiConfidenceEscalationThreshold', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Require Human Approval for Refunds</div>
                      <div className="text-[11px] text-zinc-500">Hold monetary refunds until supervisor confirms in chat</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.requireHitlApprovalForRefunds}
                      onChange={e => handleChange('requireHitlApprovalForRefunds', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Require Human Approval for Subscription Cancellations</div>
                      <div className="text-[11px] text-zinc-500">Require agent turn before finalizing account termination</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.requireHitlApprovalForCancellations}
                      onChange={e => handleChange('requireHitlApprovalForCancellations', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">AI Real-time Whisper Suggestions</div>
                      <div className="text-[11px] text-zinc-500">Generate draft replies and relevant KB articles into the operator's co-pilot rail</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableAiWhisperSuggestions}
                      onChange={e => handleChange('enableAiWhisperSuggestions', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 11: TELEPHONY & VOICE
            ===================================================================== */}
        {activeTab === 'telephony' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PhoneCall size={16} className="text-indigo-500" />
                  Telephony & Inbound Voice Switchboard
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Configure primary inbound voice numbers, voice queue greetings, and compliance recording policies.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Primary Tenancy Inbound Number
                  </label>
                  <input
                    type="text"
                    value={settings.inboundVoiceNumber || ''}
                    onChange={e => handleChange('inboundVoiceNumber', e.target.value)}
                    placeholder="e.g. +61 421 904 332"
                    className="w-full sm:w-80 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Voice Queue Greeting Message
                  </label>
                  <textarea
                    rows={2}
                    value={settings.voiceQueueGreeting || ''}
                    onChange={e => handleChange('voiceQueueGreeting', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">Record Inbound Calls for QA & Compliance</div>
                      <div className="text-[11px] text-zinc-500">Audio recordings attach to the resolved Service Desk session</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.recordCalls}
                      onChange={e => handleChange('recordCalls', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 12: SECURITY & PII REDACTION
            ===================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    PII Redaction & PCI-DSS Compliance
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Automatically redact sensitive personal identification numbers from chat messages and transcripts.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={settings.security.enablePiiMasking}
                  onChange={e => handleNestedChange('security', 'enablePiiMasking', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Mask Credit Card Numbers (PCI-DSS)</div>
                    <div className="text-[11px] text-zinc-500">Replaces 13-19 digit card numbers with **** **** **** 1234 in real-time</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.maskCreditCards}
                    onChange={e => handleNestedChange('security', 'maskCreditCards', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Mask Tax File Numbers & SSNs</div>
                    <div className="text-[11px] text-zinc-500">Redacts government identification numbers from operator logs</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.maskTfnAndSsn}
                    onChange={e => handleNestedChange('security', 'maskTfnAndSsn', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-white">Mask Passwords & API Tokens</div>
                    <div className="text-[11px] text-zinc-500">Detects and hides credential patterns sent accidentally in chat</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.maskPasswords}
                    onChange={e => handleNestedChange('security', 'maskPasswords', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Chat Transcript Retention Window
                </label>
                <select
                  value={settings.security.retentionDays}
                  onChange={e => handleNestedChange('security', 'retentionDays', parseInt(e.target.value) || 0)}
                  className="w-64 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={180}>180 Days (6 Months)</option>
                  <option value={365}>365 Days (1 Year)</option>
                  <option value={0}>Indefinite Retention</option>
                </select>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Transcripts older than this retention period are automatically pruned or anonymized.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          QUEUE CREATE / EDIT MODAL
          ===================================================================== */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListOrdered size={16} className="text-indigo-400" />
                {editingQueueId ? 'Edit Service Queue' : 'Create New Service Queue'}
              </h3>
              <button
                onClick={() => setIsQueueModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQueueModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Queue Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Priority Inquiries"
                  value={queueFormData.name}
                  onChange={e => {
                    const name = e.target.value;
                    setQueueFormData(prev => ({
                      ...prev,
                      name,
                      slug: prev.slug && editingQueueId ? prev.slug : slugify(name)
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Slug / Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="vip-priority-inquiries"
                    value={queueFormData.slug}
                    onChange={e => setQueueFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Icon
                  </label>
                  <select
                    value={queueFormData.iconName}
                    onChange={e => setQueueFormData(prev => ({ ...prev, iconName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {QUEUE_ICONS.map(i => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the type of interactions, customers, or inquiries dispatched to this queue..."
                  value={queueFormData.description}
                  onChange={e => setQueueFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Target Assignee Strategy
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQueueFormData(prev => ({ ...prev, targetAssigneeType: 'AI_FIRST' }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2",
                      queueFormData.targetAssigneeType === 'AI_FIRST'
                        ? "bg-purple-950/40 border-purple-500 text-purple-300 font-semibold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <Bot size={16} className="shrink-0 text-purple-400" />
                    <div>
                      <div className="text-xs">AI Assistant First</div>
                      <div className="text-[10px] text-zinc-500 font-normal">Autonomous triage</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFormData(prev => ({ ...prev, targetAssigneeType: 'HUMAN_FIRST' }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2",
                      queueFormData.targetAssigneeType === 'HUMAN_FIRST'
                        ? "bg-amber-950/40 border-amber-500 text-amber-300 font-semibold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <Users size={16} className="shrink-0 text-amber-400" />
                    <div>
                      <div className="text-xs">Human Direct</div>
                      <div className="text-[10px] text-zinc-500 font-normal">Immediate operator ring</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Routing Priority
                  </label>
                  <select
                    value={queueFormData.priority}
                    onChange={e => setQueueFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low (Routine / General)</option>
                    <option value="MEDIUM">Medium (Standard Ticket)</option>
                    <option value="HIGH">High (Escalated / Paid)</option>
                    <option value="URGENT">Urgent (Outage / Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    First Response SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={queueFormData.slaMinutes}
                    onChange={e => setQueueFormData(prev => ({ ...prev, slaMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingQueue}
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-md"
                >
                  {isSavingQueue ? 'Saving...' : editingQueueId ? 'Update Queue' : 'Create Queue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CANNED MACRO CREATE / EDIT MODAL
          ===================================================================== */}
      {isCannedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-indigo-400" />
                {editingCannedId ? 'Edit Canned Response' : 'Create Quick Reply Macro'}
              </h3>
              <button
                onClick={() => setIsCannedModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCannedModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Shortcut Command <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="/shortcut"
                    value={cannedFormData.shortcut}
                    onChange={e => setCannedFormData(prev => ({ ...prev, shortcut: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-indigo-400 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={cannedFormData.category}
                    onChange={e => setCannedFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Billing">Billing & Refunds</option>
                    <option value="Support">Support & Troubleshooting</option>
                    <option value="Technical">Technical & Integrations</option>
                    <option value="Sales">Sales & Inquiries</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Macro Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warm Customer Welcome"
                  value={cannedFormData.title}
                  onChange={e => setCannedFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Response Content <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {['{{customerName}}', '{{operatorName}}', '{{siteName}}'].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setCannedFormData(prev => ({ ...prev, content: `${prev.content} ${tok}` }))}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-700 cursor-pointer"
                        title="Click to insert token"
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the response message. Use tokens like {{customerName}} for dynamic interpolation..."
                  value={cannedFormData.content}
                  onChange={e => setCannedFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCannedModalOpen(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingCanned}
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-md"
                >
                  {isSavingCanned ? 'Saving...' : editingCannedId ? 'Update Macro' : 'Create Macro'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CLOSED-LOOP REMEDIATION ACTION MODAL
          ===================================================================== */}
      {activeRemediationModalCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake size={18} className="text-rose-400" />
                <h3 className="text-sm font-bold text-white">Closed-Loop Customer Remediation</h3>
              </div>
              <button
                onClick={() => setActiveRemediationModalCase(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{activeRemediationModalCase.visitorName}</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Star size={12} className="fill-amber-400" />
                  {activeRemediationModalCase.score} / {activeRemediationModalCase.maxScore}
                </span>
              </div>
              {activeRemediationModalCase.comment && (
                <p className="text-zinc-400 italic">"{activeRemediationModalCase.comment}"</p>
              )}
            </div>

            <form onSubmit={handleSaveRemediation} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Root Cause Category
                  </label>
                  <select
                    value={remediationFormData.rootCauseCategory}
                    onChange={e => setRemediationFormData(prev => ({ ...prev, rootCauseCategory: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  >
                    <option value="SERVICE_DELAY">Service Delay / Long Hold</option>
                    <option value="AGENT_CONDUCT">Operator Conduct / Attitude</option>
                    <option value="TECHNICAL_DEFECT">Platform Defect / Software Bug</option>
                    <option value="BILLING_DISPUTE">Billing Dispute / Unexpected Fee</option>
                    <option value="PRODUCT_GAP">Missing Feature / Policy Gap</option>
                    <option value="MISCOMMUNICATION">Miscommunication / Unclear Advice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Remediation Action
                  </label>
                  <select
                    value={remediationFormData.remediationAction}
                    onChange={e => setRemediationFormData(prev => ({ ...prev, remediationAction: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  >
                    <option value="PHONE_OUTREACH">Supervisor Courtesy Phone Call</option>
                    <option value="APOLOGY_EMAIL">Personal Executive Apology Email</option>
                    <option value="CREDIT_VOUCHER">Service Credit / Discount Voucher</option>
                    <option value="REFUND">Full Refund Issued</option>
                    <option value="GOODWILL_UPGRADE">Goodwill Tier Upgrade</option>
                    <option value="PROCESS_FIX">Internal Process Correction</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Closed-Loop Resolution State
                </label>
                <select
                  value={remediationFormData.status}
                  onChange={e => setRemediationFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                >
                  <option value="OUTREACH_SCHEDULED">Outreach Scheduled (Customer Contact Pending)</option>
                  <option value="REMEDIATION_OFFERED">Remediation Offered (Awaiting Customer Response)</option>
                  <option value="RESOLVED_CLOSED_LOOP">Resolved & Closed Loop (Customer Satisfied / Complete)</option>
                  <option value="DISMISSED">Dismissed / Spurious Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Remediation Details & Customer Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record summary of customer phone conversation, credit voucher code, or corrective action taken..."
                  value={remediationFormData.remediationNotes}
                  onChange={e => setRemediationFormData(prev => ({ ...prev, remediationNotes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveRemediationModalCase(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingRemediation}
                  className="text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl shadow-md"
                >
                  {isSavingRemediation ? 'Saving...' : 'Save Remediation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DELETE QUEUE CONFIRMATION MODAL
          ===================================================================== */}
      {deleteConfirmQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">Delete Queue?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{deleteConfirmQueue.name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setDeleteConfirmQueue(null)} className="text-xs text-zinc-400 hover:text-white">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteQueue}
                disabled={isDeletingQueue}
                className="text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl shadow-md"
              >
                {isDeletingQueue ? 'Deleting...' : 'Delete Queue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DELETE CANNED CONFIRMATION MODAL
          ===================================================================== */}
      {deleteConfirmCanned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">Delete Macro?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete shortcut <span className="font-semibold text-white">{deleteConfirmCanned.shortcut}</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setDeleteConfirmCanned(null)} className="text-xs text-zinc-400 hover:text-white">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteCanned}
                className="text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl shadow-md"
              >
                Delete Macro
              </Button>
            </div>
          </div>
        </div>
      )}
    </SettingsSubNavLayout>
  );
};
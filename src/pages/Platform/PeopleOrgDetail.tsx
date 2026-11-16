import { motion } from 'motion/react';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Building2,
  Trash2,
  Save,
  Clock,
  Plus,
  GitBranch,
  Building,
  ArrowLeft,
  Star,
  Mail,
  Phone,
  MapPin,
  Layers,
  DollarSign,
  MessageSquare,
  StickyNote,
  Bell,
  ExternalLink,
  Search,
  CheckCircle2,
  Edit3,
  Sparkles,
  Copy,
  Check,
  Briefcase,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  Activity,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Button, Input, Select, Badge, AuroraSpinner } from '../../components/UI/Primitives';
import { Skeleton } from '../../components/UI/Skeleton';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { RelationshipGraph } from '../../components/Platform/RelationshipGraph';
import { AddRelationshipModal } from '../../components/Platform/AddRelationshipModal';
import { EntityAvatarUpload } from '../../components/Platform/EntityAvatarUpload';
import { PartyProfileTrigger } from '../../context/PartyProfileCardContext';
import { UserAvatarWithPresence, UserProfileTrigger } from '../../components/Common/UserPresenceBadge';


// Standardized Workspace Form Controls (aligned with RecordDetailView / CollapsibleFieldGroup)
const FormSection = ({ title, icon: Icon, actions, children, className }: {
  title: string;
  icon?: any;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden",
    className
  )}>
    <div className="px-3.5 py-2.5 flex items-center justify-between select-none border-b border-zinc-200/60 dark:border-zinc-800/60">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-zinc-400 shrink-0" />}
        <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider truncate">
          {title}
        </h5>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
    <div className="p-4 space-y-4">
      {children}
    </div>
  </div>
);

const FormField = ({ label, required, children, className }: {
  label?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-1 relative", className)}>
    {label && (
      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    {children}
  </div>
);

const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((
  { className, ...props }, ref
) => (
  <input
    ref={ref}
    className={cn(
      "w-full h-10 px-3.5 rounded-xl text-xs border transition-all",
      "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white",
      "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
      "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
      props.disabled && "cursor-not-allowed opacity-60",
      className
    )}
    {...props}
  />
));
FormInput.displayName = 'FormInput';

const FormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { label: string; value: string }[];
}>(({ options = [], className, ...props }, ref) => (
  <div className="relative w-full">
    <select
      ref={ref}
      className={cn(
        "w-full h-10 px-3.5 pr-8 rounded-xl text-xs border appearance-none transition-all cursor-pointer",
        "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white",
        "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
        "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
        props.disabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white"
        >
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown size={14} className="text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
));
FormSelect.displayName = 'FormSelect';

const FormTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((
  { className, ...props }, ref
) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full p-3 rounded-xl text-xs border transition-all resize-y",
      "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white",
      "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
      "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none",
      props.disabled && "cursor-not-allowed opacity-60",
      className
    )}
    {...props}
  />
));
FormTextarea.displayName = 'FormTextarea';

const DEFAULT_CLASSIFICATIONS = [
  'CLIENT',
  'SUPPLIER',
  'PARTNER',
  'PROSPECT',
  'INVESTOR',
  'COMPETITOR',
  'REGULATOR',
  'CONTRACTOR',
  'SUBSIDIARY',
  'ADVISOR',
  'VIP',
];

export const PeopleOrgDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant, setBreadcrumbOverride } = usePlatform();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showRightRail, setShowRightRail] = useState(true);
  const [railTab, setRailTab] = useState<'notes' | 'reminders' | 'audit'>('notes');

  // Linked 360° & Whole-of-Aurora Live Feed state
  const [linkedData, setLinkedData] = useState<any>(null);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [includeRollup, setIncludeRollup] = useState(true);
  const [linkedCategoryFilter, setLinkedCategoryFilter] = useState<string>('ALL');
  const [linkedSearch, setLinkedSearch] = useState('');
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<string>('ALL');
  const [feedRecordFilter, setFeedRecordFilter] = useState<string>('ALL');
  const [feedSearch, setFeedSearch] = useState('');
  const [includeRecordViews, setIncludeRecordViews] = useState(false);
  const [expandedDiffIds, setExpandedDiffIds] = useState<Set<string>>(new Set());

  // Relationships state
  const [relationships, setRelationships] = useState<any[]>([]);
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<any | null>(null);
  const [showGraphInRelTab, setShowGraphInRelTab] = useState(true);

  // Notes, Reminders, Audit Logs
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDueAt, setNewReminderDueAt] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Directory config & reference lists
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [availableClassifications, setAvailableClassifications] =
    useState<string[]>(DEFAULT_CLASSIFICATIONS);
  const [tenantMembers, setTenantMembers] = useState<any[]>([]);
  const [allParties, setAllParties] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state for Overview & Profile
  const [formData, setFormData] = useState<any>({
    status: 'ACTIVE',
    avatarUrl: null as string | null,
    email: '',
    secondaryEmail: '',
    phone: '',
    mobile: '',
    website: '',
    preferredContactMethod: 'EMAIL',
    timezone: 'Australia/Adelaide',
    currency: 'AUD',
    accountOwnerMemberId: '',
    classifications: [] as string[],
    tags: [] as string[],
    addresses: [] as any[],
    notesSummary: '',
    customData: {} as Record<string, any>,
    isStarred: false,
    person: {
      salutation: '',
      firstName: '',
      middleName: '',
      lastName: '',
      preferredName: '',
      jobTitle: '',
      department: '',
      primaryOrgPartyId: '',
      primaryOrgName: '',
      dateOfBirth: '',
      isHumanInLoop: false,
    },
    organization: {
      legalName: '',
      tradingName: '',
      orgStructureType: 'COMPANY',
      companyRegistrationNumber: '',
      taxIdentifier: '',
      incorporationDate: '',
      industry: '',
      subIndustry: '',
      companySize: '',
      annualRevenue: '',
      billingEmail: '',
      paymentTerms: 'NET_30',
      creditLimit: '',
      primaryContactPartyId: '',
    },
  });

  const getToken = useCallback(() => {
    return (
      (import.meta as any).env?.VITE_DEV_TOKEN ||
      session?.access_token ||
      localStorage.getItem('aurora_token')
    );
  }, [session?.access_token]);

  const getHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenant?.id || '',
    };
  }, [getToken, tenant?.id]);

  const fetchParty = useCallback(async () => {
    const token = getToken();
    if (!id || !tenant?.id || !token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Failed to fetch entity record');
        navigate('/workspace/apps/directory');
        return;
      }

      setParty(data);
      setFormData({
        status: data.status || 'ACTIVE',
        avatarUrl: data.avatarUrl || null,
        email: data.email || '',
        secondaryEmail: data.secondaryEmail || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        website: data.website || '',
        preferredContactMethod: data.preferredContactMethod || 'EMAIL',
        timezone: data.timezone || 'Australia/Adelaide',
        currency: data.currency || 'AUD',
        accountOwnerMemberId: data.accountOwnerMemberId || '',
        classifications: Array.isArray(data.classifications) ? data.classifications : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        addresses: Array.isArray(data.addresses) ? data.addresses : [],
        notesSummary: data.notesSummary || '',
        customData:
          data.customData && typeof data.customData === 'object' ? data.customData : {},
        isStarred: Boolean(data.isStarred),
        person: {
          salutation: data.person?.salutation || '',
          firstName: data.person?.firstName || '',
          middleName: data.person?.middleName || '',
          lastName: data.person?.lastName || '',
          preferredName: data.person?.preferredName || '',
          jobTitle: data.person?.jobTitle || '',
          department: data.person?.department || '',
          primaryOrgPartyId: data.person?.primaryOrgPartyId || '',
          primaryOrgName: data.person?.primaryOrgName || '',
          dateOfBirth: data.person?.dateOfBirth
            ? new Date(data.person.dateOfBirth).toISOString().split('T')[0]
            : '',
          isHumanInLoop: Boolean(data.person?.isHumanInLoop),
        },
        organization: {
          legalName: data.organization?.legalName || '',
          tradingName: data.organization?.tradingName || '',
          orgStructureType: data.organization?.orgStructureType || 'COMPANY',
          companyRegistrationNumber: data.organization?.companyRegistrationNumber || '',
          taxIdentifier: data.organization?.taxIdentifier || '',
          incorporationDate: data.organization?.incorporationDate
            ? new Date(data.organization.incorporationDate).toISOString().split('T')[0]
            : '',
          industry: data.organization?.industry || '',
          subIndustry: data.organization?.subIndustry || '',
          companySize: data.organization?.companySize || '',
          annualRevenue:
            data.organization?.annualRevenue !== null &&
            data.organization?.annualRevenue !== undefined
              ? String(data.organization.annualRevenue)
              : '',
          billingEmail: data.organization?.billingEmail || '',
          paymentTerms: data.organization?.paymentTerms || 'NET_30',
          creditLimit:
            data.organization?.creditLimit !== null &&
            data.organization?.creditLimit !== undefined
              ? String(data.organization.creditLimit)
              : '',
          primaryContactPartyId: data.organization?.primaryContactPartyId || '',
        },
      });

      const disp =
        data.displayName ||
        (data.partyType === 'PERSON'
          ? `${data.person?.firstName || ''} ${data.person?.lastName || ''}`.trim()
          : data.organization?.legalName || 'Entity');
      setBreadcrumbOverride(id, disp);
    } catch (err) {
      console.error('Failed to fetch party:', err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }, [id, tenant?.id, getHeaders, navigate, setBreadcrumbOverride]);

  const fetchLinkedEverything = useCallback(async () => {
    const token = getToken();
    if (!id || !tenant?.id || !token) return;
    try {
      setLoadingLinked(true);
      const res = await fetch(
        `${API_BASE_URL}/api/people-organisations/${id}/linked-everything?includeRollup=${
          includeRollup ? 'true' : 'false'
        }`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setLinkedData(data);
        if (Array.isArray(data.notes)) setNotes(data.notes);
        if (Array.isArray(data.reminders)) setReminders(data.reminders);
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to fetch linked everything:', err);
    } finally {
      setLoadingLinked(false);
    }
  }, [id, tenant?.id, getToken, includeRollup, getHeaders]);

  const fetchExtras = useCallback(async () => {
    const token = getToken();
    if (!id || !tenant?.id || !token) return;
    try {
      const headers = getHeaders();
      const [relRes, configRes, dirRes, membersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/people-organisations/${id}/relationships`, { headers }),
        fetch(`${API_BASE_URL}/api/people-organisations/config`, { headers }),
        fetch(`${API_BASE_URL}/api/people-organisations?limit=250`, { headers }),
        fetch(`${API_BASE_URL}/api/Platform/users`, { headers }).catch((): Response | null => null),
      ]);

      if (relRes.ok) setRelationships(await relRes.json());
      if (configRes.ok) {
        const cfg = await configRes.json();
        if (Array.isArray(cfg.customFields)) setCustomFields(cfg.customFields);
        if (Array.isArray(cfg.classifications) && cfg.classifications.length > 0) {
          setAvailableClassifications(cfg.classifications);
        }
      }
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        setAllParties(Array.isArray(dirData) ? dirData : dirData.parties || []);
      }
      if (membersRes && membersRes.ok) {
        const mData = await membersRes.json();
        setTenantMembers(Array.isArray(mData) ? mData : mData.users || mData.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch extras:', err);
    }
  }, [id, tenant?.id, getHeaders]);

  useEffect(() => {
    fetchParty();
    fetchExtras();
  }, [fetchParty, fetchExtras]);

  useEffect(() => {
    fetchLinkedEverything();
  }, [fetchLinkedEverything]);

  // Live auto-refresh when window regains focus or directory/record updates occur
  useEffect(() => {
    const onFocus = () => fetchLinkedEverything();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLinkedEverything();
      }
    }, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [fetchLinkedEverything]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Update failed');
      } else {
        toast.success('Entity profile saved');
        setParty(data);
        window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
        fetchLinkedEverything();
        fetchExtras();
      }
    } catch {
      toast.error('Connection error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickPatch = async (patchPayload: Record<string, any>, message?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(patchPayload),
      });
      if (res.ok) {
        const updated = await res.json();
        setParty(updated);
        window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
        if (message) toast.success(message);
      }
    } catch {
      toast.error('Failed to update entity');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      } else {
        toast.success('Entity deleted');
        window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
        navigate('/workspace/apps/directory');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Remove this relationship connection?')) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/people-organisations/${id}/relationships/${relId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );
      if (res.ok) {
        toast.success('Relationship removed');
        fetchExtras();
        fetchLinkedEverything();
      }
    } catch {
      toast.error('Failed to delete relationship');
    }
  };

  // Universal Notes handlers
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !id) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: newNoteTitle.trim() || `Note on ${party?.displayName || 'Entity'}`,
          content: newNoteContent.trim(),
          entityType: 'PARTY',
          entityId: id,
          color: 'indigo',
        }),
      });
      if (res.ok) {
        setNewNoteTitle('');
        setNewNoteContent('');
        toast.success('Note added to entity');
        fetchLinkedEverything();
      }
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success('Note deleted');
      }
    } catch {
      toast.error('Failed to delete note');
    }
  };

  // Universal Reminders handlers
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !id) return;
    setSavingReminder(true);
    try {
      const due =
        newReminderDueAt || new Date(Date.now() + 86400000).toISOString();
      const res = await fetch(`${API_BASE_URL}/api/reminders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: newReminderTitle.trim(),
          dueAt: new Date(due).toISOString(),
          priority: 'MEDIUM',
          entityType: 'PARTY',
          entityId: id,
        }),
      });
      if (res.ok) {
        setNewReminderTitle('');
        setNewReminderDueAt('');
        toast.success('Reminder scheduled');
        fetchLinkedEverything();
      }
    } catch {
      toast.error('Failed to schedule reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        toast.success('Reminder completed');
        fetchLinkedEverything();
      }
    } catch {
      toast.error('Failed to update reminder');
    }
  };

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleClassification = (tag: string) => {
    const exists = formData.classifications.includes(tag);
    const next = exists
      ? formData.classifications.filter((c: string) => c !== tag)
      : [...formData.classifications, tag];
    setFormData((prev: any) => ({ ...prev, classifications: next }));
    handleQuickPatch({ classifications: next }, `Updated classification: ${tag}`);
  };

  const addAddress = () => {
    setFormData((prev: any) => ({
      ...prev,
      addresses: [
        ...(prev.addresses || []),
        {
          id: `addr_${Date.now()}`,
          type: 'BILLING',
          label: 'Primary Address',
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Australia',
          isPrimary: (prev.addresses || []).length === 0,
        },
      ],
    }));
  };

  const updateAddress = (idx: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const next = [...(prev.addresses || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, addresses: next };
    });
  };

  const removeAddress = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      addresses: (prev.addresses || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-[#101010] overflow-hidden">
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-5 shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <Skeleton width={32} height={32} variant="rounded" />
            <Skeleton width={180} height={20} variant="rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton width={80} height={32} variant="rounded" />
            <Skeleton width={80} height={32} variant="rounded" />
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 space-y-6">
            <Skeleton height={40} variant="rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton height={320} variant="rounded" />
              <Skeleton height={320} variant="rounded" />
            </div>
          </div>
          <div className="w-80 xl:w-88 border-l border-zinc-200/80 dark:border-zinc-800 p-4 space-y-4 hidden lg:block">
            <Skeleton height={36} variant="rounded" />
            <Skeleton height={200} variant="rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!party) return null;

  const isPerson = party.partyType === 'PERSON';
  const displayName =
    party.displayName ||
    (isPerson
      ? `${formData.person.firstName} ${formData.person.lastName}`.trim()
      : formData.organization.legalName);

  const counts = linkedData?.counts || {};
  const fin = linkedData?.financialSummary || {};
  const allLinkedItems: any[] = linkedData?.items || [];
  const rawActivityFeed: any[] = linkedData?.activityFeed || [];
  const associatedModuleRecords: any[] = linkedData?.moduleRecords || [];

  const toggleDiffExpand = (eventId: string) => {
    setExpandedDiffIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const filteredActivityFeed = rawActivityFeed.filter((ev) => {
    if (!includeRecordViews && ev.streamCategory === 'ACCESS') return false;
    if (feedCategoryFilter !== 'ALL' && ev.streamCategory !== feedCategoryFilter) return false;
    if (feedRecordFilter !== 'ALL') {
      if (ev.targetRecord?.id !== feedRecordFilter) return false;
    }
    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase();
      const inTitle = String(ev.title || '').toLowerCase().includes(q);
      const inDesc = String(ev.description || '').toLowerCase().includes(q);
      const inActor = String(ev.actor?.name || '').toLowerCase().includes(q);
      const inRec = String(ev.targetRecord?.recordKey || '').toLowerCase().includes(q);
      const inChanges =
        Array.isArray(ev.changes) &&
        ev.changes.some(
          (c: any) =>
            String(c.fieldLabel || c.fieldId || '').toLowerCase().includes(q) ||
            String(c.newValue || '').toLowerCase().includes(q)
        );
      if (!inTitle && !inDesc && !inActor && !inRec && !inChanges) return false;
    }
    return true;
  });

  const filteredLinkedItems = allLinkedItems.filter((item) => {
    if (linkedCategoryFilter !== 'ALL') {
      if (linkedCategoryFilter === 'MODULES' && item.category !== 'MODULE_RECORD') return false;
      if (linkedCategoryFilter === 'RELATIONSHIPS' && item.category !== 'RELATIONSHIP')
        return false;
      if (
        linkedCategoryFilter === 'FINANCE' &&
        ![
          'INVOICE',
          'BILL',
          'POS_ORDER',
          'PAYMENT',
          'REFUND',
          'RMA',
          'VOUCHER',
          'JOURNAL_LINE',
        ].includes(item.category)
      )
        return false;
      if (
        linkedCategoryFilter === 'COMMS' &&
        !['EMAIL_THREAD', 'SERVICE_DESK'].includes(item.category)
      )
        return false;
      if (linkedCategoryFilter === 'DOCUMENTS' && item.category !== 'DOCUMENT') return false;
      if (linkedCategoryFilter === 'NOTES_TASKS' && !['NOTE', 'REMINDER'].includes(item.category))
        return false;
    }
    if (linkedSearch.trim()) {
      const q = linkedSearch.toLowerCase();
      return (
        String(item.title || '')
          .toLowerCase()
          .includes(q) ||
        String(item.subtitle || '')
          .toLowerCase()
          .includes(q) ||
        String(item.linkedVia || '')
          .toLowerCase()
          .includes(q)
      );
    }
    return true;
  });

  const applicableCustomFields = customFields.filter(
    (f) => !f.scope || f.scope === 'ALL' || f.scope === party.partyType
  );

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-[#101010] overflow-hidden select-text">
      {/* Top Header Toolbar */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-5 shrink-0 bg-white dark:bg-zinc-900 gap-4">
        {/* Left Section: Back button, Avatar, Monospace Code, Title, Star, Type Badge, Status */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/workspace/apps/directory')}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors shrink-0"
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          <EntityAvatarUpload
            avatarUrl={formData.avatarUrl ?? party.avatarUrl}
            partyType={party.partyType}
            displayName={displayName}
            size="sm"
            onChange={async (nextUrl) => {
              setFormData((p: any) => ({ ...p, avatarUrl: nextUrl }));
              setParty((p: any) => (p ? { ...p, avatarUrl: nextUrl } : p));
              await handleQuickPatch(
                { avatarUrl: nextUrl },
                nextUrl ? 'Profile picture updated' : 'Profile picture removed'
              );
            }}
          />

          <div className="flex items-center gap-2 min-w-0">
            {party.partyCode && (
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs font-semibold shrink-0">
                {party.partyCode}
              </span>
            )}

            <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
              {displayName}
            </h1>

            <button
              type="button"
              onClick={() => {
                const next = !formData.isStarred;
                setFormData((p: any) => ({ ...p, isStarred: next }));
                handleQuickPatch({ isStarred: next }, next ? 'Starred entity' : 'Unstarred');
              }}
              className="p-1 text-zinc-400 hover:text-amber-500 transition-colors shrink-0"
            >
              <Star
                size={15}
                className={formData.isStarred ? 'fill-amber-500 text-amber-500' : ''}
              />
            </button>

            <span className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium shrink-0",
              isPerson 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
            )}>
              {isPerson ? 'Person' : 'Organisation'}
            </span>

            <select
              value={formData.status}
              onChange={(e) => {
                const nextStatus = e.target.value;
                setFormData((p: any) => ({ ...p, status: nextStatus }));
                handleQuickPatch({ status: nextStatus }, `Status updated to ${nextStatus}`);
              }}
              className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 focus:outline-none cursor-pointer shrink-0"
            >
              <option value="VERIFIED">VERIFIED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING_REVIEW">PENDING REVIEW</option>
              <option value="UNVERIFIED">UNVERIFIED</option>
              <option value="FLAGGED">FLAGGED</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {formData.email && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/workspace/apps/inbox?composeTo=${encodeURIComponent(
                    formData.email
                  )}&partyId=${party.id}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Mail size={13} />
              <span className="hidden sm:inline">Email</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingRelationship(null);
              setIsAddRelationshipModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Connect Entity</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Delete Entity"
          >
            <Trash2 size={15} />
          </button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            {isSaving ? <AuroraSpinner /> : <Save size={13} />}
            <span>Save Profile</span>
          </Button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={() => setShowRightRail(!showRightRail)}
            className={cn(
              "p-1.5 rounded-lg border transition-colors",
              showRightRail
                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
            title={showRightRail ? 'Hide Context Rail' : 'Show Context Rail'}
          >
            {showRightRail ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </div>

      {/* Tab Bar Header - Aligned with RecordDetailView */}
      <div className="shrink-0 relative border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-10 box-border flex items-center px-5 overflow-hidden">
        <div className="flex gap-6 h-full items-center overflow-x-auto flex-1 min-w-0">
          {[
            { id: 'overview', label: 'Overview' },
            {
              id: 'linked',
              label: 'Activity',
              badge: (counts.activityEvents || 0) + (counts.total || 0),
            },
            {
              id: 'relationships',
              label: 'Relationships',
              badge: relationships.length,
            },
            {
              id: 'financials',
              label: 'Financials',
              badge:
                (counts.invoices || 0) +
                (counts.bills || 0) +
                (counts.posOrders || 0) +
                (counts.payments || 0),
            },
            {
              id: 'communications',
              label: 'Communications',
              badge: (counts.emails || 0) + (counts.serviceDeskSessions || 0),
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative h-full flex items-center gap-1.5 px-0.5 text-xs transition-colors whitespace-nowrap cursor-pointer select-none group/tab",
                  isActive
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium"
                )}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px] font-mono font-semibold text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                    {tab.badge}
                  </span>
                )}

                {/* Animated Active Tab Underline Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeDirectoryTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.5)] z-20"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body Area: Left/Center Scrollable Tab Pane + Docked Right Context Rail */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left/Center Main Workspace Pane - Same padding and background as RecordDetailView */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-[#101010]">
          <div className="w-full space-y-4">
          {/* ================================================================ */}
          {/* TAB 1: 360° LIVE FEED & ASSOCIATED RECORDS ECOSYSTEM             */}
          {/* ================================================================ */}
          {activeTab === 'linked' && (
            <div className="space-y-6">
              {/* SECTION A: ASSOCIATED PLATFORM RECORDS & OBJECTS */}
              <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800/60 select-none">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-zinc-400" />
                    <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Linked Records ({allLinkedItems.length})
                    </h5>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!isPerson && (
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeRollup}
                          onChange={(e) => setIncludeRollup(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600"
                        />
                        <span>Include Employee / Subsidiary Rollup</span>
                      </label>
                    )}

                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        type="text"
                        placeholder="Filter associated records..."
                        value={linkedSearch}
                        onChange={(e) => setLinkedSearch(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 w-52"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={fetchLinkedEverything}
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      title="Re-scan platform links"
                    >
                      <RefreshCw size={14} className={loadingLinked ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: `All (${allLinkedItems.length})` },
                    {
                      id: 'MODULES',
                      label: `Modules (${counts.moduleRecords || 0})`,
                    },
                    {
                      id: 'RELATIONSHIPS',
                      label: `Relationships (${counts.relationships || 0})`,
                    },
                    {
                      id: 'FINANCE',
                      label: `Finance (${
                        (counts.invoices || 0) +
                        (counts.bills || 0) +
                        (counts.posOrders || 0) +
                        (counts.payments || 0) +
                        (counts.refunds || 0) +
                        (counts.rmas || 0)
                      })`,
                    },
                    {
                      id: 'COMMS',
                      label: `Messages (${
                        (counts.emails || 0) + (counts.serviceDeskSessions || 0)
                      })`,
                    },
                    {
                      id: 'DOCUMENTS',
                      label: `Documents (${counts.documents || 0})`,
                    },
                    {
                      id: 'NOTES_TASKS',
                      label: `Notes & Tasks (${
                        (counts.notes || 0) + (counts.reminders || 0)
                      })`,
                    },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLinkedCategoryFilter(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                        linkedCategoryFilter === cat.id
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Associated Items Grid */}
                {loadingLinked && !linkedData ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <AuroraSpinner />
                    <p className="text-xs">Scanning all platform modules and subsystems...</p>
                  </div>
                ) : filteredLinkedItems.length === 0 ? (
                  <div className="py-10 text-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Layers size={28} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      No associated records match this filter
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredLinkedItems.map((item) => {
                      const isFocusedInFeed =
                        item.recordId && feedRecordFilter === item.recordId;
                      return (
                        <div
                          key={item.id}
                          onClick={() => item.url && navigate(item.url)}
                          className={cn(
                            'p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group',
                            isFocusedInFeed
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                              : 'bg-zinc-50/70 dark:bg-zinc-950/50 border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40'
                          )}
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">
                                  {String(item.category || 'RECORD').replace(/_/g, ' ')}
                                </span>
                                {item.moduleName && (
                                  <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[9px] font-bold">
                                    {item.moduleName}
                                  </span>
                                )}
                                {item.status && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                              <ExternalLink
                                size={13}
                                className="text-zinc-300 group-hover:text-indigo-500 transition-colors shrink-0"
                              />
                            </div>

                            <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {item.title}
                            </p>

                            <p className="text-[11px] text-zinc-500 truncate">{item.subtitle}</p>
                          </div>

                          <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-zinc-400 truncate">
                              {item.linkedVia}
                            </span>
                            {item.recordId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFeedRecordFilter((prev) =>
                                    prev === item.recordId ? 'ALL' : item.recordId
                                  );
                                }}
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors shrink-0',
                                  isFocusedInFeed
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                                )}
                              >
                                {isFocusedInFeed ? 'Showing Activity' : 'Filter Feed'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>

              {/* SECTION B: WHOLE-OF-AURORA LIVE ACTIVITY & CORRESPONDENCE FEED */}
              <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800/60 select-none">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-zinc-400" />
                    <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Activity Stream
                    </h5>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRecordViews}
                        onChange={(e) => setIncludeRecordViews(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <Eye size={12} className="text-zinc-400" />
                      <span>Include Views ({counts.totalActivityWithViews || 0})</span>
                    </label>

                    <div className="relative">
                      <Search
                        size={13}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      />
                      <input
                        type="text"
                        placeholder="Search feed events, fields, actors..."
                        value={feedSearch}
                        onChange={(e) => setFeedSearch(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 w-56"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                {/* Stream Category & Record Filter Bar */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'All Activity' },
                      { id: 'RECORDS_WORKFLOW', label: 'Records' },
                      { id: 'CORRESPONDENCE', label: 'Messages' },
                      { id: 'DOCUMENTS', label: 'Documents' },
                      { id: 'FINANCIALS', label: 'Financials' },
                      { id: 'NOTES_TASKS', label: 'Notes & Tasks' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeedCategoryFilter(cat.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                          feedCategoryFilter === cat.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Associated Record Filter Pills */}
                  {associatedModuleRecords.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
                        Filter by Associated Record:
                      </span>
                      <button
                        type="button"
                        onClick={() => setFeedRecordFilter('ALL')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                          feedRecordFilter === 'ALL'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        )}
                      >
                        All Records ({associatedModuleRecords.length})
                      </button>
                      {associatedModuleRecords.map((rec: any) => (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() =>
                            setFeedRecordFilter((prev) => (prev === rec.id ? 'ALL' : rec.id))
                          }
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5',
                            feedRecordFilter === rec.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-indigo-500/40'
                          )}
                        >
                          <span className="font-mono">{rec.recordKey}</span>
                          <span className="opacity-75 text-[10px]">({rec.moduleName})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chronological Timeline Stream */}
                {filteredActivityFeed.length === 0 ? (
                  <div className="py-14 text-center space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Activity size={30} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      No activity events match the current filter
                    </p>
                    <p className="text-xs text-zinc-500">
                      Try clearing your search filter or toggling "Include Views".
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    {filteredActivityFeed.map((ev) => {
                      const hasChanges = Array.isArray(ev.changes) && ev.changes.length > 0;
                      const isExpanded = expandedDiffIds.has(ev.id);

                      const badgeColor =
                        ev.streamCategory === 'CORRESPONDENCE'
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                          : ev.streamCategory === 'FINANCIALS'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : ev.streamCategory === 'DOCUMENTS'
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                          : ev.streamCategory === 'NOTES_TASKS'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : ev.streamCategory === 'ACCESS'
                          ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

                      return (
                        <div
                          key={ev.id}
                          className="relative p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all space-y-2.5"
                        >
                          {/* Timeline Dot */}
                          <span
                            className={cn(
                              'absolute -left-[19px] top-5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-zinc-900',
                              ev.streamCategory === 'CORRESPONDENCE'
                                ? 'bg-sky-500'
                                : ev.streamCategory === 'FINANCIALS'
                                ? 'bg-emerald-500'
                                : ev.streamCategory === 'DOCUMENTS'
                                ? 'bg-violet-500'
                                : ev.streamCategory === 'NOTES_TASKS'
                                ? 'bg-amber-500'
                                : ev.streamCategory === 'ACCESS'
                                ? 'bg-zinc-400'
                                : 'bg-indigo-500'
                            )}
                          />

                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border',
                                    badgeColor
                                  )}
                                >
                                  {String(ev.eventType || 'EVENT').replace(/_/g, ' ')}
                                </span>

                                {ev.targetRecord && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      ev.targetRecord.url && navigate(ev.targetRecord.url)
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                  >
                                    <span className="font-mono">{ev.targetRecord.recordKey}</span>
                                    <span className="text-zinc-400">•</span>
                                    <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">
                                      {ev.targetRecord.moduleName}
                                    </span>
                                    <ExternalLink size={10} />
                                  </button>
                                )}

                                {ev.status && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase">
                                    {ev.status}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-bold text-zinc-900 dark:text-white pt-0.5">
                                {ev.title}
                              </p>
                              {ev.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                  {ev.description}
                                </p>
                              )}
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                              <time className="text-[10px] font-mono text-zinc-400">
                                {new Date(ev.timestamp).toLocaleString()}
                              </time>
                              {ev.actor && (
                                <UserProfileTrigger
                                  memberId={ev.actor.id}
                                  name={ev.actor.name}
                                  avatarUrl={ev.actor.avatarUrl}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  <UserAvatarWithPresence
                                    name={ev.actor.name}
                                    avatarUrl={ev.actor.avatarUrl || undefined}
                                    size="xs"
                                    showPresence={false}
                                  />
                                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    {ev.actor.name}
                                  </span>
                                </UserProfileTrigger>
                              )}
                            </div>
                          </div>

                          {/* Expandable Field-Level Diffs */}
                          {hasChanges && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleDiffExpand(ev.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={13} />
                                ) : (
                                  <ChevronRight size={13} />
                                )}
                                <span>
                                  {isExpanded ? 'Hide' : 'Inspect'} {ev.changes.length} Field{' '}
                                  {ev.changes.length === 1 ? 'Change' : 'Changes'}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden text-[11px]">
                                  {ev.changes.slice(0, 15).map((chg: any, cIdx: number) => (
                                    <div
                                      key={cIdx}
                                      className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                        {chg.fieldLabel || chg.fieldId}
                                      </span>
                                      <div className="flex items-center gap-2 font-mono text-[10px] min-w-0">
                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 truncate max-w-[160px]">
                                          {chg.oldValue === undefined ||
                                          chg.oldValue === null ||
                                          chg.oldValue === ''
                                            ? '(empty)'
                                            : typeof chg.oldValue === 'object'
                                            ? JSON.stringify(chg.oldValue)
                                            : String(chg.oldValue)}
                                        </span>
                                        <ArrowRight size={11} className="text-zinc-400 shrink-0" />
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 truncate max-w-[180px]">
                                          {chg.newValue === undefined ||
                                          chg.newValue === null ||
                                          chg.newValue === ''
                                            ? '(empty)'
                                            : typeof chg.newValue === 'object'
                                            ? JSON.stringify(chg.newValue)
                                            : String(chg.newValue)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: OVERVIEW & PROFILE EDITOR                                 */}
          {/* ================================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* SECTION 1: IDENTITY & REGISTRATION */}
              <FormSection
                title={isPerson ? 'Identity' : 'Company Information'}
                icon={isPerson ? User : Building}
              >
                {isPerson ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField label="Salutation">
                        <FormSelect
                          value={formData.person.salutation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, salutation: e.target.value },
                            })
                          }
                          options={[
                            { label: 'None', value: '' },
                            { label: 'Mr.', value: 'Mr.' },
                            { label: 'Ms.', value: 'Ms.' },
                            { label: 'Mrs.', value: 'Mrs.' },
                            { label: 'Dr.', value: 'Dr.' },
                            { label: 'Prof.', value: 'Prof.' },
                          ]}
                        />
                      </FormField>
                      <FormField label="First Name" required>
                        <FormInput
                          value={formData.person.firstName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, firstName: e.target.value },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Last Name" required>
                        <FormInput
                          value={formData.person.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, lastName: e.target.value },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Preferred Name">
                        <FormInput
                          value={formData.person.preferredName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, preferredName: e.target.value },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Date of Birth">
                        <FormInput
                          type="date"
                          value={formData.person.dateOfBirth}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, dateOfBirth: e.target.value },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Job Title">
                        <FormInput
                          placeholder="e.g. Managing Director"
                          value={formData.person.jobTitle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, jobTitle: e.target.value },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Department">
                        <FormInput
                          placeholder="e.g. Executive, Finance"
                          value={formData.person.department}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, department: e.target.value },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <FormField label="Primary Organisation">
                      <FormSelect
                        value={formData.person.primaryOrgPartyId}
                        onChange={(e) => {
                          const orgId = e.target.value;
                          const matchedOrg = allParties.find((p) => p.id === orgId);
                          setFormData({
                            ...formData,
                            person: {
                              ...formData.person,
                              primaryOrgPartyId: orgId,
                              primaryOrgName:
                                matchedOrg?.displayName ||
                                matchedOrg?.organization?.legalName ||
                                '',
                            },
                          });
                        }}
                        options={[
                          { label: '— Independent / No Primary Organisation —', value: '' },
                          ...allParties
                            .filter((p) => p.partyType === 'ORGANIZATION')
                            .map((org) => ({
                              label:
                                org.displayName ||
                                org.organization?.legalName ||
                                'Organization',
                              value: org.id,
                            })),
                        ]}
                      />
                    </FormField>

                    <label className="flex items-center gap-2.5 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.person.isHumanInLoop}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            person: { ...formData.person, isHumanInLoop: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Human Signatory Verification Required
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Legal Name" required>
                        <FormInput
                          value={formData.organization.legalName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                legalName: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Trading Name">
                        <FormInput
                          value={formData.organization.tradingName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                tradingName: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Legal Structure">
                        <FormSelect
                          value={formData.organization.orgStructureType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                orgStructureType: e.target.value,
                              },
                            })
                          }
                          options={[
                            { label: 'Company', value: 'COMPANY' },
                            { label: 'Private Limited (Pty Ltd)', value: 'PTY_LTD' },
                            { label: 'Public Listed', value: 'PUBLIC_LISTED' },
                            { label: 'Trust', value: 'TRUST' },
                            { label: 'Partnership', value: 'PARTNERSHIP' },
                            { label: 'Sole Trader', value: 'SOLE_TRADER' },
                            { label: 'Non-Profit / Charity', value: 'NON_PROFIT' },
                            { label: 'Government Agency', value: 'GOVERNMENT' },
                          ]}
                        />
                      </FormField>
                      <FormField label="Tax ID / ABN">
                        <FormInput
                          value={formData.organization.taxIdentifier}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                taxIdentifier: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Registration No.">
                        <FormInput
                          value={formData.organization.companyRegistrationNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                companyRegistrationNumber: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Incorporation Date">
                        <FormInput
                          type="date"
                          value={formData.organization.incorporationDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                incorporationDate: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Industry">
                        <FormInput
                          placeholder="e.g. Financial Services, Technology"
                          value={formData.organization.industry}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                industry: e.target.value,
                              },
                            })
                          }
                        />
                      </FormField>
                      <FormField label="Primary Contact">
                        <FormSelect
                          value={formData.organization.primaryContactPartyId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                primaryContactPartyId: e.target.value,
                              },
                            })
                          }
                          options={[
                            { label: '— None Selected —', value: '' },
                            ...allParties
                              .filter((p) => p.partyType === 'PERSON')
                              .map((per) => ({
                                label:
                                  per.displayName ||
                                  `${per.person?.firstName || ''} ${
                                    per.person?.lastName || ''
                                  }`.trim(),
                                value: per.id,
                              })),
                          ]}
                        />
                      </FormField>
                    </div>
                  </>
                )}
              </FormSection>

              {/* SECTION 2: CONTACT CHANNELS & ACCOUNT OWNERSHIP */}
              <FormSection
                title="Contact & Ownership"
                icon={Mail}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Primary Email">
                    <FormInput
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Secondary Email">
                    <FormInput
                      type="email"
                      value={
                        isPerson
                          ? formData.secondaryEmail
                          : formData.organization.billingEmail || formData.secondaryEmail
                      }
                      onChange={(e) =>
                        isPerson
                          ? setFormData({ ...formData, secondaryEmail: e.target.value })
                          : setFormData({
                              ...formData,
                              secondaryEmail: e.target.value,
                              organization: {
                                ...formData.organization,
                                billingEmail: e.target.value,
                              },
                            })
                      }
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Office Phone">
                    <FormInput
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Mobile Phone">
                    <FormInput
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Website">
                    <FormInput
                      placeholder="https://..."
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Account Owner">
                    <FormSelect
                      value={formData.accountOwnerMemberId}
                      onChange={(e) =>
                        setFormData({ ...formData, accountOwnerMemberId: e.target.value })
                      }
                      options={[
                        { label: '— Unassigned —', value: '' },
                        ...tenantMembers.map((m: any) => ({
                          label: `${m.name || m.email} (${m.role || 'Member'})`,
                          value: m.id,
                        })),
                      ]}
                    />
                  </FormField>
                </div>

                <FormField label="Profile Summary">
                  <FormTextarea
                    rows={3}
                    value={formData.notesSummary}
                    onChange={(e) =>
                      setFormData({ ...formData, notesSummary: e.target.value })
                    }
                    placeholder="Brief description or context..."
                  />
                </FormField>

                <FormField label="Classifications">
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {availableClassifications.map((tag) => {
                      const active = formData.classifications.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleClassification(tag)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                            active
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold'
                              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200'
                          )}
                        >
                          {active ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>
                </FormField>
              </FormSection>

              {/* SECTION 3: ADDRESSES */}
              <FormSection
                title="Addresses"
                icon={MapPin}
                actions={
                  <button
                    type="button"
                    onClick={addAddress}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Address</span>
                  </button>
                }
              >
                {(!formData.addresses || formData.addresses.length === 0) ? (
                  <p className="text-xs text-zinc-400 italic">
                    No structured addresses recorded. Click "Add Address" to add Billing, Shipping, or Registered Office locations.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.addresses.map((addr: any, idx: number) => (
                      <div
                        key={addr.id || idx}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={addr.type || 'BILLING'}
                            onChange={(e) => updateAddress(idx, 'type', e.target.value)}
                            className="text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1"
                          >
                            <option value="BILLING">Billing Address</option>
                            <option value="SHIPPING">Shipping / Delivery</option>
                            <option value="REGISTERED">Registered Office</option>
                            <option value="HEADQUARTERS">Headquarters</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeAddress(idx)}
                            className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <FormField label="Street Line 1">
                          <FormInput
                            value={addr.line1 || ''}
                            onChange={(e) => updateAddress(idx, 'line1', e.target.value)}
                          />
                        </FormField>
                        <div className="grid grid-cols-3 gap-2">
                          <FormField label="City / Suburb">
                            <FormInput
                              value={addr.city || ''}
                              onChange={(e) => updateAddress(idx, 'city', e.target.value)}
                            />
                          </FormField>
                          <FormField label="State">
                            <FormInput
                              value={addr.state || ''}
                              onChange={(e) => updateAddress(idx, 'state', e.target.value)}
                            />
                          </FormField>
                          <FormField label="Postcode">
                            <FormInput
                              value={addr.postalCode || ''}
                              onChange={(e) => updateAddress(idx, 'postalCode', e.target.value)}
                            />
                          </FormField>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* SECTION 4: CUSTOM ENTERPRISE FIELDS */}
              {applicableCustomFields.length > 0 && (
                <FormSection
                  title="Custom Fields"
                  icon={Sparkles}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {applicableCustomFields.map((field: any) => (
                      <FormField key={field.id || field.key} label={field.label} required={field.required}>
                        {field.type === 'select' ? (
                          <FormSelect
                            value={formData.customData?.[field.key] || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customData: {
                                  ...formData.customData,
                                  [field.key]: e.target.value,
                                },
                              })
                            }
                            options={[
                              { label: '— Select —', value: '' },
                              ...(field.options || []).map((opt: string) => ({
                                label: opt,
                                value: opt,
                              })),
                            ]}
                          />
                        ) : (
                          <FormInput
                            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                            value={formData.customData?.[field.key] || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customData: {
                                  ...formData.customData,
                                  [field.key]: e.target.value,
                                },
                              })
                            }
                          />
                        )}
                      </FormField>
                    ))}
                  </div>
                </FormSection>
              )}
            </div>
          )}
          {/* ================================================================ */}
          {/* TAB 3: RELATIONSHIPS & ORG GRAPH                                 */}
          {/* ================================================================ */}
          {activeTab === 'relationships' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800/60 select-none">
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-zinc-400" />
                    <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Relationships & Ownership
                    </h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGraphInRelTab(!showGraphInRelTab)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <GitBranch size={13} />
                      <span>{showGraphInRelTab ? 'Hide Graph' : 'Show Graph'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRelationship(null);
                        setIsAddRelationshipModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Connection</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-4">

                {showGraphInRelTab && (
                  <div className="h-[480px]">
                    <RelationshipGraph
                      rootId={id}
                      rootName={displayName}
                      rootType={party.partyType}
                    />
                  </div>
                )}

                {/* Relationships List */}
                <div className="space-y-3 pt-2">
                  {relationships.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <p className="text-xs text-zinc-500">
                        No relationships connected yet. Click "Add Connection" to link employees, subsidiaries, owners, or partners.
                      </p>
                    </div>
                  ) : (
                    relationships.map((rel) => {
                      const other =
                        rel.sourcePartyId === id ? rel.targetParty : rel.sourceParty;
                      if (!other) return null;
                      const otherName =
                        other.displayName ||
                        (other.partyType === 'PERSON'
                          ? `${other.person?.firstName || ''} ${
                              other.person?.lastName || ''
                            }`.trim()
                          : other.organization?.legalName || 'Entity');
                      const isUbo =
                        rel.ownershipPercentage !== null &&
                        rel.ownershipPercentage !== undefined &&
                        Number(rel.ownershipPercentage) >= 25;

                      return (
                        <div
                          key={rel.id}
                          className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            <PartyProfileTrigger
                              partyId={other.id}
                              className="flex items-center gap-3 text-left"
                            >
                              <div
                                className={cn(
                                  'w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0',
                                  other.partyType === 'PERSON'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                                )}
                              >
                                {other.partyType === 'PERSON' ? (
                                  <User size={18} />
                                ) : (
                                  <Building2 size={18} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-white hover:text-indigo-600">
                                    {otherName}
                                  </span>
                                  <Badge variant="indigo">{rel.relationshipType}</Badge>
                                  {rel.isPrimary && (
                                    <Badge variant="amber">Primary Contact</Badge>
                                  )}
                                  {isUbo && (
                                    <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase">
                                      UBO ({rel.ownershipPercentage}% Equity)
                                    </span>
                                  )}
                                  {!isUbo && rel.ownershipPercentage > 0 && (
                                    <Badge variant="zinc">
                                      {rel.ownershipPercentage}% Ownership
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {rel.roleTitle || other.person?.jobTitle || other.partyType}
                                  {rel.department ? ` • ${rel.department}` : ''}
                                  {rel.notes ? ` • "${rel.notes}"` : ''}
                                </p>
                              </div>
                            </PartyProfileTrigger>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRelationship(rel);
                                setIsAddRelationshipModalOpen(true);
                              }}
                            >
                              <Edit3 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="text-rose-500"
                            >
                              <Trash2 size={14} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/workspace/apps/directory/${other.id}`)}
                            >
                              Open 360°
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: FINANCIALS & COMMERCE                                     */}
          {/* ================================================================ */}
          {activeTab === 'financials' && (
            <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 select-none">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-zinc-400" />
                  <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Financial Ledger
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/workspace/financials')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span>Open Financials</span>
                  <ExternalLink size={12} />
                </button>
              </div>
              <div className="p-4 space-y-4">

              {/* Financial KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Total Invoiced (AR)
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">
                    ${Number(fin.totalInvoiced || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Outstanding AR
                  </p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
                    ${Number(fin.outstandingAR || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Total Billed (AP)
                  </p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    ${Number(fin.totalBilled || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    POS Retail Spend
                  </p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ${Number(fin.totalPosSpend || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Financial Transactions List */}
              <div className="space-y-2.5">
                {allLinkedItems
                  .filter((item) =>
                    [
                      'INVOICE',
                      'BILL',
                      'POS_ORDER',
                      'PAYMENT',
                      'REFUND',
                      'RMA',
                      'VOUCHER',
                      'JOURNAL_LINE',
                    ].includes(item.category)
                  )
                  .map((finItem) => (
                    <div
                      key={finItem.id}
                      onClick={() => finItem.url && navigate(finItem.url)}
                      className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-500/40"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="indigo">{finItem.category}</Badge>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {finItem.title}
                          </span>
                          {finItem.status && (
                            <Badge variant="green">{finItem.status}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{finItem.subtitle}</p>
                      </div>
                      <div className="text-right">
                        {finItem.amount !== undefined && (
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ${Number(finItem.amount).toLocaleString()}
                          </p>
                        )}
                        {finItem.date && (
                          <p className="text-[10px] text-zinc-400">
                            {new Date(finItem.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: COMMUNICATIONS (INBOX & SERVICE DESK)                     */}
          {/* ================================================================ */}
          {activeTab === 'communications' && (
            <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 select-none">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-zinc-400" />
                  <h5 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Communications History
                  </h5>
                </div>
                {formData.email && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/workspace/apps/inbox?composeTo=${encodeURIComponent(
                          formData.email
                        )}&partyId=${party.id}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Mail size={12} />
                    <span>Compose Email</span>
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {allLinkedItems
                  .filter((item) => ['EMAIL_THREAD', 'SERVICE_DESK'].includes(item.category))
                  .map((comm) => (
                    <div
                      key={comm.id}
                      onClick={() => comm.url && navigate(comm.url)}
                      className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={comm.category === 'EMAIL_THREAD' ? 'indigo' : 'amber'}
                          >
                            {comm.category === 'EMAIL_THREAD' ? 'Inbox Thread' : 'Service Desk'}
                          </Badge>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {comm.title}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{comm.subtitle}</p>
                      </div>
                      {comm.date && (
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {new Date(comm.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                {allLinkedItems.filter((item) =>
                  ['EMAIL_THREAD', 'SERVICE_DESK'].includes(item.category)
                ).length === 0 && (
                  <p className="text-xs text-zinc-400 italic py-8 text-center">
                    No matched email threads or Service Desk sessions found for this entity yet.
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* RIGHT-HAND DOCKED CONTEXT RAIL (NOTES, REMINDERS, AUDIT)            */}
        {/* ================================================================== */}
        {showRightRail && (
          <div className="w-80 xl:w-88 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 h-full overflow-hidden">
            {/* Context Rail Segmented Header */}
            <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 px-3 flex items-center shrink-0 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-full">
                <button
                  type="button"
                  onClick={() => setRailTab('notes')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    railTab === 'notes'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  <StickyNote size={12} />
                  <span>Notes ({notes.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRailTab('reminders')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    railTab === 'reminders'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  <Bell size={12} />
                  <span>Tasks ({reminders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRailTab('audit')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    railTab === 'audit'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  <Clock size={12} />
                  <span>Audit</span>
                </button>
              </div>
            </div>

            {/* Context Rail Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/40">

            {railTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateNote} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="Write a note..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    loading={savingNote}
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  >
                    <Plus size={13} className="mr-1" /> Add Note
                  </Button>
                </form>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                          {n.title}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-zinc-400 hover:text-rose-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                        {n.content}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(n.updatedAt || n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-6 italic">
                      No notes recorded for this entity yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {railTab === 'reminders' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateReminder} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Follow-up task or reminder..."
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="datetime-local"
                    value={newReminderDueAt}
                    onChange={(e) => setNewReminderDueAt(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    loading={savingReminder}
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  >
                    <Bell size={13} className="mr-1" /> Add Task
                  </Button>
                </form>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2.5"
                    >
                      <div>
                        <p
                          className={cn(
                            'text-xs font-bold',
                            r.status === 'COMPLETED'
                              ? 'line-through text-zinc-400'
                              : 'text-zinc-900 dark:text-white'
                          )}
                        >
                          {r.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Due: {new Date(r.dueAt).toLocaleString()}
                        </p>
                      </div>
                      {r.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteReminder(r.id)}
                          className="p-1 text-zinc-400 hover:text-emerald-500"
                          title="Mark Completed"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-6 italic">
                      No follow-up tasks scheduled.
                    </p>
                  )}
                </div>
              </div>
            )}

            {railTab === 'audit' && (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                        {String(log.action || '').replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Actor: {log.actorId}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-6 italic">
                    No audit events logged yet.
                  </p>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={`Delete ${displayName}?`}
        description="This action cannot be undone. All associated relationships and directory profile records will be permanently removed."
        isDeleting={isDeleting}
      />

      <AddRelationshipModal
        isOpen={isAddRelationshipModalOpen}
        onClose={() => {
          setIsAddRelationshipModalOpen(false);
          setEditingRelationship(null);
        }}
        onSuccess={() => {
          fetchExtras();
          fetchParty();
          fetchLinkedEverything();
        }}
        sourcePartyId={id!}
        editingRelationship={editingRelationship}
      />
    </div>
  );
};

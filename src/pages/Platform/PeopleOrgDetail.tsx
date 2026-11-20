import { motion } from 'motion/react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Users,
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Button, Input, Select, Badge, AuroraSpinner } from '../../components/UI/Primitives';
import { PageLoader } from '../../components/UI/PageLoader';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { RelationshipGraph } from '../../components/Platform/RelationshipGraph';
import { AddRelationshipModal } from '../../components/Platform/AddRelationshipModal';
import { EntityAvatarUpload } from '../../components/Platform/EntityAvatarUpload';
import { PartyProfileTrigger } from '../../context/PartyProfileCardContext';
import { UserAvatarWithPresence, UserProfileTrigger } from '../../components/Common/UserPresenceBadge';
import { useRegisterActiveEntity } from '../../context/ActiveEntityContext';
import { DirectoryLookup } from '../../components/Common/DirectoryLookup';
import { AuroraModal } from '../../components/UI/AuroraModal';
import { CreatePartyModal } from '../../components/Platform/CreatePartyModal';
import { DatePicker } from '../../components/UI/DatePicker';
import { UserSelector } from '../../components/Common/UserSelector';


// Standardized Workspace Form Controls (aligned with RecordDetailView / CollapsibleFieldGroup)
const FormSection = ({ title, actions, children, className }: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs",
    className
  )}>
    <div className="px-3.5 py-2.5 flex items-center justify-between select-none border-b border-zinc-200/60 dark:border-zinc-800/60 rounded-t-xl">
      <div className="flex items-center gap-2 min-w-0">
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

const DEFAULT_LEGAL_STRUCTURES = [
  { label: 'Company', value: 'COMPANY' },
  { label: 'Private Limited (Pty Ltd)', value: 'PTY_LTD' },
  { label: 'Public Listed', value: 'PUBLIC_LISTED' },
  { label: 'Trust', value: 'TRUST' },
  { label: 'Partnership', value: 'PARTNERSHIP' },
  { label: 'Sole Trader', value: 'SOLE_TRADER' },
  { label: 'Non-Profit / Charity', value: 'NON_PROFIT' },
  { label: 'Government Agency', value: 'GOVERNMENT' },
  { label: 'Incorporated Association', value: 'INCORPORATED_ASSOC' },
  { label: 'Limited Liability Company (LLC)', value: 'LLC' },
  { label: 'Co-operative', value: 'COOPERATIVE' },
];

const DEFAULT_INDUSTRIES = [
  { label: 'Technology & Software', value: 'Technology & Software' },
  { label: 'Financial Services & Banking', value: 'Financial Services & Banking' },
  { label: 'Healthcare & Life Sciences', value: 'Healthcare & Life Sciences' },
  { label: 'Manufacturing & Engineering', value: 'Manufacturing & Engineering' },
  { label: 'Retail & Consumer Goods', value: 'Retail & Consumer Goods' },
  { label: 'Professional Services & Consulting', value: 'Professional Services & Consulting' },
  { label: 'Construction & Real Estate', value: 'Construction & Real Estate' },
  { label: 'Energy, Oil & Gas', value: 'Energy, Oil & Gas' },
  { label: 'Education & Training', value: 'Education & Training' },
  { label: 'Hospitality & Tourism', value: 'Hospitality & Tourism' },
  { label: 'Transport & Logistics', value: 'Transport & Logistics' },
  { label: 'Agriculture & Forestry', value: 'Agriculture & Forestry' },
  { label: 'Government & Public Sector', value: 'Government & Public Sector' },
  { label: 'Non-Profit & Community', value: 'Non-Profit & Community' },
  { label: 'Automotive & Mobility', value: 'Automotive & Mobility' },
  { label: 'Telecommunications & Media', value: 'Telecommunications & Media' },
];

const CLASSIFICATION_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs font-bold',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs font-bold',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-xs font-bold',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-xs font-bold',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs font-bold',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 shadow-xs font-bold',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs font-bold',
  zinc: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 shadow-xs font-bold',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-xs font-bold',
};

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

  // Organisation Contacts state
  const [orgContacts, setOrgContacts] = useState<any[]>([]);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [selectedPersonToLink, setSelectedPersonToLink] = useState('');
  const [linkingContact, setLinkingContact] = useState(false);
  const [linkAsPrimary, setLinkAsPrimary] = useState(false);
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);

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

  // Directory config & reference lists (backed by Global Lists)
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [availableClassifications, setAvailableClassifications] =
    useState<string[]>(DEFAULT_CLASSIFICATIONS);
  const [availableClassificationDetails, setAvailableClassificationDetails] =
    useState<any[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<any[]>([]);
  const [availableLegalStructures, setAvailableLegalStructures] = useState<any[]>([]);
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

  // Real-time AI Assistant active entity registration
  const activeEntityContext = useMemo(() => {
    if (!party || !party.id) return null;
    const isPerson = party.type === 'INDIVIDUAL' || party.type === 'PERSON';
    const domain = isPerson ? ('directory_person' as const) : ('directory_org' as const);
    const title = party.displayName || party.name || (isPerson ? `${party.firstName || ''} ${party.lastName || ''}`.trim() : 'Directory Entity');
    const subtitle = isPerson
      ? (party.jobTitle ? `${party.jobTitle}${party.orgName ? ` at ${party.orgName}` : ''}` : 'Individual Contact')
      : (party.industry || 'Organization');
    
    return {
      domain,
      id: String(party.id),
      title,
      subtitle: `${subtitle} • ${party.stage || 'Active'}`,
      status: party.stage || 'Active',
      activeTab,
      keyAttributes: {
        'Entity Type': isPerson ? 'Individual (Person)' : 'Organization (Company)',
        'Email': party.email || party.workEmail || null,
        'Phone': party.phone || party.workPhone || party.mobile || null,
        'Job Title': party.jobTitle || null,
        'Organization': party.orgName || party.organization?.name || null,
        'Lifecycle Stage': party.stage || null,
        'Owner / Manager': party.assignedUser?.name || party.assignedToName || null,
        'City': party.address?.city || party.city || null,
        'Country': party.address?.country || party.country || null,
        'Website': party.website || null,
        'Industry': party.industry || null,
      },
      relatedCounts: {
        relationships: relationships?.length || undefined,
        notes: notes?.length || undefined,
        documents: linkedData?.records?.length || undefined,
      },
      rawUrl: window.location.pathname + window.location.search,
    };
  }, [party, activeTab, relationships?.length, notes?.length, linkedData?.records?.length]);

  const legalStructureOptions = useMemo(() => {
    const list =
      availableLegalStructures.length > 0
        ? availableLegalStructures.map((ls: any) => ({
            label: ls.label || ls.code,
            value: ls.code || ls.label,
          }))
        : [...DEFAULT_LEGAL_STRUCTURES];

    const currentVal = formData.organization?.orgStructureType;
    if (
      currentVal &&
      !list.some((o: any) => o.value.toUpperCase() === String(currentVal).toUpperCase())
    ) {
      list.unshift({
        label: currentVal,
        value: currentVal,
      });
    }

    return list;
  }, [availableLegalStructures, formData.organization?.orgStructureType]);

  const industryOptions = useMemo(() => {
    const list =
      availableIndustries.length > 0
        ? availableIndustries.map((ind: any) => ({
            label: ind.sector ? `${ind.label} (${ind.sector})` : ind.label,
            value: ind.label || ind.code,
          }))
        : [...DEFAULT_INDUSTRIES];

    const currentVal = formData.organization?.industry;
    if (
      currentVal &&
      !list.some((o: any) => o.value.toLowerCase() === String(currentVal).toLowerCase())
    ) {
      list.unshift({
        label: `${currentVal} (Custom)`,
        value: currentVal,
      });
    }

    return [{ label: 'Select Industry Sector...', value: '' }, ...list];
  }, [availableIndustries, formData.organization?.industry]);

  useRegisterActiveEntity(activeEntityContext, {
    priority: 10,
    enabled: Boolean(party?.id),
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
      if (Array.isArray(data.contacts)) {
        setOrgContacts(data.contacts);
      } else {
        setOrgContacts([]);
      }
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
        if (Array.isArray(cfg.classificationDetails) && cfg.classificationDetails.length > 0) {
          setAvailableClassificationDetails(cfg.classificationDetails);
        }
        if (Array.isArray(cfg.industries) && cfg.industries.length > 0) {
          setAvailableIndustries(cfg.industries);
        }
        if (Array.isArray(cfg.legalStructures) && cfg.legalStructures.length > 0) {
          setAvailableLegalStructures(cfg.legalStructures);
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

  // Reset or sync activeTab when switching entity records or if URL search param specifies a tab
  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'overview');
  }, [id, searchParams]);

  // Ensure 'contacts' tab is never active on a Person entity
  useEffect(() => {
    if (party?.partyType === 'PERSON' && activeTab === 'contacts') {
      setActiveTab('overview');
    }
  }, [party?.partyType, activeTab]);

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
      if (Array.isArray(data.contacts)) {
        setOrgContacts(data.contacts);
      } else {
        setOrgContacts([]);
      }
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

  const handleSetPrimaryContact = async (personPartyId: string | null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}/primary-contact`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ personPartyId }),
      });
      if (res.ok) {
        setFormData((prev: any) => ({
          ...prev,
          organization: {
            ...prev.organization,
            primaryContactPartyId: personPartyId || '',
          },
        }));
        setOrgContacts((prev) =>
          prev.map((c) => ({
            ...c,
            isPrimaryContact: c.id === personPartyId,
          }))
        );
        toast.success(personPartyId ? 'Updated primary contact' : 'Cleared primary contact');
        window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      }
    } catch {
      toast.error('Failed to update primary contact');
    }
  };

  const handleLinkContact = async () => {
    if (!selectedPersonToLink) return;
    setLinkingContact(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          personPartyId: selectedPersonToLink,
          setAsPrimary: linkAsPrimary,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link contact');
      }
      toast.success('Contact added to organisation');
      setIsAddContactModalOpen(false);
      setSelectedPersonToLink('');
      setLinkAsPrimary(false);
      await fetchParty();
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLinkingContact(false);
    }
  };

  const handleUnlinkContact = async (personPartyId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to unlink ${contactName} from this organisation?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${id}/contacts/${personPartyId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setOrgContacts((prev) => prev.filter((c) => c.id !== personPartyId));
        if (formData.organization.primaryContactPartyId === personPartyId) {
          setFormData((prev: any) => ({
            ...prev,
            organization: {
              ...prev.organization,
              primaryContactPartyId: '',
            },
          }));
        }
        toast.success(`Unlinked ${contactName}`);
        window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      }
    } catch {
      toast.error('Failed to unlink contact');
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
      <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-[#101010] items-center justify-center">
        <PageLoader label="Loading Directory Profile..." fullscreen={false} className="border-none bg-transparent" />
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
            ...(!isPerson
              ? [
                  {
                    id: 'contacts',
                    label: 'Contacts',
                    badge: orgContacts.length,
                  },
                ]
              : []),
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
              {/* 2-COLUMN DOSSIER GRID: PERSON / COMPANY on LEFT, ORG / GOVERNANCE on RIGHT */}
              {isPerson ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Personal Details */}
                  <FormSection title="Personal Details">
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
                        <DatePicker
                          value={formData.person.dateOfBirth}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              person: { ...formData.person, dateOfBirth: val },
                            })
                          }
                          placeholder="Select date of birth..."
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Personal Email">
                        <FormInput
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  </FormSection>

                  {/* Right Column: Organisation & Employment */}
                  <FormSection title="Organisation & Employment">
                    <FormField label="Primary Organisation">
                      <DirectoryLookup
                        value={formData.person.primaryOrgPartyId}
                        onChange={(partyId, matchedOrg) => {
                          setFormData({
                            ...formData,
                            person: {
                              ...formData.person,
                              primaryOrgPartyId: partyId,
                              primaryOrgName:
                                matchedOrg?.displayName ||
                                matchedOrg?.organization?.legalName ||
                                '',
                            },
                          });
                        }}
                        filterPartyType="ORGANIZATION"
                        includeInternalOption={false}
                        placeholder="Search organisations in directory..."
                      />
                    </FormField>

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Work Email">
                        <FormInput
                          type="email"
                          value={formData.secondaryEmail}
                          onChange={(e) =>
                            setFormData({ ...formData, secondaryEmail: e.target.value })
                          }
                        />
                      </FormField>
                      <FormField label="Office Phone">
                        <FormInput
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Account Owner">
                        <UserSelector
                          value={formData.accountOwnerMemberId}
                          onChange={(userId) =>
                            setFormData({ ...formData, accountOwnerMemberId: userId })
                          }
                          placeholder="Select account owner..."
                        />
                      </FormField>
                      <FormField label="Website / Portfolio">
                        <FormInput
                          placeholder="https://..."
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        />
                      </FormField>
                    </div>

                    <FormField label="Classifications">
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {availableClassifications.map((tag) => {
                          const active = formData.classifications.includes(tag);
                          const detail = availableClassificationDetails.find(
                            (d: any) => d.code === tag || d.label === tag
                          );
                          const color = detail?.color || 'indigo';
                          const label = detail?.label || tag;

                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleClassification(tag)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                                active
                                  ? (CLASSIFICATION_COLOR_MAP[color] || 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold')
                                  : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200'
                              )}
                              title={detail?.description || `Toggle ${label}`}
                            >
                              {active ? `✓ ${label}` : `+ ${label}`}
                            </button>
                          );
                        })}
                      </div>
                    </FormField>
                  </FormSection>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Company Details */}
                  <FormSection title="Company Details">
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
                          options={legalStructureOptions}
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
                        <DatePicker
                          value={formData.organization.incorporationDate}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                incorporationDate: val,
                              },
                            })
                          }
                          placeholder="Select incorporation date..."
                        />
                      </FormField>
                    </div>

                    <FormField label="Industry">
                      <FormSelect
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
                        options={industryOptions}
                      />
                    </FormField>
                  </FormSection>

                  {/* Right Column: Contact & Governance */}
                  <FormSection title="Contact & Governance">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Primary Contact">
                        <DirectoryLookup
                          value={formData.organization.primaryContactPartyId}
                          onChange={(partyId) =>
                            setFormData({
                              ...formData,
                              organization: {
                                ...formData.organization,
                                primaryContactPartyId: partyId,
                              },
                            })
                          }
                          filterPartyType="PERSON"
                          includeInternalOption={false}
                          placeholder="Select primary contact..."
                        />
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab('contacts')}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Users size={12} />
                            <span>
                              {orgContacts.length > 0
                                ? `${orgContacts.length} Contact${orgContacts.length > 1 ? 's' : ''} connected • View all →`
                                : 'View Contacts directory →'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddContactModalOpen(true)}
                            className="text-[11px] font-semibold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus size={11} />
                            <span>Add</span>
                          </button>
                        </div>
                      </FormField>
                      <FormField label="Account Owner">
                        <UserSelector
                          value={formData.accountOwnerMemberId}
                          onChange={(userId) =>
                            setFormData({
                              ...formData,
                              accountOwnerMemberId: userId,
                            })
                          }
                          placeholder="Select account owner..."
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Primary Email">
                        <FormInput
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Billing Email">
                        <FormInput
                          type="email"
                          value={
                            formData.organization.billingEmail || formData.secondaryEmail
                          }
                          onChange={(e) =>
                            setFormData({
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

                    <FormField label="Website">
                      <FormInput
                        placeholder="https://..."
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </FormField>

                    <FormField label="Classifications">
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {availableClassifications.map((tag) => {
                          const active = formData.classifications.includes(tag);
                          const detail = availableClassificationDetails.find(
                            (d: any) => d.code === tag || d.label === tag
                          );
                          const color = detail?.color || 'indigo';
                          const label = detail?.label || tag;

                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleClassification(tag)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                                active
                                  ? (CLASSIFICATION_COLOR_MAP[color] || 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold')
                                  : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200'
                              )}
                              title={detail?.description || `Toggle ${label}`}
                            >
                              {active ? `✓ ${label}` : `+ ${label}`}
                            </button>
                          );
                        })}
                      </div>
                    </FormField>
                  </FormSection>
                </div>
              )}

              {/* SECTION: ADDRESSES */}
              <FormSection
                title="Addresses"
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

              {/* SECTION: PROFILE SUMMARY */}
              <FormSection title="Profile Summary">
                <FormField>
                  <FormTextarea
                    rows={3}
                    value={formData.notesSummary}
                    onChange={(e) =>
                      setFormData({ ...formData, notesSummary: e.target.value })
                    }
                    placeholder="Brief description or context..."
                  />
                </FormField>
              </FormSection>

              {/* SECTION: CUSTOM ENTERPRISE FIELDS */}
              {applicableCustomFields.length > 0 && (
                <FormSection
                  title="Custom Fields"
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
                        ) : field.type === 'date' ? (
                          <DatePicker
                            value={formData.customData?.[field.key] || ''}
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                customData: {
                                  ...formData.customData,
                                  [field.key]: val,
                                },
                              })
                            }
                            placeholder={`Select ${field.label.toLowerCase()}...`}
                          />
                        ) : (
                          <FormInput
                            type={field.type === 'number' ? 'number' : 'text'}
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
          {/* TAB: CONTACTS (ORGANISATIONS ONLY)                               */}
          {/* ================================================================ */}
          {activeTab === 'contacts' && !isPerson && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Organisation Contacts ({orgContacts.length})
                    </h4>
                    <p className="text-xs text-zinc-500">
                      People and staff members affiliated with {displayName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddContactModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Contact</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  {orgContacts.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30">
                      <Users className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        No contacts found for {displayName}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 max-w-md mx-auto">
                        Link existing contacts from your directory or register a new staff member.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddContactModalOpen(true)}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Contact</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {orgContacts.map((contact) => {
                        const isPrimary =
                          contact.isPrimaryContact ||
                          contact.id === formData.organization.primaryContactPartyId;
                        const contactFullName =
                          contact.displayName ||
                          `${contact.person?.firstName || ''} ${contact.person?.lastName || ''}`.trim() ||
                          'Contact';

                        return (
                          <div
                            key={contact.id}
                            className={cn(
                              "relative p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group/contact",
                              isPrimary
                                ? "bg-amber-50/40 dark:bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20 shadow-xs"
                                : "bg-white dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-indigo-500/20">
                                    {contact.avatarUrl ? (
                                      <img
                                        src={contact.avatarUrl}
                                        alt={contactFullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      contactFullName
                                        .split(' ')
                                        .slice(0, 2)
                                        .map((p: string) => p[0])
                                        .join('')
                                        .toUpperCase()
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/workspace/apps/directory/${contact.id}`)}
                                      className="text-xs font-bold text-zinc-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline block text-left cursor-pointer"
                                    >
                                      {contactFullName}
                                    </button>
                                    <p className="text-[11px] text-zinc-500 truncate">
                                      {contact.person?.jobTitle || 'No Title'}
                                      {contact.person?.department ? ` • ${contact.person.department}` : ''}
                                    </p>
                                  </div>
                                </div>

                                {isPrimary ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                    <Star size={11} className="fill-amber-500 text-amber-500" />
                                    <span>Primary</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryContact(contact.id)}
                                    title="Designate as the primary point of contact for this organisation"
                                    className="opacity-0 group-hover/contact:opacity-100 text-[10px] font-bold text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/30 transition-all shrink-0 cursor-pointer"
                                  >
                                    Set Primary
                                  </button>
                                )}
                              </div>

                              <div className="space-y-1 text-xs text-zinc-500 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60">
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                                  >
                                    <Mail size={13} className="shrink-0 text-zinc-400" />
                                    <span className="truncate">{contact.email}</span>
                                  </a>
                                )}
                                {(contact.phone || contact.mobile) && (
                                  <a
                                    href={`tel:${contact.phone || contact.mobile}`}
                                    className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                                  >
                                    <Phone size={13} className="shrink-0 text-zinc-400" />
                                    <span className="truncate">{contact.phone || contact.mobile}</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                              <button
                                type="button"
                                onClick={() => navigate(`/workspace/apps/directory/${contact.id}`)}
                                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                <span>Open Profile</span>
                                <ExternalLink size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnlinkContact(contact.id, contactFullName)}
                                title="Unlink contact from this organisation"
                                className="text-zinc-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
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

      {/* Link Contact Modal */}
      <AuroraModal
        isOpen={isAddContactModalOpen}
        onClose={() => {
          setIsAddContactModalOpen(false);
          setSelectedPersonToLink('');
          setLinkAsPrimary(false);
        }}
        title="Add Contact to Organisation"
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-visible"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Add Contact to {displayName}
                </h4>
                <p className="text-xs text-zinc-500">
                  Select an existing person or register a new one
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Select Person from Directory
              </label>
              <DirectoryLookup
                value={selectedPersonToLink}
                onChange={(partyId) => setSelectedPersonToLink(partyId)}
                filterPartyType="PERSON"
                placeholder="Search people in directory..."
                includeInternalOption={false}
                dropdownWidth="w-full"
              />
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={linkAsPrimary}
                onChange={(e) => setLinkAsPrimary(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
              />
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                  <Star size={11} className="text-amber-500 fill-amber-500" />
                  <span>Set as Primary Contact</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Designate as the main point of contact for this organisation
                </div>
              </div>
            </label>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddContactModalOpen(false);
                  setIsCreatePersonModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Create New Person</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddContactModalOpen(false);
                    setSelectedPersonToLink('');
                    setLinkAsPrimary(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedPersonToLink || linkingContact}
                  onClick={handleLinkContact}
                >
                  {linkingContact ? 'Adding...' : 'Link Contact'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AuroraModal>

      {/* Create New Person Modal */}
      <CreatePartyModal
        isOpen={isCreatePersonModalOpen}
        onClose={() => setIsCreatePersonModalOpen(false)}
        initialPartyType="PERSON"
        initialPrimaryOrgPartyId={id}
        onSuccess={() => {
          fetchParty();
          fetchExtras();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Inbox,
  Building2,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Mail,
  Phone,
  Copy,
  Check,
  Download,
  GitMerge,
  LayoutList,
  Columns,
  LayoutGrid,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Layers,
  Link2,
  CheckCircle2,
  Trash2,
  Tag,
  RefreshCw,
  DollarSign,
  Clock,
  Settings2,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { cn } from '../../lib/utils';
import { PendingApprovals } from '../../components/Platform/PendingApprovals';
import { CreatePartyModal } from '../../components/Platform/CreatePartyModal';
import { Breadcrumbs } from '../../components/Navigation/Breadcrumbs';
import { EntityAvatarUpload } from '../../components/Platform/EntityAvatarUpload';
import { UserAvatarWithPresence, UserProfileTrigger } from '../../components/Common/UserPresenceBadge';
import { PartyProfileTrigger } from '../../context/PartyProfileCardContext';
import { useRegisterActiveEntity } from '../../context/ActiveEntityContext';
import { Modal } from '../../components/UI/TabsAndModal';
import { Button, Badge, AuroraSpinner } from '../../components/UI/Primitives';
import { toast } from 'sonner';

const CLASSIFICATION_STYLES: Record<string, string> = {
  CLIENT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  CUSTOMER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  SUPPLIER: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  VENDOR: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  PARTNER: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  VIP: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  PROSPECT: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  INVESTOR: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  CONTRACTOR: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export const PeopleOrgDirectory = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'split' | 'cards'>('table');
  const [entities, setEntities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    peopleCount: 0,
    orgCount: 0,
    verifiedCount: 0,
    flaggedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    type: 'ALL' as 'ALL' | 'PERSON' | 'ORGANIZATION',
    status: 'ALL' as string,
    classification: 'ALL' as string,
    accountOwnerMemberId: 'ALL' as string,
    isStarred: false,
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Split inspector state
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<any | null>(null);
  const [inspectorLinked, setInspectorLinked] = useState<any | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Register active inspector entity for AI assistant when split view is open
  const activeInspectorContext = useMemo(() => {
    if (viewMode !== 'split' || !inspectorData || !inspectorData.id) return null;
    const isPerson = inspectorData.partyType === 'PERSON' || inspectorData.type === 'INDIVIDUAL';
    const domain = isPerson ? ('directory_person' as const) : ('directory_org' as const);
    const title = inspectorData.displayName || (isPerson ? `${inspectorData.person?.firstName || ''} ${inspectorData.person?.lastName || ''}`.trim() : 'Directory Entity');
    const subtitle = isPerson
      ? (inspectorData.person?.jobTitle ? `${inspectorData.person.jobTitle}${inspectorData.primaryOrganization ? ` at ${inspectorData.primaryOrganization.displayName}` : ''}` : 'Individual Contact')
      : (inspectorData.organization?.industry || 'Organization');

    return {
      domain,
      id: String(inspectorData.id),
      title,
      subtitle: `${subtitle} • ${inspectorData.status || 'Active'}`,
      status: inspectorData.status || 'Active',
      keyAttributes: {
        'Entity Type': isPerson ? 'Individual (Person)' : 'Organization (Company)',
        'Code': inspectorData.partyCode || null,
        'Email': inspectorData.email || null,
        'Phone': inspectorData.phone || null,
        'Job Title': inspectorData.person?.jobTitle || null,
        'Organization': inspectorData.primaryOrganization?.displayName || null,
        'Lifecycle Stage': inspectorData.stage || inspectorData.status || null,
        'Lifetime Value': inspectorData.financialSnapshot?.lifetimeValue ? `$${Number(inspectorData.financialSnapshot.lifetimeValue).toLocaleString()}` : null,
        'Outstanding AR': inspectorData.financialSnapshot?.outstandingAR ? `$${Number(inspectorData.financialSnapshot.outstandingAR).toLocaleString()}` : null,
      },
      relatedCounts: {
        documents: inspectorData.linkedSummary?.totalLinked || undefined,
      },
      rawUrl: window.location.pathname + window.location.search,
    };
  }, [viewMode, inspectorData]);

  useRegisterActiveEntity(activeInspectorContext, {
    priority: 20,
    enabled: viewMode === 'split' && Boolean(inspectorData?.id),
  });

  // Deduplication Studio modal
  const [isDedupeModalOpen, setIsDedupeModalOpen] = useState(false);
  const [duplicateClusters, setDuplicateClusters] = useState<any[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [mergingClusterId, setMergingClusterId] = useState<string | null>(null);
  const [selectedMasterByCluster, setSelectedMasterByCluster] = useState<Record<string, string>>({});
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);
  const [runningProcedure, setRunningProcedure] = useState(false);
  const [dedupeSchedule, setDedupeSchedule] = useState<{
    enabled: boolean;
    frequency: 'OFF' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    time?: string;
    autoMergeExact: boolean;
    sensitivity: 'STRICT' | 'BALANCED' | 'AGGRESSIVE';
    lastRunAt?: string;
    nextRunAt?: string;
    lastRunStats?: {
      clustersFound: number;
      partiesScanned: number;
      autoMergedCount: number;
      timestamp: string;
      durationMs: number;
    };
  }>({
    enabled: true,
    frequency: 'DAILY',
    time: '02:00',
    autoMergeExact: false,
    sensitivity: 'BALANCED',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 260);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const fetchEntities = useCallback(
    async (pageNum = 1, currentLimit = pageSize) => {
      const token = getToken();
      if (!tenant?.id || !token) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(currentLimit),
        });
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (filters.type !== 'ALL') params.set('partyType', filters.type);
        if (filters.status !== 'ALL') params.set('status', filters.status);
        if (filters.classification !== 'ALL') params.set('classification', filters.classification);
        if (filters.accountOwnerMemberId !== 'ALL')
          params.set('accountOwnerMemberId', filters.accountOwnerMemberId);
        if (filters.isStarred) params.set('isStarred', 'true');

        const res = await fetch(`${API_BASE_URL}/api/people-organisations?${params.toString()}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          setEntities([]);
          setTotalCount(0);
          setTotalPages(1);
        } else {
          const newEntities = Array.isArray(data) ? data : data.parties || [];
          if (data.stats) {
            setStats(data.stats);
          }
          setEntities(newEntities);
          const total = data.total ?? newEntities.length;
          setTotalCount(total);
          setTotalPages(data.totalPages ?? Math.max(1, Math.ceil(total / currentLimit)));
          setHasMore(data.total ? pageNum * currentLimit < data.total : false);
          if (viewMode === 'split' && !selectedInspectorId && newEntities.length > 0) {
            setSelectedInspectorId(newEntities[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch entities:', err);
      } finally {
        setLoading(false);
      }
    },
    [tenant?.id, getToken, debouncedSearch, filters, getHeaders, viewMode, selectedInspectorId, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchEntities(page, pageSize);
  }, [page, pageSize, debouncedSearch, filters, tenant?.id, session?.access_token]);

  useEffect(() => {
    const handler = () => fetchEntities(page, pageSize);
    window.addEventListener('aurora:directory-updated', handler);
    return () => window.removeEventListener('aurora:directory-updated', handler);
  }, [fetchEntities, page, pageSize]);

  // Fetch Split Inspector 360° details when selectedInspectorId changes
  useEffect(() => {
    if (viewMode !== 'split' || !selectedInspectorId || !tenant?.id) return;
    let cancelled = false;
    const loadInspector = async () => {
      setInspectorLoading(true);
      try {
        const [cardRes, linkedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/people-organisations/${selectedInspectorId}/profile-card`, {
            headers: getHeaders(),
          }),
          fetch(
            `${API_BASE_URL}/api/people-organisations/${selectedInspectorId}/linked-everything?includeRollup=true`,
            { headers: getHeaders() }
          ),
        ]);
        if (!cancelled) {
          if (cardRes.ok) setInspectorData(await cardRes.json());
          if (linkedRes.ok) setInspectorLinked(await linkedRes.json());
        }
      } catch (err) {
        console.error('Failed to load split inspector:', err);
      } finally {
        if (!cancelled) setInspectorLoading(false);
      }
    };
    loadInspector();
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedInspectorId, tenant?.id, getHeaders]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntities(nextPage, true);
  };

  const handleToggleStar = async (e: React.MouseEvent, entity: any) => {
    e.stopPropagation();
    const nextStar = !entity.isStarred;
    setEntities((prev) =>
      prev.map((item) => (item.id === entity.id ? { ...item, isStarred: nextStar } : item))
    );
    try {
      await fetch(`${API_BASE_URL}/api/people-organisations/${entity.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isStarred: nextStar }),
      });
    } catch {
      toast.error('Failed to update star status');
    }
  };

  const handleCopy = (e: React.MouseEvent, value: string, idKey: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedId(idKey);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Deduplication Studio & Schedule Automation
  const fetchDedupeSchedule = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/dedupe-schedule`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDedupeSchedule(data);
      }
    } catch (err) {
      console.error('Failed to fetch dedupe schedule:', err);
    }
  };

  const handleUpdateSchedule = async (updates: Partial<typeof dedupeSchedule>) => {
    try {
      const next = { ...dedupeSchedule, ...updates };
      setDedupeSchedule(next);
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/dedupe-schedule`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setDedupeSchedule(data);
        toast.success('Deduplication procedure schedule updated');
      }
    } catch (err) {
      toast.error('Failed to update dedupe schedule');
    }
  };

  const handleRunDedupeProcedure = async () => {
    setRunningProcedure(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/dedupe-schedule/run`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run procedure');

      setDuplicateClusters(data.clusters || []);
      const initialMasters: Record<string, string> = {};
      (data.clusters || []).forEach((c: any) => {
        if (c.parties?.[0]?.id) {
          initialMasters[c.id] = c.parties[0].id;
        }
      });
      setSelectedMasterByCluster(initialMasters);

      toast.success(
        `Dedupe procedure completed! Scanned ${data.partiesScanned} records, auto-merged ${data.autoMergedCount || 0}, ${data.clustersFound} clusters remaining.`
      );
      fetchDedupeSchedule();
      fetchEntities(1, false);
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Procedure run failed');
    } finally {
      setRunningProcedure(false);
    }
  };

  const handleOpenDedupeStudio = async () => {
    setIsDedupeModalOpen(true);
    setLoadingDuplicates(true);
    fetchDedupeSchedule();
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/duplicates`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const clusters = data.clusters || [];
        setDuplicateClusters(clusters);
        const initialMasters: Record<string, string> = {};
        clusters.forEach((c: any) => {
          if (c.parties?.[0]?.id) {
            initialMasters[c.id] = c.parties[0].id;
          }
        });
        setSelectedMasterByCluster(initialMasters);
      }
    } catch (err) {
      toast.error('Failed to scan directory for duplicates');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleMergeCluster = async (cluster: any) => {
    const masterId = selectedMasterByCluster[cluster.id] || cluster.parties?.[0]?.id;
    const duplicatePartyIds = (cluster.parties || [])
      .map((p: any) => p.id)
      .filter((id: string) => id !== masterId);

    if (!masterId || duplicatePartyIds.length === 0) return;

    setMergingClusterId(cluster.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${masterId}/merge`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ duplicatePartyIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');

      toast.success(
        `Merged ${duplicatePartyIds.length} duplicate record(s) into master entity & re-linked all platform records`
      );
      setDuplicateClusters((prev) => prev.filter((c) => c.id !== cluster.id));
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      fetchEntities(1, false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to merge entities');
    } finally {
      setMergingClusterId(null);
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length && entities.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e) => e.id)));
    }
  };

  const toggleSelectEntity = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const executeBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
          payload,
        }),
      });
      if (!res.ok) throw new Error('Bulk operation failed');
      toast.success(`Updated ${selectedIds.size} directory entities`);
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      fetchEntities(1, false);
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (entities.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = [
      'Party Code',
      'Display Name',
      'Type',
      'Status',
      'Email',
      'Phone',
      'Mobile',
      'Website',
      'Job Title / Structure',
      'Primary Org / Tax ID',
      'Classifications',
      'Account Owner',
      'Created At',
    ];
    const rows = entities.map((e) => [
      e.partyCode || '',
      e.displayName || '',
      e.partyType || '',
      e.status || '',
      e.email || '',
      e.phone || '',
      e.mobile || '',
      e.website || '',
      e.partyType === 'PERSON'
        ? e.person?.jobTitle || ''
        : e.organization?.orgStructureType || '',
      e.partyType === 'PERSON'
        ? e.person?.primaryOrgName || ''
        : e.organization?.taxIdentifier || '',
      Array.isArray(e.classifications) ? e.classifications.join(';') : '',
      e.accountOwner?.name || '',
      e.createdAt ? new Date(e.createdAt).toISOString() : '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aurora-directory-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${entities.length} records to CSV`);
  };

  const activeFilterCount =
    (filters.type !== 'ALL' ? 1 : 0) +
    (filters.status !== 'ALL' ? 1 : 0) +
    (filters.classification !== 'ALL' ? 1 : 0) +
    (filters.accountOwnerMemberId !== 'ALL' ? 1 : 0) +
    (filters.isStarred ? 1 : 0);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 h-full bg-transparent overflow-hidden relative">
      {/* Tier 1: Consistent Breadcrumbs & Context Action Bar */}
      <div className="sticky top-0 z-30 h-9 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-5 shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight">
              Master Directory
            </span>
          </div>
        </div>

        {/* Center/Right: View Switcher, Dedupe, Export, and Primary Create Action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Deduplication & Merge Studio */}
          <button
            type="button"
            onClick={handleOpenDedupeStudio}
            className="flex items-center gap-1.5 h-7 px-2.5 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all shadow-2xs group shrink-0 cursor-pointer select-none"
            title="Scan & Merge Duplicate Entities"
          >
            <GitMerge size={12} className="text-indigo-500 group-hover:scale-105 transition-transform shrink-0" />
            <span className="hidden md:inline text-[11px]">Dedupe</span>
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center justify-center w-7 h-7 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all shadow-2xs group shrink-0 cursor-pointer select-none"
            title="Export Directory to CSV"
          >
            <Download size={13} className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
          </button>

          {/* View Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              className={cn(
                'p-1 rounded-md transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <LayoutList size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('split');
                if (!selectedInspectorId && entities.length > 0) {
                  setSelectedInspectorId(entities[0].id);
                }
              }}
              title="Split Inspector View"
              className={cn(
                'p-1 rounded-md transition-all cursor-pointer',
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <Columns size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards Grid View"
              className={cn(
                'p-1 rounded-md transition-all cursor-pointer',
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <LayoutGrid size={13} />
            </button>
          </div>

          {/* Primary Create Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer select-none active:scale-[0.98]"
          >
            <Plus size={13} />
            <span>Add Entity</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Stripped-Back Edge-to-Edge Toolbar */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md px-5 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
            <input
              type="text"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg pl-8 pr-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 w-52 sm:w-64 transition-all"
            />
          </div>

          {/* Entity Type Filter Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
            {(['ALL', 'PERSON', 'ORGANIZATION'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, type: t }))}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                  filters.type === t
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                {t === 'ALL' ? 'All' : t === 'PERSON' ? 'People' : 'Orgs'}
              </button>
            ))}
          </div>

          {/* Classification Tag Filter Dropdown */}
          <div className="relative">
            <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <select
              value={filters.classification}
              onChange={(e) => {
                setActiveTab('all');
                setFilters((f) => ({ ...f, classification: e.target.value }));
              }}
              className={cn(
                "h-7.5 pl-7 pr-7 rounded-lg text-xs font-medium border appearance-none transition-all cursor-pointer",
                filters.classification !== 'ALL'
                  ? "bg-indigo-50/60 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500 font-semibold"
                  : "bg-white dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
              )}
            >
              <option value="ALL">All Tags</option>
              <option value="CLIENT">Clients</option>
              <option value="SUPPLIER">Suppliers</option>
              <option value="PARTNER">Partners</option>
              <option value="PROSPECT">Prospects</option>
              <option value="VIP">VIP</option>
              <option value="CONTRACTOR">Contractors</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Starred Filter */}
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, isStarred: !f.isStarred }))}
            title="Show Starred / VIP Entities"
            className={cn(
              'flex h-7.5 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer',
              filters.isStarred
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
            )}
          >
            <Star size={12} className={filters.isStarred ? 'fill-amber-500 text-amber-500' : ''} />
            <span className="hidden sm:inline text-[11px]">Starred</span>
          </button>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex h-7.5 items-center gap-1.5 px-2.5 rounded-lg border transition-all text-xs font-medium cursor-pointer',
                activeFilterCount > 0
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold'
                  : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              )}
            >
              <Filter size={11} />
              <span className="text-[11px]">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-3.5 h-3.5 bg-indigo-600 text-white text-[9px] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="absolute top-full left-0 mt-1.5 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Directory Filters
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          type: 'ALL',
                          status: 'ALL',
                          classification: 'ALL',
                          accountOwnerMemberId: 'ALL',
                          isStarred: false,
                        })
                      }
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 uppercase cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>

                  <FilterGroup
                    label="Entity Status"
                    options={[
                      { id: 'ALL', label: 'All' },
                      { id: 'VERIFIED', label: 'Verified' },
                      { id: 'ACTIVE', label: 'Active' },
                      { id: 'PENDING_REVIEW', label: 'Pending' },
                      { id: 'FLAGGED', label: 'Flagged' },
                      { id: 'INACTIVE', label: 'Inactive' },
                    ]}
                    value={filters.status}
                    onChange={(v) => setFilters({ ...filters, status: v })}
                  />

                  <FilterGroup
                    label="Classification"
                    options={[
                      { id: 'ALL', label: 'All' },
                      { id: 'CLIENT', label: 'Client' },
                      { id: 'SUPPLIER', label: 'Supplier' },
                      { id: 'PARTNER', label: 'Partner' },
                      { id: 'PROSPECT', label: 'Prospect' },
                      { id: 'VIP', label: 'VIP' },
                      { id: 'INVESTOR', label: 'Investor' },
                      { id: 'CONTRACTOR', label: 'Contractor' },
                    ]}
                    value={filters.classification}
                    onChange={(v) => setFilters({ ...filters, classification: v })}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pending Approvals Toggle if any exist */}
          {(stats.pendingCount > 0 || stats.flaggedCount > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'pending' ? 'all' : 'pending')}
              className={cn(
                'flex h-7.5 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                activeTab === 'pending'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              )}
            >
              <Inbox size={12} className="text-amber-500" />
              <span className="text-[11px]">Pending ({stats.pendingCount + stats.flaggedCount})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500 shrink-0">
          <span>
            <strong className="text-zinc-800 dark:text-zinc-200">{totalCount}</strong> total
          </span>
          <button
            type="button"
            onClick={() => fetchEntities(page, pageSize)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Ribbon */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-zinc-950/90 dark:bg-zinc-900/95 backdrop-blur-xl text-white border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-3 z-50 max-w-2xl"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-[11px] font-black">
                {selectedIds.size} Selected
              </span>
              <span className="text-xs font-medium text-zinc-300 hidden sm:inline">
                Batch updates:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => executeBulkAction('UPDATE_STATUS', { status: 'VERIFIED' })}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={12} className="text-emerald-400" /> Verify
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => executeBulkAction('ADD_CLASSIFICATION', { classification: 'CLIENT' })}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Tag size={12} className="text-indigo-300" /> Client
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => executeBulkAction('ADD_CLASSIFICATION', { classification: 'VIP' })}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-amber-300" /> VIP
              </button>
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} selected directory records?`)) {
                    executeBulkAction('DELETE');
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-zinc-400 hover:text-white px-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Full Bleed Edge to Edge */}
      <div className="flex-1 w-full min-h-0 flex flex-col relative z-10 overflow-hidden">
        {activeTab === 'pending' ? (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <PendingApprovals onRefresh={() => fetchEntities(1, false)} />
          </div>
        ) : viewMode === 'table' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar min-h-0">
              <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
                <tr>
                  <th className="py-2.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={entities.length > 0 && selectedIds.size === entities.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < entities.length;
                      }}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                      title={selectedIds.size === entities.length && entities.length > 0 ? "Deselect all" : "Select all"}
                    />
                  </th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3 w-28">Entity Key</th>
                  <th className="py-2.5 px-3 w-32">Entity Type</th>
                  <th className="py-2.5 px-3">Role / Primary Org / Tax ID</th>
                  <th className="py-2.5 px-3">Contact Channels</th>
                  <th className="py-2.5 px-3">Classifications</th>
                  <th className="py-2.5 px-3">Account Owner</th>
                  <th className="py-2.5 px-3">Linked Activity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 pr-5 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <AuroraSpinner />
                            <span className="text-xs text-zinc-500">Loading directory entities...</span>
                          </div>
                        </td>
                      </tr>
                    ) : entities.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-20 text-center">
                          <div className="max-w-xs mx-auto space-y-2">
                            <Users size={32} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                              No matching directory records
                            </p>
                            <p className="text-xs text-zinc-500">
                              Try adjusting your search or classification filters, or add a new entity.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      entities.map((entity) => {
                        const isPerson = entity.partyType === 'PERSON';
                        const displayName =
                          entity.displayName ||
                          (isPerson
                            ? `${entity.person?.firstName || ''} ${entity.person?.lastName || ''}`.trim()
                            : entity.organization?.legalName || 'Unnamed Entity');
                        const relCount =
                          (entity._count?.sourceRelationships || 0) +
                          (entity._count?.targetRelationships || 0);
                        const finCount =
                          (entity._count?.invoices || 0) +
                          (entity._count?.bills || 0) +
                          (entity._count?.posOrders || 0) +
                          (entity._count?.paymentTransactions || 0);

                        return (
                          <tr
                            key={entity.id}
                            onClick={() => navigate(`/workspace/apps/directory/${entity.id}`)}
                            className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer"
                          >
                            <td
                              className="py-3 pl-5 pr-2"
                              onClick={(e) => toggleSelectEntity(e, entity.id)}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(entity.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelectEntity(e as any, entity.id);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleStar(e, entity)}
                                  className="text-zinc-300 hover:text-amber-500 transition-colors"
                                >
                                  <Star
                                    size={13}
                                    className={
                                      entity.isStarred ? 'fill-amber-500 text-amber-500' : ''
                                    }
                                  />
                                </button>
                              </div>
                            </td>

                            {/* Entity Name & Avatar */}
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              <PartyProfileTrigger
                                partyId={entity.id}
                                className="flex items-center gap-3 text-left group/entity"
                              >
                                {isPerson ? (
                                  <UserAvatarWithPresence
                                    name={displayName}
                                    avatarUrl={entity.avatarUrl || entity.person?.avatarUrl}
                                    status="AVAILABLE"
                                    size="sm"
                                  />
                                ) : entity.avatarUrl ? (
                                  <img
                                    src={entity.avatarUrl}
                                    alt={displayName}
                                    className="w-8 h-8 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-900"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Building2 size={15} />
                                  </div>
                                )}
                                <span className="font-bold text-zinc-900 dark:text-white group-hover/entity:text-indigo-600 dark:group-hover/entity:text-indigo-400 transition-colors truncate">
                                  {displayName}
                                </span>
                              </PartyProfileTrigger>
                            </td>

                            {/* Entity Key Column */}
                            <td className="py-3 px-3">
                              {entity.partyCode ? (
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold border border-zinc-200/60 dark:border-zinc-700/60 inline-block">
                                  {entity.partyCode}
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-mono text-xs">—</span>
                              )}
                            </td>

                            {/* Entity Type Column */}
                            <td className="py-3 px-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1",
                                  isPerson
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                )}
                              >
                                {isPerson ? 'Person' : 'Organisation'}
                              </span>
                            </td>

                            {/* Role / Primary Org / Tax ID */}
                            <td className="py-3 px-3">
                              {isPerson ? (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                    {entity.person?.jobTitle || '—'}
                                  </p>
                                  {entity.person?.primaryOrgPartyId ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <PartyProfileTrigger
                                        partyId={entity.person.primaryOrgPartyId}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                      >
                                        <Building2 size={10} />
                                        <span>{entity.person.primaryOrgName || 'Primary Org'}</span>
                                      </PartyProfileTrigger>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400">
                                      {entity.person?.primaryOrgName || 'Independent'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                    {entity.organization?.tradingName ||
                                      entity.organization?.orgStructureType ||
                                      'Corporate Entity'}
                                  </p>
                                  {entity.organization?.taxIdentifier && (
                                    <p className="text-[10px] font-mono text-zinc-500">
                                      Tax ID: {entity.organization.taxIdentifier}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Contact Channels */}
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-1">
                                {entity.email ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          `/workspace/apps/inbox?composeTo=${encodeURIComponent(
                                            entity.email
                                          )}&partyId=${entity.id}`
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[170px]"
                                      title="Compose email in Aurora Inbox"
                                    >
                                      <Mail size={11} className="text-zinc-400 shrink-0" />
                                      <span className="truncate">{entity.email}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleCopy(e, entity.email, `email-${entity.id}`)
                                      }
                                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 p-0.5 transition-opacity"
                                    >
                                      {copiedId === `email-${entity.id}` ? (
                                        <Check size={10} className="text-emerald-500" />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                    </button>
                                  </div>
                                ) : null}
                                {entity.phone || entity.mobile ? (
                                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                    <Phone size={11} className="text-zinc-400 shrink-0" />
                                    <span>{entity.phone || entity.mobile}</span>
                                  </div>
                                ) : !entity.email ? (
                                  <span className="text-[11px] text-zinc-400">—</span>
                                ) : null}
                              </div>
                            </td>

                            {/* Classifications */}
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {Array.isArray(entity.classifications) &&
                                entity.classifications.length > 0 ? (
                                  entity.classifications.slice(0, 3).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className={cn(
                                        'px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border',
                                        CLASSIFICATION_STYLES[tag] ||
                                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                      )}
                                    >
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-zinc-400">—</span>
                                )}
                              </div>
                            </td>

                            {/* Account Owner */}
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              {entity.accountOwner ? (
                                <UserProfileTrigger
                                  userId={entity.accountOwner.id}
                                  className="inline-flex items-center gap-2 hover:opacity-80"
                                >
                                  <UserAvatarWithPresence
                                    name={entity.accountOwner.name}
                                    avatarUrl={entity.accountOwner.avatarUrl}
                                    status="AVAILABLE"
                                    size="xs"
                                  />
                                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[110px]">
                                    {entity.accountOwner.name}
                                  </span>
                                </UserProfileTrigger>
                              ) : (
                                <span className="text-[10px] text-zinc-400">Unassigned</span>
                              )}
                            </td>

                            {/* 360° Activity Counts */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300"
                                  title="Connected Relationships"
                                >
                                  <Link2 size={10} className="text-indigo-500" />
                                  {relCount}
                                </span>
                                {finCount > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                                    title="Invoices, Bills & Orders"
                                  >
                                    <DollarSign size={10} />
                                    {finCount}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full',
                                    entity.status === 'VERIFIED' || entity.status === 'ACTIVE'
                                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                      : entity.status === 'PENDING_REVIEW'
                                      ? 'bg-amber-500'
                                      : entity.status === 'FLAGGED'
                                      ? 'bg-rose-500'
                                      : 'bg-zinc-400'
                                  )}
                                />
                                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                                  {String(entity.status || 'ACTIVE')
                                    .replace(/_/g, ' ')
                                    .toLowerCase()}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 pl-3 pr-5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/workspace/apps/directory/${entity.id}`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                              >
                                <span>Profile</span>
                                <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sticky Pagination & Count Footer - Matching Table.tsx and sidebar alignment */}
              <div className="flex flex-row items-center justify-between border-t border-zinc-200 dark:border-zinc-800 gap-2 bg-zinc-50 dark:bg-zinc-900 shrink-0 select-none h-12 px-6">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
                    Showing <span className="text-zinc-900 dark:text-zinc-100">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="text-zinc-900 dark:text-zinc-100">{Math.min(page * pageSize, totalCount)}</span> of <span className="text-zinc-900 dark:text-zinc-100">{totalCount}</span> records
                  </div>

                  <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                    >
                      {[25, 50, 100].map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
                    disabled={page === 1 || loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPage((prev) => Math.max(1, prev - 1));
                    }}
                    title="Previous page"
                  >
                    <ChevronLeft size={13} />
                  </Button>
                  
                  <div className="flex items-center gap-0.5 mx-0.5 sm:mx-1">
                    {pageNumbers.map((p, idx) => {
                      if (typeof p === 'string') {
                        return <span key={`ellipsis-${idx}`} className="text-zinc-400 px-0.5 text-xs select-none">...</span>;
                      }
                      const pageNum = p as number;
                      return (
                        <button
                          key={pageNum}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPage(pageNum);
                          }}
                          className={cn(
                            'px-1.5 rounded-md font-bold transition-all cursor-pointer select-none h-7 min-w-[28px] text-xs',
                            page === pageNum 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
                    disabled={page >= totalPages || loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                    title="Next page"
                  >
                    <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ) : viewMode === 'split' ? (
              /* SPLIT-PANE 360° INSPECTOR VIEW */
              <div className="flex-1 flex divide-x divide-zinc-200/70 dark:divide-zinc-800/70 overflow-hidden min-h-0">
                {/* Left Master List */}
                <div className="w-full md:w-2/5 lg:w-96 overflow-y-auto divide-y divide-zinc-200/50 dark:divide-zinc-800/50 custom-scrollbar">
                  {entities.map((entity) => {
                    const isPerson = entity.partyType === 'PERSON';
                    const displayName =
                      entity.displayName ||
                      (isPerson
                        ? `${entity.person?.firstName || ''} ${entity.person?.lastName || ''}`.trim()
                        : entity.organization?.legalName || 'Unnamed');
                    const isSelected = selectedInspectorId === entity.id;

                    return (
                      <div
                        key={entity.id}
                        onClick={() => setSelectedInspectorId(entity.id)}
                        className={cn(
                          'p-3.5 flex items-center gap-3 cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border-l-4 border-l-indigo-600'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                        )}
                      >
                        {entity.avatarUrl ? (
                          <img
                            src={entity.avatarUrl}
                            alt={displayName}
                            className="w-9 h-9 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-900"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center border shrink-0',
                              isPerson
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                            )}
                          >
                            {isPerson ? <User size={16} /> : <Building2 size={16} />}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {displayName}
                            </p>
                            {entity.partyCode && (
                              <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                                {entity.partyCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {isPerson
                              ? entity.person?.jobTitle || entity.email || 'Individual'
                              : entity.organization?.industry ||
                                entity.organization?.orgStructureType ||
                                'Organisation'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Live 360° Inspector */}
                <div className="hidden md:flex flex-1 flex-col overflow-y-auto p-6 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-950/20">
                  {inspectorLoading || !inspectorData ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <AuroraSpinner />
                      <span className="text-xs">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Inspector Header */}
                      <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-4">
                          <EntityAvatarUpload
                            avatarUrl={inspectorData.avatarUrl}
                            partyType={inspectorData.partyType}
                            displayName={inspectorData.displayName}
                            size="md"
                            onChange={async (nextUrl) => {
                              try {
                                const res = await fetch(
                                  `${API_BASE_URL}/api/people-organisations/${inspectorData.id}`,
                                  {
                                    method: 'PATCH',
                                    headers: getHeaders(),
                                    body: JSON.stringify({ avatarUrl: nextUrl }),
                                  }
                                );
                                if (res.ok) {
                                  const updated = await res.json();
                                  setInspectorData(updated);
                                  setEntities((prev) =>
                                    prev.map((e) =>
                                      e.id === inspectorData.id ? { ...e, avatarUrl: nextUrl } : e
                                    )
                                  );
                                  window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
                                  toast.success(
                                    nextUrl ? 'Profile picture updated' : 'Profile picture removed'
                                  );
                                }
                              } catch {
                                toast.error('Failed to update profile picture');
                              }
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                                {inspectorData.displayName}
                              </h2>
                              {inspectorData.partyCode && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {inspectorData.partyCode}
                                </span>
                              )}
                              <Badge variant="indigo">{inspectorData.status}</Badge>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {inspectorData.partyType === 'PERSON'
                                ? `${inspectorData.person?.jobTitle || 'Individual'}${
                                    inspectorData.primaryOrganization
                                      ? ` at ${inspectorData.primaryOrganization.displayName}`
                                      : ''
                                  }`
                                : `${inspectorData.organization?.orgStructureType || 'Organisation'} • ${
                                    inspectorData.organization?.industry || 'General'
                                  }`}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/workspace/apps/directory/${inspectorData.id}`)
                          }
                          className="gap-1.5"
                        >
                          <span>Full Profile</span>
                          <ExternalLink size={13} />
                        </Button>
                      </div>

                      {/* Vital Pulse Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">
                            Anything Linked
                          </p>
                          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {inspectorLinked?.counts?.total ||
                              inspectorData.linkedSummary?.totalLinked ||
                              0}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">
                            Module Records
                          </p>
                          <p className="text-lg font-black text-zinc-900 dark:text-white mt-0.5">
                            {inspectorLinked?.counts?.moduleRecords || 0}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">
                            Lifetime Revenue
                          </p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            $
                            {Number(
                              inspectorData.financialSnapshot?.lifetimeValue || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">
                            Open AR Balance
                          </p>
                          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                            $
                            {Number(
                              inspectorData.financialSnapshot?.outstandingAR || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Anything Linked Preview Stream */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                            <Layers size={14} className="text-indigo-500" />
                            Anything Linked Across Platform (
                            {inspectorLinked?.items?.length || 0})
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {(inspectorLinked?.items || []).slice(0, 12).map((item: any) => (
                            <div
                              key={item.id}
                              onClick={() => item.url && navigate(item.url)}
                              className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-500/40 flex items-center justify-between gap-3 cursor-pointer transition-all"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase">
                                    {item.category?.replace(/_/g, ' ')}
                                  </span>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                    {item.title}
                                  </p>
                                </div>
                                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                              {item.amount !== undefined && item.amount !== null && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  ${Number(item.amount).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))}
                          {(!inspectorLinked?.items || inspectorLinked.items.length === 0) && (
                            <p className="text-xs text-zinc-400 italic py-4">
                              No linked platform records yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CARDS GRID VIEW */
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 custom-scrollbar content-start">
                {entities.map((entity) => {
                  const isPerson = entity.partyType === 'PERSON';
                  const displayName =
                    entity.displayName ||
                    (isPerson
                      ? `${entity.person?.firstName || ''} ${entity.person?.lastName || ''}`.trim()
                      : entity.organization?.legalName || 'Unnamed');

                  return (
                    <div
                      key={entity.id}
                      onClick={() => navigate(`/workspace/apps/directory/${entity.id}`)}
                      className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-500/40 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <PartyProfileTrigger
                              partyId={entity.id}
                              className="flex items-center gap-3 text-left"
                            >
                              {entity.avatarUrl ? (
                                <img
                                  src={entity.avatarUrl}
                                  alt={displayName}
                                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white dark:bg-zinc-900"
                                />
                              ) : (
                                <div
                                  className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                                    isPerson
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                                  )}
                                >
                                  {isPerson ? <User size={18} /> : <Building2 size={18} />}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate hover:text-indigo-600">
                                  {displayName}
                                </p>
                                <p className="text-[10px] text-zinc-500 truncate">
                                  {isPerson
                                    ? entity.person?.jobTitle || 'Individual'
                                    : entity.organization?.industry || 'Organisation'}
                                </p>
                              </div>
                            </PartyProfileTrigger>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, entity)}
                            className="text-zinc-300 hover:text-amber-500"
                          >
                            <Star
                              size={14}
                              className={entity.isStarred ? 'fill-amber-500 text-amber-500' : ''}
                            />
                          </button>
                        </div>

                        <div className="space-y-1 text-[11px] text-zinc-500">
                          {entity.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={11} className="text-zinc-400 shrink-0" />
                              <span className="truncate">{entity.email}</span>
                            </div>
                          )}
                          {(entity.phone || entity.mobile) && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={11} className="text-zinc-400 shrink-0" />
                              <span>{entity.phone || entity.mobile}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {(entity.classifications || []).slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-600 dark:text-zinc-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {entity.partyCode}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
      </div>

      {/* Create Party Modal */}
      <CreatePartyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchEntities(1, false)}
      />

      {/* Deduplication & Merge Studio Modal */}
      <Modal
        isOpen={isDedupeModalOpen}
        onClose={() => setIsDedupeModalOpen(false)}
        title="Directory Deduplication & Master Entity Merge Studio"
        size="xl"
      >
        <div className="space-y-4 py-2">
          {/* Deduplication Procedure Schedule & Action Bar */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  Procedure Frequency:
                </span>
                <select
                  value={dedupeSchedule.frequency}
                  onChange={(e) =>
                    handleUpdateSchedule({
                      frequency: e.target.value as any,
                      enabled: e.target.value !== 'OFF',
                    })
                  }
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="OFF">Disabled (Manual Only)</option>
                  <option value="HOURLY">Every Hour</option>
                  <option value="EVERY_6_HOURS">Every 6 Hours</option>
                  <option value="DAILY">Daily (at {dedupeSchedule.time || '02:00'})</option>
                  <option value="WEEKLY">Weekly (Sun at {dedupeSchedule.time || '02:00'})</option>
                  <option value="MONTHLY">Monthly (1st of month)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleConfig(!showScheduleConfig)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                    showScheduleConfig
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50'
                  )}
                >
                  <Settings2 size={12} />
                  <span>Configure Schedule</span>
                </button>

                <Button
                  size="sm"
                  variant="primary"
                  loading={runningProcedure}
                  onClick={handleRunDedupeProcedure}
                  className="gap-1.5"
                >
                  <Play size={12} className={cn(runningProcedure ? 'hidden' : 'fill-current')} />
                  <span>Run Procedure Now</span>
                </Button>
              </div>
            </div>

            {/* Expandable Configuration Drawer */}
            {showScheduleConfig && (
              <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Scheduled Time
                  </label>
                  <input
                    type="time"
                    value={dedupeSchedule.time || '02:00'}
                    onChange={(e) => handleUpdateSchedule({ time: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Matching Sensitivity
                  </label>
                  <select
                    value={dedupeSchedule.sensitivity || 'BALANCED'}
                    onChange={(e) => handleUpdateSchedule({ sensitivity: e.target.value as any })}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-900 dark:text-white cursor-pointer"
                  >
                    <option value="STRICT">Strict (Tax ID & Email Only)</option>
                    <option value="BALANCED">Balanced (+ Phone & Clean Name)</option>
                    <option value="AGGRESSIVE">Aggressive (Phonetic Name Match)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={dedupeSchedule.autoMergeExact}
                      onChange={(e) => handleUpdateSchedule({ autoMergeExact: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      Auto-Merge 98%+ exact matches
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Run History / Next Run Status Badge */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/40 dark:border-zinc-800/40 gap-2">
              <div className="flex items-center gap-3">
                <span>
                  Last Run:{' '}
                  <strong className="text-zinc-700 dark:text-zinc-300">
                    {dedupeSchedule.lastRunAt
                      ? new Date(dedupeSchedule.lastRunAt).toLocaleString()
                      : 'Never run'}
                  </strong>
                </span>
                {dedupeSchedule.lastRunStats && (
                  <span className="text-zinc-400">
                    ({dedupeSchedule.lastRunStats.partiesScanned} scanned,{' '}
                    {dedupeSchedule.lastRunStats.autoMergedCount || 0} merged,{' '}
                    {dedupeSchedule.lastRunStats.clustersFound} flagged)
                  </span>
                )}
              </div>
              {dedupeSchedule.nextRunAt && dedupeSchedule.frequency !== 'OFF' && (
                <span>
                  Next Run:{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {new Date(dedupeSchedule.nextRunAt).toLocaleString()}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
            <GitMerge size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <strong className="text-zinc-900 dark:text-white">
                Transactional Entity Survivorship:
              </strong>{' '}
              Merging a duplicate cluster preserves your chosen Master Entity and automatically re-links all Dynamic Module lookup fields, Relationships, Invoices, Bills, POS Orders, Payments, Universal Notes, Reminders, and Documents.
            </div>
          </div>

          {loadingDuplicates ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <AuroraSpinner />
              <p className="text-xs text-zinc-500">
                Scanning directory for email, tax ID, phone, and fuzzy name collisions...
              </p>
            </div>
          ) : duplicateClusters.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Zero Duplicate Clusters Detected
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                All People and Organisations in your tenant directory have unique identity signatures.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {duplicateClusters.map((cluster) => {
                const masterId =
                  selectedMasterByCluster[cluster.id] || cluster.parties?.[0]?.id;
                return (
                  <div
                    key={cluster.id}
                    className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-500" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Match Reason: {cluster.reason}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                          {cluster.matchValue}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        loading={mergingClusterId === cluster.id}
                        onClick={() => handleMergeCluster(cluster)}
                        className="gap-1.5"
                      >
                        <GitMerge size={13} />
                        Merge into Selected Master
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {(cluster.parties || []).map((p: any) => {
                        const isMaster = p.id === masterId;
                        return (
                          <div
                            key={p.id}
                            onClick={() =>
                              setSelectedMasterByCluster((prev) => ({
                                ...prev,
                                [cluster.id]: p.id,
                              }))
                            }
                            className={cn(
                              'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3',
                              isMaster
                                ? 'bg-white dark:bg-zinc-900 border-indigo-500 ring-2 ring-indigo-500/20'
                                : 'bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-80'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                  {p.displayName}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400">
                                  {p.partyCode}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {p.email || 'No email'} • {p.phone || 'No phone'} • Created{' '}
                                {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0',
                                isMaster
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              )}
                            >
                              {isMaster ? 'Master (Keep)' : 'Duplicate (Merge)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

const FilterGroup = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
            value === opt.id
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

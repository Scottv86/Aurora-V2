import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Inbox, 
  Building2, 
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { cn } from '../../lib/utils';
import { PendingApprovals } from '../../components/Platform/PendingApprovals';
import { Table } from '../../components/UI/Table';
import { CreatePartyModal } from '../../components/Platform/CreatePartyModal';

export const PeopleOrgDirectory = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'PERSON' | 'ORGANIZATION',
    status: 'all' as 'all' | 'ACTIVE' | 'PENDING_REVIEW' | 'INACTIVE',
    origin: 'all' as 'all' | 'HUMAN' | 'SWARM'
  });

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchEntities(1, false);
  }, []);

  const fetchEntities = async (pageNum = 1, append = false) => {
    try {
      setLoading(pageNum === 1 && !append);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?page=${pageNum}&limit=50`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to fetch entities:', data.error);
        if (!append) setEntities([]);
      } else {
        const newEntities = data.parties || data;
        setEntities(prev => {
          if (!append) return newEntities;
          const existingIds = new Set(prev.map(e => e.id));
          const uniqueNew = newEntities.filter((e: any) => !existingIds.has(e.id));
          return [...prev, ...uniqueNew];
        });
        setHasMore(data.total ? (entities.length + newEntities.length < data.total) : (newEntities.length >= 50));
      }
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEntities(nextPage, true);
  };

  const filteredEntities = Array.isArray(entities) ? entities.filter(e => {
    // 1. Name/Search Filter
    const name = e.partyType === 'PERSON' 
      ? `${e.person?.firstName} ${e.person?.lastName}`
      : e.organization?.legalName;
    const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Type Filter
    const matchesType = filters.type === 'all' || e.partyType === filters.type;

    // 3. Status Filter
    const matchesStatus = filters.status === 'all' || e.status === filters.status;

    // 4. Origin Filter
    const isSwarm = !!e.createdBySwarmId;
    const matchesOrigin = filters.origin === 'all' || 
      (filters.origin === 'SWARM' && isSwarm) || 
      (filters.origin === 'HUMAN' && !isSwarm);

    return matchesSearch && matchesType && matchesStatus && matchesOrigin;
  }) : [];

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-transparent overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {/* Header Panel */}
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">People & Organisations</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">
              Centralized management of all internal and external parties, personnel, and organizational structures.
            </p>
          </div>
        </div>

        {/* Toolbar Controls / Actions / Search */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          {activeTab === 'all' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Search directory..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-60 transition-all shadow-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex h-9 items-center gap-2 px-4 rounded-xl border transition-all active:scale-95 shadow-sm text-xs font-bold",
                  activeFilterCount > 0 
                    ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" 
                    : "border-zinc-200/50 bg-white/50 dark:bg-zinc-900/30 text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800/50"
                )}
              >
                <Filter size={14} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 bg-indigo-600 text-white text-[9px] rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Filters</h4>
                      <button 
                        onClick={() => setFilters({ type: 'all', status: 'all', origin: 'all' })}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 uppercase"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="space-y-4">
                      <FilterGroup 
                        label="Entity Type"
                        options={[
                          { id: 'all', label: 'All' },
                          { id: 'PERSON', label: 'Person' },
                          { id: 'ORGANIZATION', label: 'Organisation' }
                        ]}
                        value={filters.type}
                        onChange={(v: any) => setFilters({ ...filters, type: v })}
                      />
                      <FilterGroup 
                        label="Status"
                        options={[
                          { id: 'all', label: 'All' },
                          { id: 'ACTIVE', label: 'Active' },
                          { id: 'PENDING_REVIEW', label: 'Pending' },
                          { id: 'INACTIVE', label: 'Inactive' }
                        ]}
                        value={filters.status}
                        onChange={(v: any) => setFilters({ ...filters, status: v })}
                      />
                      <FilterGroup 
                        label="Origin"
                        options={[
                          { id: 'all', label: 'All' },
                          { id: 'HUMAN', label: 'Human' },
                          { id: 'SWARM', label: 'AI Swarm' }
                        ]}
                        value={filters.origin}
                        onChange={(v: any) => setFilters({ ...filters, origin: v })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/10 shrink-0"
            >
              <Plus size={14} />
              <span>Add Person/Org</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto min-h-0 flex flex-col custom-scrollbar relative z-10">

        {/* Integrated Table Card */}
        <div className="flex-1 bg-white/60 dark:bg-zinc-900/35 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          {/* Integrated Header Controls */}
          <div className="px-6 py-4 border-b border-zinc-200/40 dark:border-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/10 dark:bg-zinc-900/5 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-zinc-150/40 dark:bg-zinc-950/20 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'all' 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Users size={14} />
                <span>All Records</span>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'pending' 
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-550 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Inbox size={14} />
                <span>Pending Approvals</span>
                {Array.isArray(entities) && entities.filter(e => e.status === 'PENDING_REVIEW').length > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[9px] rounded-md leading-none">
                    {entities.filter(e => e.status === 'PENDING_REVIEW').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'all' ? (
                <motion.div
                  key="all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Table 
                    data={filteredEntities.map(e => ({
                      ...e,
                      displayName: e.partyType === 'PERSON' 
                        ? `${e.person?.firstName} ${e.person?.lastName}`
                        : e.organization?.legalName
                    }))}
                    loading={loading}
                    density="compact"
                    onRowClick={(entity) => navigate(`/workspace/platform/people-organisations/${entity.id}`)}
                    className="bg-transparent dark:bg-transparent border-none shadow-none"
                    noContainer={true}
                    columns={[
                      {
                        header: 'Name',
                        sortable: true,
                        sortKey: 'displayName',
                        accessor: (entity: any) => (
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                              entity.partyType === 'PERSON' 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                            }`}>
                              {entity.partyType === 'PERSON' ? <User size={16} /> : <Building2 size={16} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                {entity.displayName}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {entity.partyType === 'PERSON' 
                                  ? 'Individual Personnel' 
                                  : `${entity.organization?.orgStructureType || 'Organization'}`}
                              </p>
                            </div>
                          </div>
                        )
                      },
                      {
                        header: 'Type',
                        sortable: true,
                        sortKey: 'partyType',
                        accessor: (entity) => (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {entity.partyType}
                          </span>
                        )
                      },
                      {
                        header: 'Status',
                        sortable: true,
                        sortKey: 'status',
                        accessor: (entity) => (
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              entity.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                              entity.status === 'PENDING_REVIEW' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                              'bg-zinc-400 shadow-[0_0_8px_rgba(161,161,170,0.5)]'
                            }`} />
                            <span className="text-xs text-zinc-650 dark:text-zinc-350 font-semibold capitalize">
                              {entity.status.replace('_', ' ').toLowerCase()}
                            </span>
                          </div>
                        )
                      },
                      {
                        header: 'Created By',
                        accessor: (entity) => (
                          <div className="flex items-center gap-2 text-zinc-555">
                            {entity.createdBySwarmId ? (
                              <>
                                <div className="w-4 h-4 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-650 dark:text-purple-400">
                                  <ShieldCheck size={10} />
                                </div>
                                <span className="text-[10px] font-semibold text-purple-650 dark:text-purple-400">Department Swarm</span>
                              </>
                            ) : (
                              <>
                                <User size={12} className="text-zinc-400" />
                                <span className="text-[10px] font-medium">Human Operator</span>
                              </>
                            )}
                          </div>
                        )
                      },
                      {
                        header: '',
                        className: 'text-right',
                        accessor: (entity) => (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/workspace/platform/people-organisations/${entity.id}`);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <ChevronRight size={16} />
                          </button>
                        )
                      }
                    ]}
                  />
                  
                  {hasMore && (
                    <div className="flex justify-center py-6 border-t border-white/10 dark:border-white/5 bg-white/5 dark:bg-zinc-950/20">
                      <button 
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-6 py-2.5 bg-white dark:bg-white/5 dark:backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all disabled:opacity-50 shadow-md"
                      >
                        {loading ? 'Loading...' : 'Load More Records'}
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6"
                >
                  <PendingApprovals onRefresh={fetchEntities} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      <CreatePartyModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchEntities}
      />
      </div>
    </div>
  );
};



const FilterGroup = ({ label, options, value, onChange }: { 
  label: string, 
  options: { id: string, label: string }[], 
  value: string, 
  onChange: (id: string) => void 
}) => (
  <div className="space-y-2">
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
            value === opt.id
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

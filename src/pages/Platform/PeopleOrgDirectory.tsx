import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/UI/PageHeader';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  GitBranch, 
  Inbox, 
  Building2, 
  User,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { RelationshipGraph } from '../../components/Platform/RelationshipGraph';
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

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to fetch entities:', data.error);
        setEntities([]);
      } else {
        setEntities(data);
      }
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setLoading(false);
    }
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
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="People & Organisations"
        description="Centralized management of all internal and external parties, personnel, and organizational structures."
        actions={
          <div className="flex items-center gap-3 relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-sm font-bold transition-all",
                activeFilterCount > 0 
                  ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" 
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Filter size={18} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white text-[10px] rounded-full">
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
                  className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 space-y-4"
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

            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
            >
              <Plus size={18} />
              <span>Add Person/Org</span>
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800">
        <TabButton 
          active={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
          icon={<Users size={16} />}
          label="All Records"
        />
        <TabButton 
          active={activeTab === 'pending'} 
          onClick={() => setActiveTab('pending')}
          icon={<Inbox size={16} />}
          label="Pending Approvals"
          count={Array.isArray(entities) ? entities.filter(e => e.status === 'PENDING_REVIEW').length : 0}
        />
      </div>

      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name, legal name or tax ID..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Table 
                data={filteredEntities}
                loading={loading}
                onRowClick={(entity) => navigate(`/workspace/platform/people-organisations/${entity.id}`)}
                columns={[
                  {
                    header: 'Name',
                    accessor: (entity) => (
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                          entity.partyType === 'PERSON' 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                        }`}>
                          {entity.partyType === 'PERSON' ? <User size={20} /> : <Building2 size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">
                            {entity.partyType === 'PERSON' 
                              ? `${entity.person?.firstName} ${entity.person?.lastName}`
                              : entity.organization?.legalName}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
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
                    accessor: (entity) => (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {entity.partyType}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (entity) => (
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          entity.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          entity.status === 'PENDING_REVIEW' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          'bg-zinc-400 shadow-[0_0_8px_rgba(161,161,170,0.5)]'
                        }`} />
                        <span className="text-sm text-zinc-600 dark:text-zinc-300 font-medium capitalize">
                          {entity.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Created By',
                    accessor: (entity) => (
                      <div className="flex items-center gap-2 text-zinc-500">
                        {entity.createdBySwarmId ? (
                          <>
                            <div className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                              <ShieldCheck size={12} />
                            </div>
                            <span className="text-xs font-medium">Department Swarm</span>
                          </>
                        ) : (
                          <>
                            <User size={14} className="text-zinc-400" />
                            <span className="text-xs">Human Operator</span>
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
                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    )
                  }
                ]}
              />
            </motion.div>
          )}

          {activeTab === 'pending' && <PendingApprovals onRefresh={fetchEntities} />}
        </AnimatePresence>
      </div>

      <CreatePartyModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchEntities}
      />
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const TabButton = ({ active, onClick, icon, label, count }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
      active 
        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
    }`}
  >
    {icon}
    <span>{label}</span>
    {count !== undefined && count > 0 && (
      <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] rounded-md leading-none">
        {count}
      </span>
    )}
  </button>
);

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

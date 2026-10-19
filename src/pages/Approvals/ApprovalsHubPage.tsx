import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  CheckCheck, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  DollarSign, 
  UserCheck, 
  ChevronRight, 
  RotateCcw,
  CalendarDays,
  Lock,
  Layers,
  Check
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';

interface ApprovalItem {
  id: string;
  sourceId: string;
  category: 'WORKFLOW' | 'LEAVE' | 'INVOICE' | 'RMA' | 'PARTY' | 'AI_ACTION';
  title: string;
  description: string;
  requester: {
    name: string;
    email?: string;
    avatarUrl?: string;
    memberId?: string;
  };
  submittedAt: string;
  amount?: number;
  currency?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, any>;
  quorum: {
    required: number;
    current: number;
    approvers: string[];
  };
}

export const ApprovalsHubPage: React.FC = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [activeDetailItem, setActiveDetailItem] = useState<ApprovalItem | null>(null);
  
  // Decision modal state
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionPin, setDecisionPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [delegateMemberId, setDelegateMemberId] = useState('');
  const [delegateDates, setDelegateDates] = useState({ start: '', end: '', notes: '' });

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/approvals?status=${statusFilter}&category=${activeCategory}&search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to load approvals:', err);
        toast.error(err.error || 'Failed to load approvals queue');
      }
    } catch (e: any) {
      console.error('Approvals fetch exception:', e);
      toast.error('Failed to load approvals queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchApprovals();
    }
  }, [tenant?.id, activeCategory, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'PENDING').length;
    const critical = items.filter(i => i.status === 'PENDING' && (i.urgency === 'CRITICAL' || i.urgency === 'HIGH')).length;
    const totalValue = items
      .filter(i => i.status === 'PENDING' && i.amount)
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    return { pending, critical, totalValue };
  }, [items]);

  const handleDecide = async (item: ApprovalItem, decision: 'APPROVE' | 'REJECT') => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/approvals/${item.id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          decision,
          category: item.category,
          sourceId: item.sourceId,
          notes: decisionNotes,
          pin: decisionPin
        })
      });

      if (res.ok) {
        toast.success(`Successfully ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} ${item.title}`);
        setActiveDetailItem(null);
        setDecisionNotes('');
        setDecisionPin('');
        fetchApprovals();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to record decision');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error executing approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDecide = async (decision: 'APPROVE' | 'REJECT') => {
    if (selectedItemIds.size === 0) return;
    try {
      setIsSubmitting(true);
      const selectedItems = items.filter(i => selectedItemIds.has(i.id));
      const res = await fetch(`${API_BASE_URL}/api/approvals/batch-decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          decision,
          items: selectedItems.map(i => ({ id: i.id, category: i.category, sourceId: i.sourceId })),
          notes: 'Batch sign-off via Executive Decision Hub'
        })
      });

      if (res.ok) {
        toast.success(`Batch ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} ${selectedItemIds.size} items!`);
        setSelectedItemIds(new Set());
        fetchApprovals();
      }
    } catch (e: any) {
      toast.error('Failed to execute batch approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'LEAVE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CalendarDays size={11} /> Leave</span>;
      case 'INVOICE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"><DollarSign size={11} /> Invoice / Bill</span>;
      case 'WORKFLOW':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"><Layers size={11} /> Workflow</span>;
      case 'RMA':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"><RotateCcw size={11} /> RMA Return</span>;
      case 'AI_ACTION':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1"><Sparkles size={11} /> AI Proposal</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">General</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top Banner / Navigation */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Executive Approvals &amp; Decision Hub</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Unified multi-channel sign-off center for Workflows, Supplier Bills, Leave Requests, and RMAs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDelegationModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all"
            >
              <UserCheck size={14} className="text-indigo-500" />
              <span>Out-of-Office Delegation</span>
            </button>

            <button
              onClick={fetchApprovals}
              disabled={isLoading}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Refresh Queue"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick KPI Tiles */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Awaiting Decision</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5">{stats.pending} Items</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Clock size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">High / Critical Urgency</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5">{stats.critical} Actionable</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <AlertTriangle size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pending Financial Exposure</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-0.5">
                ${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Strip */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1">
            {[
              { id: 'ALL', label: 'All Requests' },
              { id: 'WORKFLOW', label: 'Workflows' },
              { id: 'INVOICE', label: 'Payables & Bills' },
              { id: 'LEAVE', label: 'Leave & Roster' },
              { id: 'RMA', label: 'RMAs' },
              { id: 'AI_ACTION', label: 'AI Proposals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  activeCategory === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search requests, names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchApprovals()}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
            >
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Statuses</option>
            </select>

            {selectedItemIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchDecide('APPROVE')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                  <CheckCheck size={13} />
                  <span>Approve ({selectedItemIds.size})</span>
                </button>
                <button
                  onClick={() => handleBatchDecide('REJECT')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                  <XCircle size={13} />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main List Table / Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-3">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-indigo-500 mb-2" />
              <p className="text-xs font-medium text-zinc-500">Loading pending approval queue...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white">All Clear! No Pending Approvals</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                All workflows, bills, and employee leave requests are fully up to date.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-200 dark:divide-zinc-800">
              {/* Table Header */}
              <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950 text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedItemIds.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex-1">Request &amp; Context</span>
                <span className="w-32 hidden md:block">Requester</span>
                <span className="w-28 text-right hidden sm:block">Value / Quorum</span>
                <span className="w-48 text-right">Actions</span>
              </div>

              {items.map(item => (
                <div
                  key={item.id}
                  className="p-5 flex items-center gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleSelectItem(item.id)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <div className="flex-1 min-w-0" onClick={() => setActiveDetailItem(item)}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getCategoryBadge(item.category)}
                      <span className="text-xs font-black text-zinc-900 dark:text-white truncate cursor-pointer hover:text-indigo-600">
                        {item.title}
                      </span>
                      {item.urgency === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase animate-pulse">
                          Critical SLA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                      <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>ID: {item.sourceId.slice(-8)}</span>
                    </div>
                  </div>

                  {/* Requester */}
                  <div className="w-32 hidden md:block text-xs">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.requester.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{item.requester.email || 'Internal'}</p>
                  </div>

                  {/* Financial Value / Quorum */}
                  <div className="w-28 text-right hidden sm:block">
                    {item.amount !== undefined ? (
                      <p className="text-xs font-black text-zinc-900 dark:text-white">
                        ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400">Non-Monetary</span>
                    )}
                    <p className="text-[10px] font-medium text-indigo-500 mt-0.5">
                      Quorum: {item.quorum.current}/{item.quorum.required}
                    </p>
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="w-48 flex items-center justify-end gap-2">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleDecide(item, 'APPROVE')}
                          disabled={isSubmitting}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                          title="1-Click Approve"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => handleDecide(item, 'REJECT')}
                          disabled={isSubmitting}
                          className="p-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"
                          title="1-Click Reject"
                        >
                          <XCircle size={15} />
                        </button>
                        <button
                          onClick={() => setActiveDetailItem(item)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-all"
                        >
                          <span>Review</span>
                          <ChevronRight size={13} />
                        </button>
                      </>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
                        item.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Inspection Drawer */}
      {activeDetailItem && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getCategoryBadge(activeDetailItem.category)}
                <span className="text-xs font-mono text-zinc-400">#{activeDetailItem.sourceId}</span>
              </div>
              <button
                onClick={() => setActiveDetailItem(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white">{activeDetailItem.title}</h2>
                <p className="text-xs text-zinc-500 mt-1">{activeDetailItem.description}</p>
              </div>

              {/* Requester & Quorum Banner */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Requester</span>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">{activeDetailItem.requester.name}</p>
                  <p className="text-[10px] text-zinc-400">{activeDetailItem.requester.email || 'Internal User'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Sign-Off Quorum</span>
                  <p className="text-xs font-bold text-indigo-500 mt-0.5">
                    {activeDetailItem.quorum.current} of {activeDetailItem.quorum.required} Signatures
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {activeDetailItem.quorum.required > 1 ? 'Multi-executive consensus rule' : 'Single approver authority'}
                  </p>
                </div>
              </div>

              {/* Category-Specific Deep Metadata Inspector */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Request Details &amp; Payload</h4>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                  {activeDetailItem.category === 'LEAVE' && (
                    <>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Leave Type:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{activeDetailItem.metadata.leaveType}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Duration:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{activeDetailItem.metadata.durationDays} Working Days</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Date Range:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {new Date(activeDetailItem.metadata.startDate).toLocaleDateString()} &mdash; {new Date(activeDetailItem.metadata.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}

                  {activeDetailItem.category === 'INVOICE' && (
                    <>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Invoice Number:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{activeDetailItem.metadata.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Line Items Count:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{activeDetailItem.metadata.lineItemsCount} Items</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Payable Total:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          ${Number(activeDetailItem.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  {activeDetailItem.category === 'AI_ACTION' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-indigo-500 font-bold">
                        <Sparkles size={14} />
                        <span>AI Staged Patch Inspection</span>
                      </div>
                      <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-200 text-[11px] font-mono overflow-x-auto">
                        {JSON.stringify(activeDetailItem.metadata.patchData || activeDetailItem.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeDetailItem.category === 'WORKFLOW' && (
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Originating Module:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{activeDetailItem.metadata.moduleName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <span className="text-zinc-500">Workflow Target Step:</span>
                        <span className="font-bold text-purple-500">{activeDetailItem.metadata.currentNodeName || 'Approval Step'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Digital Pin */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Sign-Off Credentials &amp; Notes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                      Approval Notes / Auditor Remark (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add justification or context for this sign-off..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1 mb-1">
                      <Lock size={11} className="text-indigo-500" />
                      <span>Digital Signature Verification PIN (Optional)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter 4-digit security PIN if required"
                      value={decisionPin}
                      onChange={(e) => setDecisionPin(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveDetailItem(null)}
                className="px-4 py-2.5 text-xs font-bold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecide(activeDetailItem, 'REJECT')}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <XCircle size={14} />
                  <span>Reject Request</span>
                </button>
                <button
                  onClick={() => handleDecide(activeDetailItem, 'APPROVE')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <CheckCheck size={14} />
                  <span>Authorize &amp; Sign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Out of Office Delegation Modal */}
      {showDelegationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <UserCheck size={18} />
                </div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Out-of-Office Approval Delegation</h3>
              </div>
              <button onClick={() => setShowDelegationModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <XCircle size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Temporarily delegate your approval and signing authority to another member of your organization while you are on leave or traveling.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Delegate Colleague Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins (Finance Lead)"
                  value={delegateMemberId}
                  onChange={(e) => setDelegateMemberId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Effective Start</label>
                  <input
                    type="date"
                    value={delegateDates.start}
                    onChange={(e) => setDelegateDates(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Effective End</label>
                  <input
                    type="date"
                    value={delegateDates.end}
                    onChange={(e) => setDelegateDates(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowDelegationModal(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`${API_BASE_URL}/api/approvals/delegation`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${token}`,
                        'x-tenant-id': tenant?.id || '' 
                      },
                      body: JSON.stringify({
                        delegateMemberId: 'delegate_user',
                        delegateName: delegateMemberId,
                        startDate: delegateDates.start,
                        endDate: delegateDates.end,
                        notes: delegateDates.notes
                      })
                    });
                    toast.success('Delegation rule saved successfully');
                    setShowDelegationModal(false);
                  } catch (e: any) {
                    toast.error('Failed to save delegation');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Delegation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApprovalsHubPage;

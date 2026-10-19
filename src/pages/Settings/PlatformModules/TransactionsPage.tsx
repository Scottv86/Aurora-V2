import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftRight, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  CreditCard, 
  Receipt, 
  RotateCcw, 
  ExternalLink, 
  ChevronRight, 
  X, 
  ShieldAlert, 
  FileText, 
  Banknote,
  Printer
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { TransactionClientService, PaymentTransaction, TransactionMetrics } from '../../../services/transactionService';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { PosReturnSlipModal, PosReturnSlipData } from '../../../components/Platform/POS/PosReturnSlipModal';
import { CreditNoteDocumentModal, CreditNoteData } from '../../../components/Platform/Invoices/CreditNoteDocument';
import { RmaClientService } from '../../../services/rmaService';
import { RmaTriageModal } from '../../../components/Platform/RMA/RmaTriageModal';
import { AuroraModal } from '../../../components/UI/AuroraModal';

export const TransactionsPage: React.FC = () => {
  const { tenant } = usePlatform();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<TransactionMetrics | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');

  // Modals & Drawers
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refundModalTxn, setRefundModalTxn] = useState<PaymentTransaction | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundForm, setRefundForm] = useState({
    amount: '',
    reason: 'CUSTOMER_RETURN',
    reasonNotes: '',
    refundMethod: 'ORIGINAL_TENDER'
  });

  // Blind Return Modal
  const [showBlindModal, setShowBlindModal] = useState(false);
  const [blindForm, setBlindForm] = useState({
    amount: '',
    reason: 'CUSTOMER_RETURN',
    reasonNotes: '',
    refundMethod: 'CASH',
    managerApproved: false
  });
  const [isSubmittingBlind, setIsSubmittingBlind] = useState(false);
  const [activeReturnSlip, setActiveReturnSlip] = useState<PosReturnSlipData | null>(null);
  const [showReturnSlipModal, setShowReturnSlipModal] = useState(false);
  const [activeCreditNote, setActiveCreditNote] = useState<CreditNoteData | null>(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);

  // Hub Navigation Tabs
  const [activeTab, setActiveTab] = useState<'ledger' | 'rma'>('ledger');
  const [rmaRequests, setRmaRequests] = useState<any[]>([]);
  const [rmaLoading, setRmaLoading] = useState(false);
  const [selectedRmaForTriage, setSelectedRmaForTriage] = useState<any | null>(null);
  const [showRmaTriageModal, setShowRmaTriageModal] = useState(false);

  // Compute date range
  const dateParams = useMemo(() => {
    if (dateRangeFilter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { dateFrom: start.toISOString() };
    }
    if (dateRangeFilter === '7d') {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { dateFrom: d.toISOString() };
    }
    if (dateRangeFilter === '30d') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return { dateFrom: d.toISOString() };
    }
    return {};
  }, [dateRangeFilter]);

  const fetchData = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const [listRes, metricsRes] = await Promise.all([
        TransactionClientService.getTransactions({
          tenantId: tenant.id,
          channel: channelFilter,
          type: typeFilter,
          status: statusFilter,
          search: searchQuery,
          ...dateParams,
          limit: 100
        }),
        TransactionClientService.getMetrics({
          tenantId: tenant.id,
          ...dateParams
        })
      ]);

      setTransactions(listRes.transactions || []);
      setTotalCount(listRes.total || 0);
      setMetrics(metricsRes);
    } catch (err: any) {
      console.error('[Transactions] Fetch error:', err);
      toast.error(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchRmaRequests = async () => {
    if (!tenant?.id) return;
    try {
      setRmaLoading(true);
      const res = await RmaClientService.listRequests();
      const list = Array.isArray(res) ? res : (res?.requests || []);
      setRmaRequests(list);
    } catch (err: any) {
      console.error('[RMA] Fetch error:', err);
      toast.error(err.message || 'Failed to load return requests');
      setRmaRequests([]);
    } finally {
      setRmaLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchData();
    } else if (activeTab === 'rma') {
      fetchRmaRequests();
    }
  }, [tenant?.id, channelFilter, typeFilter, statusFilter, dateRangeFilter, activeTab]);

  // Handle Search Debounce
  useEffect(() => {
    if (activeTab === 'ledger') {
      const timer = setTimeout(() => {
        fetchData();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);

  const handleOpenRefundModal = (txn: PaymentTransaction) => {
    setRefundModalTxn(txn);
    setRefundForm({
      amount: String(Math.abs(Number(txn.grossAmount))),
      reason: 'CUSTOMER_RETURN',
      reasonNotes: '',
      refundMethod: txn.paymentMethod || 'ORIGINAL_TENDER'
    });
  };

  const handleExecuteRefund = async () => {
    if (!refundModalTxn || !tenant?.id) return;
    const amountNum = parseFloat(refundForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid positive refund amount');
      return;
    }

    try {
      setIsRefunding(true);
      await TransactionClientService.refundTransaction(refundModalTxn.id, {
        amount: amountNum,
        reason: refundForm.reason,
        reasonNotes: refundForm.reasonNotes,
        refundMethod: refundForm.refundMethod
      }, tenant.id);

      toast.success(`Refund of $${amountNum.toFixed(2)} processed successfully!`);
      setRefundModalTxn(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Refund failed');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleExecuteBlindRefund = async () => {
    if (!tenant?.id) return;
    const amountNum = parseFloat(blindForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid positive refund amount');
      return;
    }

    if (!blindForm.managerApproved) {
      toast.error('Manager authorization checkbox is required for returns without receipt');
      return;
    }

    try {
      setIsSubmittingBlind(true);
      await TransactionClientService.processBlindRefund({
        amount: amountNum,
        refundMethod: blindForm.refundMethod as any,
        reason: blindForm.reason,
        reasonNotes: blindForm.reasonNotes,
        managerApproval: true
      }, tenant.id);

      toast.success(`Blind refund of $${amountNum.toFixed(2)} processed and posted to GL!`);
      setShowBlindModal(false);
      setBlindForm({
        amount: '',
        reason: 'CUSTOMER_RETURN',
        reasonNotes: '',
        refundMethod: 'CASH',
        managerApproved: false
      });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process blind return');
    } finally {
      setIsSubmittingBlind(false);
    }
  };

  const handleExportCsv = () => {
    const url = TransactionClientService.getExportCsvUrl({
      channel: channelFilter,
      type: typeFilter,
      status: statusFilter,
      search: searchQuery,
      ...dateParams
    }, tenant?.id);
    window.open(url, '_blank');
  };

  const handleOpenDrawer = async (txn: PaymentTransaction) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
    // Fetch deep details with lines
    try {
      const full = await TransactionClientService.getTransactionById(txn.id, tenant?.id);
      setSelectedTxn(full);
    } catch (_) {}
  };

  const subNavItems: SettingsSubNavItem[] = [
    { 
      id: 'ledger', 
      label: 'Omnichannel Ledger', 
      icon: ArrowLeftRight, 
      description: 'All tenders & transaction history', 
      badge: totalCount > 0 ? totalCount : undefined 
    },
    { 
      id: 'rma', 
      label: 'Returns & RMA Queue', 
      icon: RotateCcw, 
      description: 'Customer returns & triage queue', 
      badge: Array.isArray(rmaRequests) && rmaRequests.filter(r => r.status === 'PENDING_REVIEW').length > 0 
        ? rmaRequests.filter(r => r.status === 'PENDING_REVIEW').length 
        : undefined 
    }
  ];

  return (
    <SettingsSubNavLayout
      title="Transactions & Settlement Ledger"
      description="Unified payment ledger across POS registers, customer invoicing, online portals, and customer returns."
      icon={ArrowLeftRight}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowBlindModal(true)}
            className="h-9 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Manual / Blind Return</span>
          </Button>
          <Button
            onClick={handleExportCsv}
            className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={fetchData}
            title="Refresh Transactions"
            className="h-9 w-9 p-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
          <Button
            onClick={() => navigate('/workspace/settings/platform-modules/payment-gateways')}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <CreditCard size={14} />
            <span>Payment Gateways</span>
            <ExternalLink size={12} className="opacity-80" />
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-left">
        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Gross Volume</p>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics ? `$${metrics.grossVolume.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : (loading ? '...' : '$0.00')}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {metrics ? `${metrics.successfulCount} successful transactions` : (loading ? 'Calculating volume...' : '0 successful transactions')}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
              <Banknote size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Net Settled</p>
              <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {metrics ? `$${metrics.netSettled.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : (loading ? '...' : '$0.00')}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {metrics ? `Fees: $${metrics.totalFees.toFixed(2)}` : 'Fees: $0.00'}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
              <RotateCcw size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Refunds & Returns</p>
              <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {metrics ? `$${metrics.totalRefunded.toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : (loading ? '...' : '$0.00')}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {metrics ? `Refund Rate: ${metrics.refundRatePct}%` : 'Refund Rate: 0%'}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              (metrics?.failedCount || 0) > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Declines / Failed</p>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics ? metrics.failedCount : (loading ? '...' : 0)}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {(metrics?.failedCount || 0) === 0 ? "Zero payment failures" : "Requires attention"}
              </p>
            </div>
          </div>
        </div>

        {/* TAB 1: LEDGER VIEW */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search reference, card last 4, customer name, ARN..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Channel selector */}
                <div className="flex items-center bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 text-xs">
                  {[
                    { id: 'ALL', label: 'All Channels' },
                    { id: 'POS', label: 'POS' },
                    { id: 'INVOICE', label: 'Invoices' },
                    { id: 'PORTAL', label: 'Portal' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setChannelFilter(c.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        channelFilter === c.id 
                          ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm" 
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Type selector */}
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="SALE">Sales</option>
                  <option value="REFUND">Refunds</option>
                  <option value="VOID">Voids</option>
                </select>

                {/* Status selector */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCEEDED">Succeeded</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                  <option value="FAILED">Failed</option>
                </select>

                {/* Date range */}
                <div className="flex items-center bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 text-xs">
                  {[
                    { id: 'ALL', label: 'All Time' },
                    { id: 'TODAY', label: 'Today' },
                    { id: '7D', label: '7 Days' },
                    { id: '30D', label: '30 Days' }
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDateRangeFilter(d.id as any)}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        dateRangeFilter === d.id 
                          ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm" 
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-3.5 px-4">Date / Ref</th>
                      <th className="py-3.5 px-4">Channel</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Payment Tender</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Gross Amount</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                    {loading && transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500">
                          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                          Loading payment transactions...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500">
                          <Receipt size={32} className="mx-auto mb-2 text-zinc-400" />
                          No transactions found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      transactions.map(txn => {
                        const isRefund = txn.type === 'REFUND' || Number(txn.grossAmount) < 0;
                        const isSuccess = txn.status === 'SUCCEEDED';
                        const isFailed = txn.status === 'FAILED';
                        const isRefunded = txn.status === 'REFUNDED' || txn.status === 'PARTIALLY_REFUNDED';
                        const customerName = txn.customer?.organization?.legalName || 
                          `${txn.customer?.person?.firstName || ''} ${txn.customer?.person?.lastName || ''}`.trim() || 
                          'Walk-in Customer';

                        return (
                          <tr 
                            key={txn.id} 
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                            onClick={() => handleOpenDrawer(txn)}
                          >
                            {/* Ref & Date */}
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {txn.transactionRef}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                                {new Date(txn.createdAt).toLocaleString('en-AU', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>

                            {/* Channel */}
                            <td className="py-3.5 px-4">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border",
                                txn.channel === 'POS' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                txn.channel === 'INVOICE' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                                txn.channel === 'PORTAL' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                              )}>
                                {txn.channel}
                              </span>
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4">
                              <div className="text-zinc-900 dark:text-zinc-100 font-semibold truncate max-w-[180px]">
                                {customerName}
                              </div>
                              {txn.posOrder && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                  Order #{txn.posOrder.orderNumber}
                                </div>
                              )}
                              {txn.invoice && (
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                  Invoice #{txn.invoice.invoiceNumber}
                                </div>
                              )}
                            </td>

                            {/* Payment Tender */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                                {txn.paymentMethod === 'CARD' ? <CreditCard size={13} className="text-indigo-500 shrink-0" /> :
                                 txn.paymentMethod === 'CASH' ? <Banknote size={13} className="text-emerald-500 shrink-0" /> :
                                 <Receipt size={13} className="text-zinc-400 shrink-0" />}
                                <span className="font-semibold">{txn.paymentMethod}</span>
                                {txn.cardLast4 && (
                                  <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">•••• {txn.cardLast4}</span>
                                )}
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-3.5 px-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                isRefund ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                                txn.type === 'VOID' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                              )}>
                                {txn.type}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full",
                                isSuccess ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                                isRefunded ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                                isFailed ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              )}>
                                {isSuccess && <CheckCircle2 size={10} />}
                                {isRefunded && <RotateCcw size={10} />}
                                {isFailed && <XCircle size={10} />}
                                {txn.status.replace('_', ' ')}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold">
                              <span className={isRefund ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"}>
                                {isRefund ? "-" : ""}${Math.abs(Number(txn.grossAmount)).toFixed(2)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {/* 1-Click Refund button for eligible successful sales */}
                                {txn.type === 'SALE' && txn.status !== 'REFUNDED' && (
                                  <button
                                    onClick={() => handleOpenRefundModal(txn)}
                                    title="Issue Full or Partial Refund"
                                    className="h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-300 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  >
                                    <RotateCcw size={11} />
                                    <span>Refund</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenDrawer(txn)}
                                  title="Inspect Audit Trail"
                                  className="h-7 w-7 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                                >
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

  {/* TAB 2: RMA TRIAGE & RETURNS QUEUE */}
  {activeTab === 'rma' && (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Customer Return Authorizations (RMA)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Staff triage queue for inspecting, approving, and 1-click refunding customer return submissions.
          </p>
        </div>
        <Button
          onClick={fetchRmaRequests}
          className="h-8 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw size={13} className={rmaLoading ? "animate-spin" : ""} />
          <span>Refresh RMA Queue</span>
        </Button>
      </div>

      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">RMA Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Requested Action</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {rmaLoading && rmaRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading return requests...
                  </td>
                </tr>
              ) : rmaRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <RotateCcw size={32} className="mx-auto mb-2 text-zinc-400" />
                    No customer return requests found.
                  </td>
                </tr>
              ) : (
                rmaRequests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                      {r.rmaNumber}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString('en-AU')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{r.customer?.name || 'Customer'}</span>
                      {r.customer?.email && (
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{r.customer.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{r.reason.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{r.customerComments || 'No comment provided'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {r.requestedMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        r.status === 'PENDING_REVIEW' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                        r.status === 'APPROVED' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                        r.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        r.status === 'REJECTED' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                        "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRmaForTriage(r);
                          setShowRmaTriageModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      >
                        Triage & Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* 1-Click Refund Modal */}
      <AuroraModal
        isOpen={Boolean(refundModalTxn)}
        onClose={() => setRefundModalTxn(null)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl text-zinc-900 dark:text-zinc-100"
      >
        {refundModalTxn && (
          <>
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <RotateCcw size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Process Refund</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Ref: {refundModalTxn.transactionRef}</p>
                </div>
              </div>
              <button 
                onClick={() => setRefundModalTxn(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Max refundable info */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Original Transaction:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  ${Math.abs(Number(refundModalTxn.grossAmount)).toFixed(2)} AUD
                </span>
              </div>

              {/* Refund Amount input */}
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Refund Amount ($ AUD)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={refundForm.amount}
                    onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Adjust for partial refund or keep as total for a full refund.
                </p>
              </div>

              {/* Refund Method */}
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Refund Tender</label>
                <select
                  value={refundForm.refundMethod}
                  onChange={e => setRefundForm({ ...refundForm, refundMethod: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <option value="ORIGINAL_TENDER">Original Tender ({refundModalTxn.paymentMethod})</option>
                  <option value="CASH">Cash Out (Register Till)</option>
                  <option value="CARD">Card Reversal (Terminal)</option>
                  <option value="STORE_CREDIT">Store Credit / Digital Voucher</option>
                  <option value="BANK_TRANSFER">Bank Wire / Electronic Transfer</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Reason for Refund</label>
                <select
                  value={refundForm.reason}
                  onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <option value="CUSTOMER_RETURN">Customer Return / Regret</option>
                  <option value="DEFECTIVE_GOODS">Defective / Damaged Goods</option>
                  <option value="DUPLICATE_CHARGE">Duplicate Charge</option>
                  <option value="INCORRECT_PRICING">Incorrect Pricing</option>
                  <option value="ORDER_CANCELLED">Order Cancelled</option>
                  <option value="GOODWILL">Customer Goodwill / Satisfaction</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Audit Notes (Optional)</label>
                <textarea
                  value={refundForm.reasonNotes}
                  onChange={e => setRefundForm({ ...refundForm, reasonNotes: e.target.value })}
                  placeholder="Additional context or customer request notes..."
                  rows={2}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
                />
              </div>

              {/* Accounting Notice */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2 text-indigo-700 dark:text-indigo-300 text-[11px]">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Double-entry GL reversal will automatically debit <strong>4100 Sales Returns</strong>, debit <strong>2020 GST Collected</strong> (10%), and credit the selected tender account.
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalTxn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleExecuteRefund}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRefunding && <RefreshCw size={12} className="animate-spin" />}
                <span>Execute Refund</span>
              </button>
            </div>
          </>
        )}
      </AuroraModal>

      {/* Blind / Manual Return Modal */}
      <AuroraModal
        isOpen={showBlindModal}
        onClose={() => setShowBlindModal(false)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl text-zinc-900 dark:text-zinc-100"
      >
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Manual / Blind Return</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Refund without original receipt</p>
            </div>
          </div>
          <button 
            onClick={() => setShowBlindModal(false)}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Refund Gross Amount ($ AUD)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={blindForm.amount}
                onChange={e => setBlindForm({ ...blindForm, amount: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Refund Tender</label>
            <select
              value={blindForm.refundMethod}
              onChange={e => setBlindForm({ ...blindForm, refundMethod: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="STORE_CREDIT">Store Credit / Digital Voucher (Recommended)</option>
              <option value="CASH">Cash Out (Till)</option>
              <option value="CARD">Card Reversal</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Reason</label>
            <select
              value={blindForm.reason}
              onChange={e => setBlindForm({ ...blindForm, reason: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="CUSTOMER_RETURN">No Receipt Customer Return</option>
              <option value="DEFECTIVE_GOODS">Damaged / Defective Goods</option>
              <option value="GOODWILL">Goodwill Compensation</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Manager Notes & Customer Info</label>
            <textarea
              value={blindForm.reasonNotes}
              onChange={e => setBlindForm({ ...blindForm, reasonNotes: e.target.value })}
              placeholder="Customer contact details and justification..."
              rows={2}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
            />
          </div>

          {/* Manager Override Checkbox */}
          <label className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={blindForm.managerApproved}
              onChange={e => setBlindForm({ ...blindForm, managerApproved: e.target.checked })}
              className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              <strong className="block text-zinc-900 dark:text-white">Manager Override Confirmed</strong>
              I authorize this refund without proof of purchase. All ledger movements are immutably logged to my user account.
            </div>
          </label>
        </div>

        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowBlindModal(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmittingBlind}
            onClick={handleExecuteBlindRefund}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmittingBlind && <RefreshCw size={12} className="animate-spin" />}
            <span>Authorize & Post Return</span>
          </button>
        </div>
      </AuroraModal>

      {/* Slide-out Audit Drawer */}
      <AuroraModal
        isOpen={Boolean(isDrawerOpen && selectedTxn)}
        onClose={() => setIsDrawerOpen(false)}
        drawer={true}
      >
        {selectedTxn && (
          <>
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-mono">{selectedTxn.transactionRef}</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Payment Audit Inspector</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Financial Snapshot */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                  <span>Gross Amount:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white text-base">
                    ${Number(selectedTxn.grossAmount).toFixed(2)} {selectedTxn.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-[11px]">
                  <span>GST Component (10% inc.):</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">${Number(selectedTxn.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-[11px]">
                  <span>Processor Fees:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">${Number(selectedTxn.feeAmount || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center font-bold text-zinc-900 dark:text-zinc-200">
                  <span>Net Settled:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">${Number(selectedTxn.netAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Channel & Identification */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Channel & Instrument</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                    <div className="text-[10px] text-zinc-500">Channel</div>
                    <div className="font-semibold text-zinc-900 dark:text-white mt-0.5">{selectedTxn.channel}</div>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                    <div className="text-[10px] text-zinc-500">Tender Method</div>
                    <div className="font-semibold text-zinc-900 dark:text-white mt-0.5">{selectedTxn.paymentMethod}</div>
                  </div>
                </div>
                {selectedTxn.cardLast4 && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Card Fingerprint:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{selectedTxn.cardBrand || 'Card'} •••• {selectedTxn.cardLast4}</span>
                  </div>
                )}
                {selectedTxn.gatewayRef && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400">Gateway Ref:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">{selectedTxn.gatewayRef}</span>
                  </div>
                )}
              </div>

              {/* Linked Order / Invoice */}
              {(selectedTxn.posOrder || selectedTxn.invoice) && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Originating Entity</div>
                  {selectedTxn.posOrder && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">POS Order #{selectedTxn.posOrder.orderNumber}</div>
                        <div className="text-[10px] text-zinc-500">Status: {selectedTxn.posOrder.status}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Number(selectedTxn.posOrder.total).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedTxn.invoice && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">Invoice #{selectedTxn.invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-zinc-500">Status: {selectedTxn.invoice.status}</div>
                      </div>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${Number(selectedTxn.invoice.total).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Double-Entry GL Journal Lines */}
              {selectedTxn.journalEntry && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>General Ledger Journal</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">#{selectedTxn.journalEntry.entryNumber}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic mb-2">"{selectedTxn.journalEntry.narration}"</p>
                    {selectedTxn.journalEntry.lines && selectedTxn.journalEntry.lines.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-[11px] border-b border-zinc-200/60 dark:border-zinc-800/80 pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <span className="font-mono text-zinc-900 dark:text-zinc-300 font-bold">{l.account?.accountCode}</span>
                          <span className="text-zinc-500 ml-1.5">{l.account?.accountName}</span>
                        </div>
                        <div className="font-mono">
                          {Number(l.debit) > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Dr ${Number(l.debit).toFixed(2)}</span>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-400">Cr ${Number(l.credit).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Refunds */}
              {selectedTxn.refunds && selectedTxn.refunds.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Associated Refunds</div>
                  {selectedTxn.refunds.map(r => (
                    <div key={r.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white">{r.refundNumber}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{r.reason} • {new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-${Number(r.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px]">{selectedTxn.id}</span>
              <div className="flex items-center gap-2">
                {/* Document Printing for refunds */}
                {(selectedTxn.type === 'REFUND' || (selectedTxn.refunds && selectedTxn.refunds.length > 0)) && (
                  <button
                    onClick={async () => {
                      try {
                        const refId = selectedTxn.refunds?.[0]?.id || selectedTxn.metadata?.refundId;
                        let fullRefund: any = null;
                        if (refId) {
                          fullRefund = await TransactionClientService.getRefundById(refId, tenant?.id);
                        }

                        if (selectedTxn.channel === 'POS') {
                          setActiveReturnSlip({
                            id: fullRefund?.id || selectedTxn.id,
                            refundNumber: fullRefund?.refundNumber || `RET-${selectedTxn.transactionRef}`,
                            orderNumber: selectedTxn.posOrder?.orderNumber || fullRefund?.posOrder?.orderNumber,
                            createdAt: fullRefund?.createdAt || selectedTxn.createdAt,
                            amount: Math.abs(Number(selectedTxn.grossAmount)),
                            taxAmount: Math.abs(Number(selectedTxn.taxAmount || 0)),
                            refundMethod: selectedTxn.paymentMethod || 'CASH',
                            reason: fullRefund?.reason || selectedTxn.metadata?.reason || 'CUSTOMER_RETURN',
                            reasonNotes: fullRefund?.reasonNotes || selectedTxn.metadata?.reasonNotes,
                            storeName: tenant?.name || 'AURORA RETAIL & COMMERCE',
                            items: fullRefund?.items || fullRefund?.posOrder?.items
                          });
                          setShowReturnSlipModal(true);
                        } else {
                          const cust = selectedTxn.customer;
                          const custName = cust?.organization?.legalName ||
                            `${cust?.person?.firstName || ''} ${cust?.person?.lastName || ''}`.trim() || 'Valued Client';
                          setActiveCreditNote({
                            id: fullRefund?.id || selectedTxn.id,
                            refundNumber: fullRefund?.refundNumber || `CN-${selectedTxn.transactionRef}`,
                            invoiceNumber: selectedTxn.invoice?.invoiceNumber || fullRefund?.invoice?.invoiceNumber || selectedTxn.transactionRef,
                            invoiceDate: fullRefund?.invoice?.issueDate || selectedTxn.createdAt,
                            createdAt: fullRefund?.createdAt || selectedTxn.createdAt,
                            amount: Math.abs(Number(selectedTxn.grossAmount)),
                            taxAmount: Math.abs(Number(selectedTxn.taxAmount || 0)),
                            refundMethod: selectedTxn.paymentMethod || 'BANK_TRANSFER',
                            reason: fullRefund?.reason || selectedTxn.metadata?.reason || 'ORDER_CANCELLED',
                            reasonNotes: fullRefund?.reasonNotes,
                            customerName: custName,
                            businessName: tenant?.name || 'AURORA ENTERPRISE COMMERCE PTY LTD'
                          });
                          setShowCreditNoteModal(true);
                        }
                      } catch (err) {
                        toast.error('Failed to load document for printing');
                      }
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer size={12} />
                    <span>{selectedTxn.channel === 'POS' ? 'Print Slip' : 'Print Credit Note'}</span>
                  </button>
                )}

                {selectedTxn.type === 'SALE' && selectedTxn.status !== 'REFUNDED' && (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      handleOpenRefundModal(selectedTxn);
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <RotateCcw size={12} />
                    <span>Refund</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </AuroraModal>

      {/* POS Thermal Return Slip Modal */}
      {showReturnSlipModal && activeReturnSlip && (
        <PosReturnSlipModal
          isOpen={showReturnSlipModal}
          onClose={() => setShowReturnSlipModal(false)}
          refund={activeReturnSlip}
        />
      )}

      {/* Formal A4 Credit Note Modal */}
      {showCreditNoteModal && activeCreditNote && (
        <CreditNoteDocumentModal
          isOpen={showCreditNoteModal}
          onClose={() => setShowCreditNoteModal(false)}
          creditNote={activeCreditNote}
        />
      )}

      {/* Staff RMA Triage & Inspection Modal */}
      {showRmaTriageModal && selectedRmaForTriage && tenant?.id && (
        <RmaTriageModal
          isOpen={showRmaTriageModal}
          onClose={() => {
            setShowRmaTriageModal(false);
            setSelectedRmaForTriage(null);
          }}
          rma={selectedRmaForTriage}
          tenantId={tenant.id}
          onUpdated={fetchRmaRequests}
        />
      )}
    </div>
    </SettingsSubNavLayout>
  );
};
export default TransactionsPage;

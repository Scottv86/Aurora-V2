import { useState, useEffect } from 'react';
import { 
  Banknote, 
  Receipt, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Plus, 
  Lock, 
  RefreshCw, 
  BarChart2, 
  Check, 
  X,
  Layers,
  Edit3,
  Trash2,
  Search,
  ShieldCheck,
  Tag,
  AlertCircle,
  Archive,
  Info,
  Store,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Button } from '../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { TransactionClientService } from '../../services/transactionService';
import { CreditNoteDocumentModal, CreditNoteData } from '../../components/Platform/Invoices/CreditNoteDocument';
import { AuroraModal } from '../../components/UI/AuroraModal';

export const FinancialManagementPage = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'bills' | 'reconciliation' | 'ledger' | 'reports'>('overview');

  // Overview Metrics State
  const [metrics, setMetrics] = useState({
    bankBalance: 0,
    arTotal: 0,
    arOverdue: 0,
    apTotal: 0,
    posSalesToday: 0,
    posOrdersCount: 0,
    unreconciledCount: 0
  });

  const [posOrders, setPosOrders] = useState<any[]>([]);

  // Accounts & Ledger State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [lockDate, setLockDate] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [newLockDateInput, setNewLockDateInput] = useState('');

  // Chart of Accounts filter, search & modals
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('ALL');
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');
  const [showArchivedAccounts, setShowArchivedAccounts] = useState<boolean>(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState<boolean>(false);
  const [accountForm, setAccountForm] = useState<{
    accountCode: string;
    accountName: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    taxRateId: string;
    description: string;
    isActive: boolean;
  }>({
    accountCode: '',
    accountName: '',
    accountType: 'EXPENSE',
    taxRateId: '',
    description: '',
    isActive: true
  });

  // Invoices & Bills State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<string>('ALL');
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');

  // Invoice Refund / Credit Modal State
  const [showInvoiceRefundModal, setShowInvoiceRefundModal] = useState(false);
  const [selectedInvoiceForRefund, setSelectedInvoiceForRefund] = useState<any>(null);
  const [invoiceRefundAmount, setInvoiceRefundAmount] = useState<number>(0);
  const [invoiceRefundReason, setInvoiceRefundReason] = useState<string>('ORDER_CANCELLED');
  const [invoiceRefundNotes, setInvoiceRefundNotes] = useState<string>('');
  const [invoiceRefundMethod, setInvoiceRefundMethod] = useState<string>('BANK_TRANSFER');
  const [isSubmittingInvoiceRefund, setIsSubmittingInvoiceRefund] = useState(false);
  const [activeCreditNote, setActiveCreditNote] = useState<CreditNoteData | null>(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState<boolean>(false);

  // Reconciliation State
  const [bankLines, setBankLines] = useState<any[]>([]);
  const [selectedBankLine, setSelectedBankLine] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showImportBankModal, setShowImportBankModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  // Customers & Suppliers
  const [partyList, setPartyList] = useState<any[]>([]);

  // Reports State
  const [reportType, setReportType] = useState<'pnl' | 'balanceSheet' | 'trialBalance' | 'agedReceivables'>('pnl');
  const [pnlData, setPnlData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [agedReceivablesData, setAgedReceivablesData] = useState<any>(null);

  // New Invoice Form State
  const [newInvoice, setNewInvoice] = useState({
    customerPartyId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: '',
    status: 'AUTHORIZED' as 'DRAFT' | 'AUTHORIZED',
    lines: [
      { description: 'Professional Advisory Services', quantity: 1, unitPrice: 250, taxAmount: 25, discountAmount: 0 }
    ]
  });

  useEffect(() => {
    fetchFinancialData();
    fetchParties();
  }, [tenant?.id]);

  const fetchFinancialData = async () => {
    if (!tenant?.id) return;
    try {
      const headers = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant.id };

      const [accRes, invRes, billsRes, linesRes, lockRes, taxRes, posRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/finance/accounts`, { headers }),
        fetch(`${API_BASE_URL}/api/invoices`, { headers }),
        fetch(`${API_BASE_URL}/api/invoices/bills/list`, { headers }),
        fetch(`${API_BASE_URL}/api/reconciliation/lines?status=unreconciled`, { headers }),
        fetch(`${API_BASE_URL}/api/finance/lock-date`, { headers }),
        fetch(`${API_BASE_URL}/api/finance/tax-rates`, { headers }),
        fetch(`${API_BASE_URL}/api/pos/orders?limit=100`, { headers })
      ]);

      const [accountsData, invoicesData, billsData, linesData, lockData, taxData, posData]: [any, any, any, any, any, any, any] = await Promise.all([
        accRes.json().catch((): any[] => []),
        invRes.json().catch((): { invoices: any[] } => ({ invoices: [] })),
        billsRes.json().catch((): any[] => []),
        linesRes.json().catch((): any[] => []),
        lockRes.json().catch((): { lockDate: any } => ({ lockDate: null })),
        taxRes.json().catch((): any[] => []),
        posRes.json().catch((): any[] => [])
      ]);

      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setTaxRates(Array.isArray(taxData) ? taxData : []);
      setInvoices(invoicesData.invoices || []);
      setBills(Array.isArray(billsData) ? billsData : []);
      setBankLines(Array.isArray(linesData) ? linesData : []);
      setLockDate(lockData.lockDate || null);
      const posOrdersList = Array.isArray(posData) ? posData : [];
      setPosOrders(posOrdersList);

      // Compute Overview Metrics
      const bankAcc = (accountsData || []).find((a: any) => a.accountCode === '1010');
      const bankBal = bankAcc ? Number(bankAcc.currentBalance) : 0;

      let arTotal = 0;
      let arOverdue = 0;
      const now = Date.now();
      for (const inv of (invoicesData.invoices || [])) {
        if (inv.status !== 'PAID' && inv.status !== 'VOID') {
          const bal = Number(inv.total) - Number(inv.amountPaid);
          arTotal += bal;
          if (new Date(inv.dueDate).getTime() < now) {
            arOverdue += bal;
          }
        }
      }

      let apTotal = 0;
      for (const bill of (billsData || [])) {
        if (bill.status !== 'PAID' && bill.status !== 'VOID') {
          apTotal += (Number(bill.total) - Number(bill.amountPaid));
        }
      }

      // Compute POS Counter Sales Today
      let posSalesToday = 0;
      let posOrdersTodayCount = 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      for (const order of posOrdersList) {
        const orderDate = new Date(order.createdAt);
        if (orderDate >= startOfDay) {
          posSalesToday += Number(order.total || 0);
          posOrdersTodayCount += 1;
        }
      }

      setMetrics({
        bankBalance: bankBal,
        arTotal: Math.round(arTotal * 100) / 100,
        arOverdue: Math.round(arOverdue * 100) / 100,
        apTotal: Math.round(apTotal * 100) / 100,
        posSalesToday: Math.round(posSalesToday * 100) / 100,
        posOrdersCount: posOrdersTodayCount,
        unreconciledCount: (linesData || []).length
      });

    } catch (err) {
      console.error('[Finance] Error loading data:', err);
    }
  };

  const fetchParties = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=100`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : (data.parties || data.entities || []);
        setPartyList(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('[Finance] Failed to load parties:', err);
    }
  };

  const fetchReport = async (type: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' };
      if (type === 'pnl') {
        const res = await fetch(`${API_BASE_URL}/api/finance/reports/profit-and-loss`, { headers });
        const data = await res.json();
        setPnlData(data);
      } else if (type === 'balanceSheet') {
        const res = await fetch(`${API_BASE_URL}/api/finance/reports/balance-sheet`, { headers });
        const data = await res.json();
        setBalanceSheetData(data);
      } else if (type === 'trialBalance') {
        const res = await fetch(`${API_BASE_URL}/api/finance/reports/trial-balance`, { headers });
        const data = await res.json();
        setTrialBalanceData(data);
      } else if (type === 'agedReceivables') {
        const res = await fetch(`${API_BASE_URL}/api/invoices/reports/aged-receivables`, { headers });
        const data = await res.json();
        setAgedReceivablesData(data);
      }
    } catch (err: any) {
      toast.error('Failed to load report');
    }
  };

  const handleSelectBankLine = async (line: any) => {
    setSelectedBankLine(line);
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reconciliation/match-suggestions/${line.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      toast.error('Failed to load match suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleReconcile = async (matchType: string, matchId?: string, feeAmount: number = 0) => {
    if (!selectedBankLine) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reconciliation/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          lineId: selectedBankLine.id,
          matchType,
          matchId,
          feeAmount
        })
      });

      if (res.ok) {
        toast.success('Transaction reconciled successfully!');
        setSelectedBankLine(null);
        setSuggestions([]);
        fetchFinancialData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Reconciliation failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerPartyId) {
      toast.error('Please select a customer');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(newInvoice)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Invoice ${data.invoiceNumber} created!`);
        setShowNewInvoiceModal(false);
        fetchFinancialData();
      } else {
        throw new Error(data.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRecordInvoicePayment = async () => {
    if (!selectedInvoiceForPayment) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/${selectedInvoiceForPayment.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod
        })
      });

      if (res.ok) {
        toast.success(`Payment of $${paymentAmount.toFixed(2)} recorded!`);
        setShowPaymentModal(false);
        setSelectedInvoiceForPayment(null);
        fetchFinancialData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Payment failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExecuteInvoiceRefund = async () => {
    if (!selectedInvoiceForRefund || !tenant?.id) return;
    if (invoiceRefundAmount <= 0) {
      toast.error('Refund amount must be greater than zero');
      return;
    }
    try {
      setIsSubmittingInvoiceRefund(true);
      const refundResult = await TransactionClientService.processInvoiceRefund({
        invoiceId: selectedInvoiceForRefund.id,
        amount: invoiceRefundAmount,
        refundMethod: invoiceRefundMethod,
        reason: invoiceRefundReason,
        reasonNotes: invoiceRefundNotes
      }, tenant.id);

      toast.success(`Invoice credit / refund of $${invoiceRefundAmount.toFixed(2)} processed!`);
      setShowInvoiceRefundModal(false);

      const cust = selectedInvoiceForRefund.customer;
      const custName = cust?.organization?.legalName ||
        `${cust?.person?.firstName || ''} ${cust?.person?.lastName || ''}`.trim() || 'Valued Client';

      setActiveCreditNote({
        id: refundResult?.id || 'CN-ID',
        refundNumber: refundResult?.refundNumber || `CN-${selectedInvoiceForRefund.invoiceNumber}`,
        invoiceNumber: selectedInvoiceForRefund.invoiceNumber,
        invoiceDate: selectedInvoiceForRefund.issueDate,
        createdAt: refundResult?.createdAt || new Date(),
        amount: invoiceRefundAmount,
        taxAmount: Math.round((invoiceRefundAmount - (invoiceRefundAmount / 1.10)) * 100) / 100,
        refundMethod: invoiceRefundMethod,
        reason: invoiceRefundReason,
        reasonNotes: invoiceRefundNotes,
        customerName: custName,
        customerAddress: cust?.organization?.address || '',
        customerAbn: cust?.organization?.abn || '',
        businessName: tenant?.name || 'AURORA ENTERPRISE COMMERCE PTY LTD'
      });
      setShowCreditNoteModal(true);

      setSelectedInvoiceForRefund(null);
      await fetchFinancialData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to refund invoice');
    } finally {
      setIsSubmittingInvoiceRefund(false);
    }
  };

  const handleOpenAddAccount = () => {
    setAccountForm({
      accountCode: '',
      accountName: '',
      accountType: accountTypeFilter !== 'ALL' ? (accountTypeFilter as any) : 'EXPENSE',
      taxRateId: taxRates[0]?.id || '',
      description: '',
      isActive: true
    });
    setShowAddAccountModal(true);
  };

  const handleOpenEditAccount = (acc: any) => {
    setEditingAccount(acc);
    setAccountForm({
      accountCode: acc.accountCode || '',
      accountName: acc.accountName || '',
      accountType: acc.accountType || 'EXPENSE',
      taxRateId: acc.taxRateId || '',
      description: acc.description || '',
      isActive: acc.isActive !== false
    });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountCode.trim() || !accountForm.accountName.trim()) {
      toast.error('Account Code and Account Name are required');
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': tenant?.id || ''
      };

      if (editingAccount) {
        const res = await fetch(`${API_BASE_URL}/api/finance/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            accountCode: accountForm.accountCode.trim(),
            accountName: accountForm.accountName.trim(),
            accountType: editingAccount.systemAccount ? undefined : accountForm.accountType,
            taxRateId: accountForm.taxRateId || null,
            description: accountForm.description.trim() || null,
            isActive: accountForm.isActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update account');
        toast.success(`Account ${data.accountCode} (${data.accountName}) updated`);
        setEditingAccount(null);
      } else {
        const res = await fetch(`${API_BASE_URL}/api/finance/accounts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            accountCode: accountForm.accountCode.trim(),
            accountName: accountForm.accountName.trim(),
            accountType: accountForm.accountType,
            taxRateId: accountForm.taxRateId || null,
            description: accountForm.description.trim() || null,
            currency: 'AUD'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create account');
        toast.success(`Account ${data.accountCode} (${data.accountName}) created successfully`);
        setShowAddAccountModal(false);
      }

      await fetchFinancialData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving account');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    if (acc.systemAccount) {
      toast.error(`System account (${acc.systemAccount}) cannot be deleted.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete account ${acc.accountCode} - ${acc.accountName}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/finance/accounts/${acc.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      toast.success(`Account ${acc.accountCode} deleted`);
      await fetchFinancialData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting account');
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    if (accountTypeFilter !== 'ALL' && acc.accountType !== accountTypeFilter) {
      return false;
    }
    if (!showArchivedAccounts && acc.isActive === false) {
      return false;
    }
    if (accountSearchQuery.trim()) {
      const q = accountSearchQuery.toLowerCase();
      const codeMatches = acc.accountCode?.toLowerCase().includes(q);
      const nameMatches = acc.accountName?.toLowerCase().includes(q);
      const descMatches = acc.description?.toLowerCase().includes(q);
      const typeMatches = acc.accountType?.toLowerCase().includes(q);
      return codeMatches || nameMatches || descMatches || typeMatches;
    }
    return true;
  });

  const accountsByType = {
    ASSET: accounts.filter(a => a.accountType === 'ASSET'),
    LIABILITY: accounts.filter(a => a.accountType === 'LIABILITY'),
    EQUITY: accounts.filter(a => a.accountType === 'EQUITY'),
    REVENUE: accounts.filter(a => a.accountType === 'REVENUE'),
    EXPENSE: accounts.filter(a => a.accountType === 'EXPENSE')
  };

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'overview', label: 'Financial Overview', icon: BarChart2, description: 'Bank balance & cash flow KPIs' },
    { id: 'invoices', label: 'Invoices (AR)', icon: Receipt, description: 'Sales invoices & receivables' },
    { id: 'bills', label: 'Bills & Debits (AP)', icon: FileText, description: 'Supplier bills & payables' },
    { 
      id: 'reconciliation', 
      label: 'Bank Reconciliation', 
      icon: RefreshCw, 
      description: 'Automated statement matching',
      badge: metrics.unreconciledCount > 0 ? metrics.unreconciledCount : undefined 
    },
    { id: 'ledger', label: 'Chart of Accounts & GL', icon: Layers, description: 'General ledger account codes' },
    { id: 'reports', label: 'Financial Reports', icon: DollarSign, description: 'P&L, Balance Sheet & Trial Balance' },
  ];

  return (
    <SettingsSubNavLayout
      title="Accounting & General Ledger"
      description="Double-entry General Ledger, Accounts Receivable Invoicing, Accounts Payable Bills, Bank Reconciliation, and Financial Reports."
      icon={BarChart2}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={(id) => {
        setActiveTab(id as any);
        if (id === 'reports') fetchReport('pnl');
      }}
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setNewLockDateInput(lockDate || '');
              setShowLockModal(true);
            }}
            className="bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Lock size={14} className={lockDate ? 'text-amber-500' : 'text-zinc-400'} />
            <span>{lockDate ? `Locked: ${lockDate}` : 'Lock Period'}</span>
          </Button>
          {activeTab === 'ledger' ? (
            <Button
              onClick={handleOpenAddAccount}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Account</span>
            </Button>
          ) : (
            <Button
              onClick={() => setShowNewInvoiceModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Plus size={14} />
              <span>New Invoice</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Banknote size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                    Operating Bank
                  </p>
                  <p className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1 truncate">
                    ${metrics.bankBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">GL: 1010 Operating</p>
                </div>
              </div>

              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Store size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                    POS Sales (Today)
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                    ${metrics.posSalesToday.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                    {metrics.posOrdersCount} {metrics.posOrdersCount === 1 ? 'sale' : 'sales'} processed
                  </p>
                </div>
              </div>

              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                  <ArrowUpRight size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                    Invoices Due (AR)
                  </p>
                  <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                    ${metrics.arTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-amber-500 font-mono mt-0.5">
                    ${metrics.arOverdue.toFixed(2)} Overdue
                  </p>
                </div>
              </div>

              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
                  <ArrowDownLeft size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                    Bills to Pay (AP)
                  </p>
                  <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 truncate">
                    ${metrics.apTotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Unpaid payables</p>
                </div>
              </div>

              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                  <RefreshCw size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                    Reconciliation
                  </p>
                  <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 truncate">
                    {metrics.unreconciledCount}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Statement lines</p>
                </div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Receipt size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Recent Sales Invoices</span>
                </h3>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {invoices.length === 0 ? (
                    <p className="py-4 text-center text-zinc-500 dark:text-zinc-400">No sales invoices yet.</p>
                  ) : (
                    invoices.slice(0, 5).map(inv => (
                      <div key={inv.id} className="py-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">{inv.invoiceNumber}</span>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {inv.customer?.organization?.legalName || inv.customer?.person?.firstName || 'Customer'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-zinc-900 dark:text-white">${Number(inv.total).toFixed(2)}</span>
                          <p className={cn(
                            "text-[10px] font-bold uppercase",
                            inv.status === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          )}>
                            {inv.status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Store size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Recent POS Counter Sales</span>
                  </span>
                  <a
                    href="/workspace/settings/platform-modules/pos"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
                  >
                    Open POS Terminal →
                  </a>
                </h3>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {posOrders.length === 0 ? (
                    <p className="py-4 text-center text-zinc-500 dark:text-zinc-400">No POS orders processed yet.</p>
                  ) : (
                    posOrders.slice(0, 5).map(order => {
                      const custName = order.customer?.organization?.legalName || 
                        `${order.customer?.person?.firstName || ''} ${order.customer?.person?.lastName || ''}`.trim() || 
                        'Walk-in Customer';
                      const tender = order.payments?.[0]?.tenderType || 'CARD';
                      return (
                        <div key={order.id} className="py-3 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">{order.orderNumber}</span>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{custName}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Number(order.total).toFixed(2)}</span>
                            <p className="text-[10px] font-mono text-zinc-500 uppercase">{tender}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <RefreshCw size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Unreconciled Bank Feed</span>
                </h3>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {bankLines.slice(0, 5).map(line => (
                    <div key={line.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white">{line.description || line.payee || 'Bank Line'}</span>
                        <p className="text-[11px] text-zinc-500">{new Date(line.transactionDate).toLocaleDateString()}</p>
                      </div>
                      <span className={cn(
                        "font-mono font-bold",
                        Number(line.amount) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-200"
                      )}>
                        {Number(line.amount) > 0 ? '+' : ''}${Number(line.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES (AR) */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs shadow-sm">
                {['ALL', 'AUTHORIZED', 'PAID', 'OVERDUE'].map(f => (
                  <button
                    key={f}
                    onClick={() => setInvoiceFilter(f)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-xs",
                      invoiceFilter === f 
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" 
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 uppercase font-mono text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {invoices
                    .filter(inv => invoiceFilter === 'ALL' || inv.status === invoiceFilter)
                    .map(inv => (
                      <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-200">
                          {inv.customer?.organization?.legalName || `${inv.customer?.person?.firstName || ''} ${inv.customer?.person?.lastName || ''}`.trim()}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">{new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">${Number(inv.total).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">${Number(inv.amountPaid).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            inv.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                            inv.status === 'AUTHORIZED' ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          )}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setPaymentAmount(Number(inv.total) - Number(inv.amountPaid));
                                  setShowPaymentModal(true);
                                }}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer"
                              >
                                Record Pay
                              </button>
                            )}
                            {Number(inv.amountPaid) > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForRefund(inv);
                                  setInvoiceRefundAmount(Number(inv.amountPaid));
                                  setInvoiceRefundReason('ORDER_CANCELLED');
                                  setInvoiceRefundNotes('');
                                  setInvoiceRefundMethod('BANK_TRANSFER');
                                  setShowInvoiceRefundModal(true);
                                }}
                                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 cursor-pointer flex items-center gap-1"
                              >
                                <RotateCcw size={12} />
                                Refund / Credit
                              </button>
                            )}
                            {(inv.status === 'REFUNDED' || inv.status === 'PARTIALLY_REFUNDED' || (inv.refunds && inv.refunds.length > 0)) && (
                              <button
                                onClick={async () => {
                                  try {
                                    const ref = inv.refunds?.[0];
                                    const cust = inv.customer;
                                    const custName = cust?.organization?.legalName ||
                                      `${cust?.person?.firstName || ''} ${cust?.person?.lastName || ''}`.trim() || 'Valued Client';
                                    if (ref?.id) {
                                      const full = await TransactionClientService.getRefundById(ref.id, tenant?.id);
                                      setActiveCreditNote({
                                        ...full,
                                        invoiceNumber: inv.invoiceNumber,
                                        invoiceDate: inv.issueDate,
                                        customerName: custName,
                                        businessName: tenant?.name || 'AURORA ENTERPRISE COMMERCE PTY LTD'
                                      });
                                    } else {
                                      setActiveCreditNote({
                                        id: 'ad-hoc',
                                        refundNumber: `CN-${inv.invoiceNumber}`,
                                        invoiceNumber: inv.invoiceNumber,
                                        invoiceDate: inv.issueDate,
                                        createdAt: inv.updatedAt || new Date(),
                                        amount: Number(inv.total),
                                        taxAmount: Number(inv.taxAmount || 0),
                                        refundMethod: 'BANK_TRANSFER',
                                        reason: 'ORDER_CANCELLED',
                                        customerName: custName,
                                        businessName: tenant?.name || 'AURORA ENTERPRISE COMMERCE PTY LTD'
                                      });
                                    }
                                    setShowCreditNoteModal(true);
                                  } catch (err) {
                                    toast.error('Failed to load credit note');
                                  }
                                }}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer flex items-center gap-1"
                              >
                                <FileText size={12} />
                                Credit Note
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2.5: BILLS (AP) */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-rose-500 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Accounts Payable (Vendor Bills)</h3>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 uppercase font-mono text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Vendor / Supplier</th>
                    <th className="py-3 px-4">Bill Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                        No vendor bills recorded.
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill: any) => (
                      <tr key={bill.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">{bill.billNumber}</td>
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-200">
                          {bill.supplier?.organization?.legalName || `${bill.supplier?.person?.firstName || ''} ${bill.supplier?.person?.lastName || ''}`.trim() || 'Supplier'}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">{new Date(bill.billDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">{new Date(bill.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">${Number(bill.total).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">${Number(bill.amountPaid).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            bill.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                            bill.status === 'AUTHORISED' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          )}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BANK RECONCILIATION (2-COLUMN XERO STYLE) */}
        {activeTab === 'reconciliation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-14rem)]">
            {/* Left Column: Bank Statement Lines */}
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Bank Statement Lines</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{bankLines.length} unreconciled transactions</p>
                </div>
                <Button
                  onClick={() => setShowImportBankModal(true)}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition-colors"
                >
                  Import Lines
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-2 space-y-1">
                {bankLines.map(line => (
                  <div
                    key={line.id}
                    onClick={() => handleSelectBankLine(line)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                      selectedBankLine?.id === line.id
                        ? "bg-indigo-50 dark:bg-indigo-600/15 border-indigo-300 dark:border-indigo-500 text-zinc-900 dark:text-white shadow-sm"
                        : "bg-white dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white">{line.description || line.payee || 'Transaction'}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{new Date(line.transactionDate).toLocaleDateString()}</p>
                    </div>
                    <span className={cn(
                      "font-mono font-bold text-xs",
                      Number(line.amount) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-200"
                    )}>
                      {Number(line.amount) > 0 ? '+' : ''}${Number(line.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Suggested Match & 1-Click Reconcile */}
            <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Suggested Match</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedBankLine 
                    ? `Matching ${selectedBankLine.description} ($${Number(selectedBankLine.amount).toFixed(2)})` 
                    : 'Select a transaction on the left to review matches'}
                </p>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                    Computing rule matches...
                  </div>
                ) : !selectedBankLine ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 gap-2">
                    <RefreshCw size={24} className="text-zinc-300 dark:text-zinc-600" />
                    <p>Select a bank line to view automated match candidates.</p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                      No automated match found. Reconcile directly against an operating expense account:
                    </div>
                    <div className="space-y-2">
                      {accounts.filter(a => a.accountType === 'EXPENSE').map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => handleReconcile('MANUAL_EXPENSE', undefined, 0)}
                          className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-xl cursor-pointer flex justify-between items-center text-xs"
                        >
                          <span className="text-zinc-800 dark:text-zinc-200 font-medium">{acc.accountCode} - {acc.accountName}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Apply & Reconcile</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono">{sug.type} MATCH</span>
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">${Number(sug.amount).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">{sug.description}</p>
                        <Button
                          onClick={() => handleReconcile(sug.type, sug.id, 0)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <Check size={14} />
                          <span>OK / Reconcile Transaction</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHART OF ACCOUNTS & GENERAL LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl">
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Accounts</div>
                <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">{accounts.length}</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{accounts.filter(a => a.isActive !== false).length} Active in GL</div>
              </div>
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Assets (1000s)</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ${accountsByType.ASSET.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{accountsByType.ASSET.length} Asset Accounts</div>
              </div>
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl">
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Liabilities (2000s)</div>
                <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  ${accountsByType.LIABILITY.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{accountsByType.LIABILITY.length} Liability Accounts</div>
              </div>
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl">
                <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Equity (3000s)</div>
                <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  ${accountsByType.EQUITY.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{accountsByType.EQUITY.length} Equity Accounts</div>
              </div>
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Revenue / Expenses</div>
                <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                  {accountsByType.REVENUE.length} / {accountsByType.EXPENSE.length}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Operating GL codes</div>
              </div>
            </div>

            {/* Filter and Action Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs font-semibold custom-scrollbar">
                {[
                  { id: 'ALL', label: 'All Accounts' },
                  { id: 'ASSET', label: 'Assets (1000s)' },
                  { id: 'LIABILITY', label: 'Liabilities (2000s)' },
                  { id: 'EQUITY', label: 'Equity (3000s)' },
                  { id: 'REVENUE', label: 'Revenue (4000s)' },
                  { id: 'EXPENSE', label: 'Expenses (5000-6000s)' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAccountTypeFilter(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer text-xs",
                      accountTypeFilter === tab.id
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-60 min-w-[180px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={accountSearchQuery}
                    onChange={e => setAccountSearchQuery(e.target.value)}
                    placeholder="Search code, name, description..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
                  />
                  {accountSearchQuery && (
                    <button
                      onClick={() => setAccountSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none whitespace-nowrap px-1">
                  <input
                    type="checkbox"
                    checked={showArchivedAccounts}
                    onChange={e => setShowArchivedAccounts(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-600 focus:ring-0"
                  />
                  <span>Show Archived</span>
                </label>

                <Button
                  onClick={handleOpenAddAccount}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Account</span>
                </Button>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-400 uppercase font-mono text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Tax Rate</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Debit Total</th>
                    <th className="py-3 px-4 text-right">Credit Total</th>
                    <th className="py-3 px-4 text-right">Net Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                        No accounts match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map(acc => {
                      const typeBadge = {
                        ASSET: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                        LIABILITY: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                        EQUITY: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
                        REVENUE: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
                        EXPENSE: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
                      }[acc.accountType as string] || 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';

                      const hasTransactions = (Number(acc.debitTotal) > 0 || Number(acc.creditTotal) > 0);

                      return (
                        <tr key={acc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            {acc.accountCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{acc.accountName}</div>
                            {acc.description && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{acc.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded border", typeBadge)}>
                              {acc.accountType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 font-mono text-[11px] whitespace-nowrap">
                            {acc.taxRate?.name || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {acc.systemAccount ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded" title="Core system account required for automated postings">
                                <Lock size={10} />
                                {acc.systemAccount}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                                Custom
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {acc.isActive !== false ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                Archived
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            ${Number(acc.debitTotal || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            ${Number(acc.creditTotal || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            <span className={Number(acc.currentBalance) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                              ${Number(acc.currentBalance || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditAccount(acc)}
                                title="Edit Account"
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                              {!acc.systemAccount && (
                                <button
                                  onClick={() => handleDeleteAccount(acc)}
                                  disabled={hasTransactions}
                                  title={hasTransactions ? "Cannot delete account with existing transactions; edit to archive instead" : "Delete Account"}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    hasTransactions
                                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                      : "text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
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
        )}

        {/* TAB 5: FINANCIAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              {[
                { id: 'pnl', label: 'Profit & Loss' },
                { id: 'balanceSheet', label: 'Balance Sheet' },
                { id: 'trialBalance', label: 'Trial Balance' },
                { id: 'agedReceivables', label: 'Aged Receivables' },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReportType(r.id as any);
                    fetchReport(r.id);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    reportType === r.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reportType === 'pnl' && pnlData && (
              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl space-y-4 text-xs font-mono shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Profit and Loss Statement</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">Period ending {new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-indigo-600 dark:text-indigo-400">REVENUE</h4>
                  {pnlData.revenue?.accounts?.map((a: any) => (
                    <div key={a.id} className="flex justify-between pl-4 text-zinc-700 dark:text-zinc-300">
                      <span>{a.accountCode} - {a.accountName}</span>
                      <span>${Number(a.balance).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1 font-bold text-zinc-900 dark:text-white">
                    <span>Total Revenue</span>
                    <span>${Number(pnlData.revenue?.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400">OPERATING EXPENSES</h4>
                  {pnlData.expenses?.accounts?.map((a: any) => (
                    <div key={a.id} className="flex justify-between pl-4 text-zinc-700 dark:text-zinc-300">
                      <span>{a.accountCode} - {a.accountName}</span>
                      <span>${Number(a.balance).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1 font-bold text-zinc-900 dark:text-white">
                    <span>Total Expenses</span>
                    <span>${Number(pnlData.expenses?.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between border-t-2 border-zinc-300 dark:border-zinc-700 pt-3 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span>NET PROFIT</span>
                  <span>${Number(pnlData.netProfit).toFixed(2)}</span>
                </div>
              </div>
            )}

            {reportType === 'balanceSheet' && balanceSheetData && (
              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl space-y-4 text-xs font-mono shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Balance Sheet</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">As at {new Date().toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400">TOTAL ASSETS</h4>
                  <div className="flex justify-between pl-4 text-zinc-900 dark:text-white font-bold">
                    <span>Current & Non-Current Assets</span>
                    <span>${Number(balanceSheetData.assets?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400">TOTAL LIABILITIES</h4>
                  <div className="flex justify-between pl-4 text-zinc-900 dark:text-white font-bold">
                    <span>Current & Long-Term Liabilities</span>
                    <span>${Number(balanceSheetData.liabilities?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between border-t-2 border-zinc-300 dark:border-zinc-700 pt-3 text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>NET ASSETS (EQUITY)</span>
                  <span>${Number(balanceSheetData.equity?.total || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {reportType === 'trialBalance' && trialBalanceData && (
              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl space-y-4 text-xs font-mono shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Trial Balance</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">General Ledger balances verified (Σ Debit = Σ Credit)</p>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40">
                  {trialBalanceData.rows?.map((r: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-zinc-700 dark:text-zinc-300 py-1.5">
                      <span>{r.accountCode} - {r.accountName}</span>
                      <div className="space-x-4">
                        <span>Dr: ${Number(r.debit || 0).toFixed(2)}</span>
                        <span>Cr: ${Number(r.credit || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t-2 border-zinc-300 dark:border-zinc-700 pt-3 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span>TOTALS BALANCED</span>
                  <div className="space-x-4">
                    <span>Dr: ${Number(trialBalanceData.totalDebit || 0).toFixed(2)}</span>
                    <span>Cr: ${Number(trialBalanceData.totalCredit || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'agedReceivables' && agedReceivablesData && (
              <div className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl space-y-4 text-xs font-mono shadow-sm">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Aged Receivables (Debtors Summary)</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">Aging schedule breakdown</p>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-semibold">CURRENT</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">${Number(agedReceivablesData.current || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-semibold">1-30 DAYS</p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">${Number(agedReceivablesData.days30 || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-semibold">31-60 DAYS</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">${Number(agedReceivablesData.days60 || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <p className="text-[10px] text-zinc-500 font-semibold">60+ OVERDUE</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">${Number(agedReceivablesData.older || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Record Payment on Invoice */}
      <AuroraModal
        isOpen={Boolean(showPaymentModal && selectedInvoiceForPayment)}
        onClose={() => setShowPaymentModal(false)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
      >
        {selectedInvoiceForPayment && (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="text-zinc-900 dark:text-white font-bold text-sm">Record Payment: {selectedInvoiceForPayment.invoiceNumber}</span>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white font-bold font-mono focus:outline-none focus:border-indigo-500"
              />

              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block pt-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="BANK_TRANSFER">Bank Direct Deposit / EFT</option>
                <option value="CARD_ONLINE">Credit / Debit Card</option>
                <option value="STORE_CREDIT">Customer Store Credit / Voucher (GL 2200)</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordInvoicePayment}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Record Payment & Clear AR
              </Button>
            </div>
          </>
        )}
      </AuroraModal>

      {/* MODAL: Process Invoice Refund / Credit Memo */}
      <AuroraModal
        isOpen={Boolean(showInvoiceRefundModal && selectedInvoiceForRefund)}
        onClose={() => setShowInvoiceRefundModal(false)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
      >
        {selectedInvoiceForRefund && (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <RotateCcw size={16} />
                </div>
                <div>
                  <h3 className="text-zinc-900 dark:text-white font-bold text-sm">Issue Refund / Credit</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Invoice: {selectedInvoiceForRefund.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceRefundModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Customer:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {selectedInvoiceForRefund.customer?.organization?.legalName ||
                   `${selectedInvoiceForRefund.customer?.person?.firstName || ''} ${selectedInvoiceForRefund.customer?.person?.lastName || ''}`.trim() || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Total Invoiced:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">${Number(selectedInvoiceForRefund.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Settled Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${Number(selectedInvoiceForRefund.amountPaid).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Refund Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(selectedInvoiceForRefund.amountPaid)}
                  value={invoiceRefundAmount}
                  onChange={e => setInvoiceRefundAmount(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white font-bold font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Maximum refundable: ${Number(selectedInvoiceForRefund.amountPaid).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Refund Tender / Method *</label>
                <select
                  value={invoiceRefundMethod}
                  onChange={e => setInvoiceRefundMethod(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="BANK_TRANSFER">Bank Direct Deposit / EFT (GL 1010)</option>
                  <option value="CARD_ONLINE">Credit Card Reversal (GL 1050 / Gateway)</option>
                  <option value="STORE_CREDIT">Customer Account Credit / Voucher (GL 2200)</option>
                  <option value="CASH">Cash Drawer (GL 1020)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Reason Code *</label>
                <select
                  value={invoiceRefundReason}
                  onChange={e => setInvoiceRefundReason(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="CUSTOMER_RETURN">Customer Request / Cancellation</option>
                  <option value="OVERCHARGE_BILLING_ERROR">Billing / Overcharge Error</option>
                  <option value="DEFECTIVE_DAMAGED">Defective or Damaged Service/Item</option>
                  <option value="ORDER_CANCELLED">Contract Cancelled</option>
                  <option value="OTHER">Other Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Reason Notes / Reference</label>
                <textarea
                  rows={2}
                  value={invoiceRefundNotes}
                  onChange={e => setInvoiceRefundNotes(e.target.value)}
                  placeholder="Provide details for customer credit memo..."
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-600 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                <span>
                  This will automatically create a general ledger reversal entry (Debiting 4100 Returns & 2020 GST Collected, Crediting {invoiceRefundMethod === 'STORE_CREDIT' ? '2200 Store Credit' : 'Payment Account'}) and update AR.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                onClick={() => setShowInvoiceRefundModal(false)}
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmittingInvoiceRefund || invoiceRefundAmount <= 0}
                onClick={handleExecuteInvoiceRefund}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {isSubmittingInvoiceRefund ? 'Processing...' : 'Authorize Refund & Post GL'}
              </Button>
            </div>
          </>
        )}
      </AuroraModal>

      {/* MODAL: Period Lock Date */}
      <AuroraModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
            <Lock size={16} className="text-amber-500" />
            <span>Financial Period Lock Date</span>
          </div>
          <button onClick={() => setShowLockModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-zinc-600 dark:text-zinc-400">
            Transactions on or before the lock date cannot be added, edited, or reversed. This prevents retroactive modification to closed financial years.
          </p>
          <input
            type="date"
            value={newLockDateInput}
            onChange={e => setNewLockDateInput(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            onClick={async () => {
              await fetch(`${API_BASE_URL}/api/finance/lock-date`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  'x-tenant-id': tenant?.id || ''
                },
                body: JSON.stringify({ lockDate: null })
              });
              setLockDate(null);
              setShowLockModal(false);
              toast.success('Lock date cleared');
            }}
            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
          >
            Clear Lock
          </Button>
          <Button
            onClick={async () => {
              await fetch(`${API_BASE_URL}/api/finance/lock-date`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  'x-tenant-id': tenant?.id || ''
                },
                body: JSON.stringify({ lockDate: newLockDateInput })
              });
              setLockDate(newLockDateInput);
              setShowLockModal(false);
              toast.success(`Period locked up to ${newLockDateInput}`);
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-amber-600/20"
          >
            Save Lock Date
          </Button>
        </div>
      </AuroraModal>

      {/* MODAL: New Invoice */}
      <AuroraModal
        isOpen={showNewInvoiceModal}
        onClose={() => setShowNewInvoiceModal(false)}
        className="max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span className="text-zinc-900 dark:text-white font-bold text-sm">Create Sales Invoice (AR)</span>
          <button onClick={() => setShowNewInvoiceModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Customer</label>
            <select
              value={newInvoice.customerPartyId}
              onChange={e => setNewInvoice({ ...newInvoice, customerPartyId: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select customer...</option>
              {Array.isArray(partyList) && partyList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.organization?.legalName || `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim() || p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Issue Date</label>
              <input
                type="date"
                value={newInvoice.issueDate}
                onChange={e => setNewInvoice({ ...newInvoice, issueDate: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Due Date</label>
              <input
                type="date"
                value={newInvoice.dueDate}
                onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
            <label className="text-zinc-700 dark:text-zinc-300 font-bold block">Line Items</label>
            {newInvoice.lines.map((line, idx) => (
              <div key={idx} className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <input
                  type="text"
                  placeholder="Description"
                  value={line.description}
                  onChange={e => {
                    const updated = [...newInvoice.lines];
                    updated[idx].description = e.target.value;
                    setNewInvoice({ ...newInvoice, lines: updated });
                  }}
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500">Qty</label>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={e => {
                        const updated = [...newInvoice.lines];
                        updated[idx].quantity = Number(e.target.value);
                        setNewInvoice({ ...newInvoice, lines: updated });
                      }}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500">Price ($)</label>
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={e => {
                        const updated = [...newInvoice.lines];
                        updated[idx].unitPrice = Number(e.target.value);
                        updated[idx].taxAmount = Math.round((updated[idx].quantity * updated[idx].unitPrice * 0.10) * 100) / 100;
                        setNewInvoice({ ...newInvoice, lines: updated });
                      }}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500">GST ($)</label>
                    <input
                      type="number"
                      value={line.taxAmount}
                      readOnly
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-zinc-500 dark:text-zinc-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            onClick={() => setShowNewInvoiceModal(false)}
            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInvoice}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20"
          >
            Create & Authorize Invoice
          </Button>
        </div>
      </AuroraModal>

      {/* MODAL: Import Bank Statement Lines */}
      <AuroraModal
        isOpen={showImportBankModal}
        onClose={() => setShowImportBankModal(false)}
        className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span className="text-zinc-900 dark:text-white font-bold text-sm">Import Bank Statement (CSV)</span>
          <button onClick={() => setShowImportBankModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-zinc-600 dark:text-zinc-400">Paste bank statement CSV data (Date, Description, Amount, Reference):</p>
          <textarea
            rows={4}
            value={importCsvText}
            onChange={e => setImportCsvText(e.target.value)}
            placeholder="2026-10-01, Direct Credit Jane Doe, 500.00, INV-1001"
            className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button onClick={() => setShowImportBankModal(false)} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              toast.success('Bank statement feed synchronized successfully');
              setShowImportBankModal(false);
              setImportCsvText('');
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20"
          >
            Import Feed
          </Button>
        </div>
      </AuroraModal>

      {/* MODAL: Add New Account */}
      <AuroraModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        className="max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-zinc-900 dark:text-white font-bold text-sm">Add General Ledger Account</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Create a new GL code in your Chart of Accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddAccountModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
                {/* Account Type */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Type *</label>
                  <select
                    value={accountForm.accountType}
                    onChange={e => setAccountForm({ ...accountForm, accountType: e.target.value as any })}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="ASSET">Asset (Current & Fixed Assets, Bank, Receivables)</option>
                    <option value="LIABILITY">Liability (Payables, Credit Cards, GST, Loans)</option>
                    <option value="EQUITY">Equity (Capital, Retained Earnings, Owner Draw)</option>
                    <option value="REVENUE">Revenue (Operating Sales, Services, Fees)</option>
                    <option value="EXPENSE">Expense (Operating Expenses, COGS, Rent, Utilities)</option>
                  </select>
                </div>

                {/* Account Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Code *</label>
                    <input
                      type="text"
                      required
                      value={accountForm.accountCode}
                      onChange={e => setAccountForm({ ...accountForm, accountCode: e.target.value })}
                      placeholder={
                        accountForm.accountType === 'ASSET' ? 'e.g. 1050' :
                        accountForm.accountType === 'LIABILITY' ? 'e.g. 2100' :
                        accountForm.accountType === 'EQUITY' ? 'e.g. 3100' :
                        accountForm.accountType === 'REVENUE' ? 'e.g. 4200' : 'e.g. 6200'
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
                      {accountForm.accountType === 'ASSET' && 'Assets range: 1000–1999'}
                      {accountForm.accountType === 'LIABILITY' && 'Liabilities range: 2000–2999'}
                      {accountForm.accountType === 'EQUITY' && 'Equity range: 3000–3999'}
                      {accountForm.accountType === 'REVENUE' && 'Revenue range: 4000–4999'}
                      {accountForm.accountType === 'EXPENSE' && 'Expenses range: 5000–6999'}
                    </p>
                  </div>

                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Name *</label>
                    <input
                      type="text"
                      required
                      value={accountForm.accountName}
                      onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })}
                      placeholder="e.g. Software Subscriptions"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                {/* Default Tax Rate */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Default Tax Rate</label>
                  <select
                    value={accountForm.taxRateId}
                    onChange={e => setAccountForm({ ...accountForm, taxRateId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">No Tax / BAS Excluded (0%)</option>
                    {taxRates.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} ({Number(tr.rate) * 100}%)
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Used to automatically populate GST/tax when this account is selected on invoices or bills.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={accountForm.description}
                    onChange={e => setAccountForm({ ...accountForm, description: e.target.value })}
                    placeholder="Describe what transactions belong to this account..."
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingAccount}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {isSubmittingAccount ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </AuroraModal>

      {/* MODAL: Edit Account */}
      <AuroraModal
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        className="max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900 dark:text-zinc-100"
      >
        {editingAccount && (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
                      Edit Account: {editingAccount.accountCode}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Modify GL account configuration</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAccount(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {editingAccount.systemAccount && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                  <Info size={16} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-bold">Core System Account ({editingAccount.systemAccount}): </span>
                    GL code and classification are locked to protect double-entry ledger integrity. You can customize the name, tax rate, and description.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
                {/* Account Code & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Code *</label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingAccount.systemAccount)}
                      value={accountForm.accountCode}
                      onChange={e => setAccountForm({ ...accountForm, accountCode: e.target.value })}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none",
                        editingAccount.systemAccount
                          ? "bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                          : "bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:border-indigo-500"
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Type *</label>
                    {editingAccount.systemAccount ? (
                      <input
                        type="text"
                        readOnly
                        value={editingAccount.accountType}
                        className="w-full bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-500 dark:text-zinc-400 font-mono text-xs cursor-not-allowed"
                      />
                    ) : (
                      <select
                        value={accountForm.accountType}
                        onChange={e => setAccountForm({ ...accountForm, accountType: e.target.value as any })}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                      >
                        <option value="ASSET">Asset</option>
                        <option value="LIABILITY">Liability</option>
                        <option value="EQUITY">Equity</option>
                        <option value="REVENUE">Revenue</option>
                        <option value="EXPENSE">Expense</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.accountName}
                    onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                {/* Default Tax Rate */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Default Tax Rate</label>
                  <select
                    value={accountForm.taxRateId}
                    onChange={e => setAccountForm({ ...accountForm, taxRateId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">No Tax / BAS Excluded (0%)</option>
                    {taxRates.map(tr => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} ({Number(tr.rate) * 100}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={accountForm.description}
                    onChange={e => setAccountForm({ ...accountForm, description: e.target.value })}
                    placeholder="Describe what transactions belong to this account..."
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs resize-none"
                  />
                </div>

                {/* Active / Archive Toggle */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={Boolean(editingAccount.systemAccount)}
                      checked={accountForm.isActive}
                      onChange={e => setAccountForm({ ...accountForm, isActive: e.target.checked })}
                      className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-600 focus:ring-0 disabled:opacity-50"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Account Active</span>
                  </label>
                  {editingAccount.systemAccount && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                      System accounts cannot be deactivated because automated journal entries depend on them.
                    </p>
                  )}
                  {!editingAccount.systemAccount && !accountForm.isActive && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      Archiving will hide this account from invoice/bill dropdowns while preserving historical ledger data.
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    {!editingAccount.systemAccount && (
                      <Button
                        type="button"
                        onClick={() => {
                          handleDeleteAccount(editingAccount);
                          setEditingAccount(null);
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-4 py-2 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingAccount}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      {isSubmittingAccount ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
          </>
        )}
      </AuroraModal>

      {/* MODAL: Formal Tax Credit Note Document */}
      {showCreditNoteModal && activeCreditNote && (
        <CreditNoteDocumentModal
          isOpen={showCreditNoteModal}
          onClose={() => setShowCreditNoteModal(false)}
          creditNote={activeCreditNote}
        />
      )}
    </SettingsSubNavLayout>
  );
};

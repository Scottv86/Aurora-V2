import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Plus, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  User as UserIcon, 
  Building2, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Check,
  Briefcase,
  Receipt
} from 'lucide-react';
import { cn, formatLocalizedDate } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { GenerateInvoiceModal } from '../Navigation/Widgets/GenerateInvoiceModal';
import { DirectoryLookup } from '../Common/DirectoryLookup';
import { toast } from 'sonner';

const TIMER_STORAGE_KEY = 'aurora_time_tracker_state_v2';

interface RecordTimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  partyId?: string;
  clientName?: string;
  catalogItemId?: string;
  catalogItemName?: string;
  hourlyRate?: number;
  effectiveRate: number;
  amount: number;
  isBillable: boolean;
  billingStatus: 'UNBILLED' | 'INVOICED' | 'PAID' | 'NON_BILLABLE';
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceStatus?: string;
  authorName?: string;
  authorAvatar?: string;
}

interface RecordTimeStats {
  totalHours: number;
  unbilledHours: number;
  unbilledAmount: number;
  invoicedAmount: number;
  paidAmount: number;
}

interface RecordTimeBillingTabProps {
  record: any;
  moduleId?: string;
  allFields?: any[];
  recordTitle?: string;
}

export const RecordTimeBillingTab: React.FC<RecordTimeBillingTabProps> = ({
  record,
  moduleId,
  allFields = [],
  recordTitle
}) => {
  const { tenant, user: platformUser } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const tenantId = tenant?.id || '';
  const dateFormat = tenant?.localization?.dateFormat || 'DD/MM/YYYY';

  const recordId = record?.id || '';
  const title = recordTitle || record?._title || record?.title || record?.name || 'Current Record';

  const [entries, setEntries] = useState<RecordTimeEntry[]>([]);
  const [stats, setStats] = useState<RecordTimeStats>({
    totalHours: 0,
    unbilledHours: 0,
    unbilledAmount: 0,
    invoicedAmount: 0,
    paidAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNBILLED' | 'INVOICED' | 'PAID'>('ALL');

  // Manual Log form toggle & state
  const [showLogForm, setShowLogForm] = useState(false);
  const [logHours, setLogHours] = useState('1.0');
  const [logDescription, setLogDescription] = useState('');
  const [logRate, setLogRate] = useState('150');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logBillable, setLogBillable] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  // Invoicing Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Auto-detect linked client / party from record fields
  const detectedPartyId = useMemo(() => {
    if (!record) return '';
    if (record.partyId) return record.partyId;
    if (record.customerPartyId) return record.customerPartyId;
    if (record.clientId) return record.clientId;
    if (record.party_id) return record.party_id;

    // Check fields of type 'party'
    for (const field of allFields) {
      if (field.type === 'party' || field.targetPlatformModuleId === 'people-organisations') {
        const val = record[field.id] || record[field.name];
        if (val) {
          return typeof val === 'string' ? val : val.id;
        }
      }
    }
    return '';
  }, [record, allFields]);

  const [selectedPartyId, setSelectedPartyId] = useState<string>(detectedPartyId);

  useEffect(() => {
    if (detectedPartyId && !selectedPartyId) {
      setSelectedPartyId(detectedPartyId);
    }
  }, [detectedPartyId]);

  // Active Timer state synced with localStorage
  const [activeTimer, setActiveTimer] = useState<any>(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isTimingThisRecord = activeTimer?.isRunning && activeTimer?.matterRecordId === recordId;

  // Listen to timer updates across components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(TIMER_STORAGE_KEY);
        setActiveTimer(stored ? JSON.parse(stored) : null);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('aurora-timer-sync', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('aurora-timer-sync', handleStorageChange);
    };
  }, []);

  // Fetch record ledger & WIP data
  const fetchLedger = useCallback(async () => {
    if (!recordId || !tenantId) return;
    setLoading(true);

    try {
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId
      };

      const res = await fetch(`${API_BASE_URL}/api/invoices/wip/record/${recordId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[RecordTimeBillingTab] Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [recordId, tenantId, token]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Start Clock on THIS matter
  const handleStartTimer = () => {
    const newState = {
      isRunning: true,
      startTime: Date.now(),
      accumulatedMs: 0,
      description: `Matter: ${title}`,
      partyId: selectedPartyId || detectedPartyId || '',
      partyName: '',
      catalogItemId: '',
      catalogItemName: '',
      hourlyRate: Number(logRate) || 150,
      isBillable: true,
      billingBlockMinutes: 15,
      matterRecordId: recordId
    };

    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newState));
    setActiveTimer(newState);
    window.dispatchEvent(new CustomEvent('aurora-timer-sync'));
    toast.success(`Clock running for: ${title}`);
  };

  // Stop Clock on THIS matter & save entry
  const handleStopTimer = async () => {
    if (!activeTimer) return;
    const now = Date.now();
    const start = activeTimer.startTime || now;
    const totalMs = (now - start) + (activeTimer.accumulatedMs || 0);
    const hours = Math.max(0.1, Number((totalMs / (1000 * 60 * 60)).toFixed(2)));

    try {
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${API_BASE_URL}/api/invoices/wip/record/${recordId}/log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hours,
          description: activeTimer.description || `Working on ${title}`,
          partyId: activeTimer.partyId || selectedPartyId || null,
          hourlyRate: activeTimer.hourlyRate || 150,
          isBillable: activeTimer.isBillable !== false
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to record timesheet entry');
      }

      toast.success(`Logged ${hours}h billable time to matter`);

      // Reset timer
      const resetState = {
        ...activeTimer,
        isRunning: false,
        startTime: null,
        accumulatedMs: 0,
        matterRecordId: null
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(resetState));
      setActiveTimer(resetState);
      window.dispatchEvent(new CustomEvent('aurora-timer-sync'));

      fetchLedger();
    } catch (err: any) {
      toast.error(err.message || 'Error saving time');
    }
  };

  // Submit manual time log
  const handleLogManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logHours || Number(logHours) <= 0) {
      toast.error('Please enter valid hours');
      return;
    }

    setIsLogging(true);
    try {
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      };

      const res = await fetch(`${API_BASE_URL}/api/invoices/wip/record/${recordId}/log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hours: Number(logHours),
          description: logDescription.trim() || `Professional work on ${title}`,
          date: logDate,
          partyId: selectedPartyId || detectedPartyId || null,
          hourlyRate: Number(logRate) || 150,
          isBillable: logBillable
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to log time');
      }

      toast.success(`Logged ${logHours}h successfully`);
      setLogDescription('');
      setShowLogForm(false);
      fetchLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log time');
    } finally {
      setIsLogging(false);
    }
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (filterStatus === 'ALL') return entries;
    return entries.filter(e => e.billingStatus === filterStatus);
  }, [entries, filterStatus]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* 1. Client / Directory Association Header */}
      <div className="p-3 bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
          <Building2 size={11} />
          <span>Billed Client (Directory)</span>
        </label>
        <DirectoryLookup
          value={selectedPartyId}
          onChange={(partyId) => setSelectedPartyId(partyId)}
          placeholder="Assign client from Directory..."
          dropdownWidth="w-full"
        />
      </div>

      {/* 2. WIP Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Hours */}
        <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-2xs">
          <span className="text-[10px] font-semibold text-zinc-400 block uppercase">
            Total Logged
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
              {stats.totalHours.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500">hrs</span>
          </div>
        </div>

        {/* Unbilled WIP Amount */}
        <div className={cn(
          "p-3 rounded-xl border shadow-2xs transition-all",
          stats.unbilledAmount > 0
            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30"
            : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800"
        )}>
          <span className={cn(
            "text-[10px] font-semibold block uppercase",
            stats.unbilledAmount > 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-zinc-400"
          )}>
            Unbilled WIP
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={cn(
              "text-xl font-extrabold font-mono",
              stats.unbilledAmount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"
            )}>
              ${stats.unbilledAmount.toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-500">AUD</span>
          </div>
        </div>
      </div>

      {/* 3. Matter Invoicing Banner */}
      {stats.unbilledAmount > 0 && (
        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/60 dark:border-indigo-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-left">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block leading-tight">
                Ready to Invoice ({stats.unbilledHours.toFixed(1)}h WIP)
              </span>
              <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                Generate official sales invoice for this matter
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer shrink-0"
          >
            Bill Matter
          </button>
        </div>
      )}

      {/* 4. Active Clock / Clock-In Controls */}
      <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Clock size={13} className="text-emerald-500" />
            <span>Time Tracking Actions</span>
          </span>
          <button
            type="button"
            onClick={() => setShowLogForm(!showLogForm)}
            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={11} />
            <span>{showLogForm ? 'Hide Form' : 'Log Past Time'}</span>
          </button>
        </div>

        {/* Live Timer Status on this record */}
        {isTimingThisRecord ? (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block leading-tight">
                  Timer Running on this Matter
                </span>
                <span className="text-[10px] text-zinc-500">
                  Accruing billable hours in background
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStopTimer}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm cursor-pointer"
            >
              <Square size={10} />
              <span>Stop & Save</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartTimer}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
          >
            <Play size={12} />
            <span>Start Clock on this Matter</span>
          </button>
        )}

        {/* Manual Log Time Form */}
        {showLogForm && (
          <form onSubmit={handleLogManualTime} className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5 text-left">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Hours</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Rate ($/hr)</label>
                <input
                  type="number"
                  step="5"
                  value={logRate}
                  onChange={(e) => setLogRate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Description / Activity Note</label>
              <input
                type="text"
                placeholder="e.g. Contract review & legal advice"
                value={logDescription}
                onChange={(e) => setLogDescription(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={logBillable}
                  onChange={(e) => setLogBillable(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-medium">Billable</span>
              </label>

              <button
                type="submit"
                disabled={isLogging}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLogging ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                <span>Save Entry</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 5. Timesheet Entries Ledger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Recorded Time Sessions ({entries.length})
          </span>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(['ALL', 'UNBILLED', 'INVOICED', 'PAID'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer",
                  filterStatus === s
                    ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <Loader2 size={13} className="animate-spin text-indigo-500" />
            <span>Loading matter time ledger...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 italic">
            No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} time sessions recorded for this matter.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl flex flex-col gap-1.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {Number(entry.hours).toFixed(1)}h
                    </span>
                    <span className="text-[11px] font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                      ${entry.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      (@ ${entry.effectiveRate}/hr)
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      entry.billingStatus === 'PAID'
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : entry.billingStatus === 'INVOICED'
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                        : entry.billingStatus === 'UNBILLED' && entry.isBillable
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {entry.billingStatus}
                  </span>
                </div>

                {/* Description */}
                {entry.description && (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">
                    {entry.description}
                  </p>
                )}

                {/* Metadata Footer */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5">
                    <UserIcon size={10} />
                    <span>{entry.authorName || 'Author'}</span>
                    <span>•</span>
                    <span>{formatLocalizedDate(entry.date, dateFormat)}</span>
                  </div>

                  {entry.invoiceNumber && (
                    <span className="text-sky-600 dark:text-sky-400 font-mono font-semibold">
                      {entry.invoiceNumber}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Matter Invoicing Modal */}
      {isInvoiceModalOpen && (
        <GenerateInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          selectedPartyId={selectedPartyId}
          matterRecordId={recordId}
          onInvoiceCreated={() => {
            fetchLedger();
            toast.success('Invoice issued successfully!');
          }}
        />
      )}
    </div>
  );
};

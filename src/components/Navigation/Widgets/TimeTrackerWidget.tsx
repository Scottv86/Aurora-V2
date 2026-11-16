import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  SlidersHorizontal, 
  Briefcase,
  Send,
  Loader2,
  Building2,
  Tag,
  DollarSign,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { WidgetCommonProps } from './types';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { GenerateInvoiceModal } from './GenerateInvoiceModal';
import { DirectoryLookup } from '../../Common/DirectoryLookup';
import { toast } from 'sonner';

interface TimesheetEntryItem {
  id?: string;
  date: string;
  hours: number;
  description?: string;
  partyId?: string;
  clientName?: string;
  catalogItemId?: string;
  hourlyRate?: number;
  isBillable?: boolean;
  billingStatus?: string;
}

interface ClientOption {
  id: string;
  displayName: string;
  email?: string;
}

interface RateOption {
  id: string;
  name: string;
  basePrice: number;
  code: string;
  billingBlockMinutes?: number;
}

const TIMER_STORAGE_KEY = 'aurora_time_tracker_state_v2';

interface StoredTimerState {
  isRunning: boolean;
  startTime: number | null;
  accumulatedMs: number;
  description: string;
  partyId: string;
  partyName: string;
  catalogItemId: string;
  catalogItemName: string;
  hourlyRate: number;
  isBillable: boolean;
  billingBlockMinutes: number;
}

export const TimeTrackerWidget: React.FC<WidgetCommonProps> = ({ onOpenCustomize, isCompact }) => {
  const navigate = useNavigate();
  const { user: platformUser, tenant } = usePlatform();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Pricing Catalog state
  const [rateOptions, setRateOptions] = useState<RateOption[]>([]);

  // Active Timer state
  const [timerState, setTimerState] = useState<StoredTimerState>(() => {
    try {
      const stored = localStorage.getItem(TIMER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      isRunning: false,
      startTime: null,
      accumulatedMs: 0,
      description: '',
      partyId: '',
      partyName: '',
      catalogItemId: '',
      catalogItemName: '',
      hourlyRate: 150,
      isBillable: true,
      billingBlockMinutes: 15
    };
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [taskDescription, setTaskDescription] = useState<string>(timerState.description || '');

  // Timesheet state
  const [activeTimesheetId, setActiveTimesheetId] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimesheetEntryItem[]>([]);
  const [allWeekEntries, setAllWeekEntries] = useState<TimesheetEntryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');

  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const targetMemberId = platformUser?.memberId || 'me';
  const tenantId = tenant?.id;

  // Load Service Rates from Pricing Catalog (/api/pricing-catalog)
  useEffect(() => {
    if (!tenantId) return;
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-tenant-id': tenantId
    };

    fetch(`${API_BASE_URL}/api/pricing-catalog`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || [];
        const services = list
          .filter((item: any) => item.priceType === 'TIME' || item.type === 'SERVICE' || item.basePrice > 0)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            basePrice: Number(item.basePrice || 0),
            code: item.code || '',
            billingBlockMinutes: item.billingBlockMinutes || 15
          }));

        setRateOptions(services);
        if (services.length > 0 && !timerState.catalogItemId) {
          setTimerState((prev) => ({
            ...prev,
            catalogItemId: services[0].id,
            catalogItemName: services[0].name,
            hourlyRate: services[0].basePrice,
            billingBlockMinutes: services[0].billingBlockMinutes || 15
          }));
        }
      })
      .catch((err) => console.warn('[TimeTracker] Could not load catalog rates:', err));
  }, [tenantId, token]);

  // Calculate elapsed time from stored start epoch
  const calculateElapsed = useCallback(() => {
    if (!timerState.isRunning || !timerState.startTime) {
      return Math.floor(timerState.accumulatedMs / 1000);
    }
    const currentRun = Date.now() - timerState.startTime;
    return Math.floor((timerState.accumulatedMs + currentRun) / 1000);
  }, [timerState]);

  useEffect(() => {
    setElapsedSeconds(calculateElapsed());
  }, [calculateElapsed]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerState.isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, calculateElapsed]);

  // Sync timer state to localStorage for refresh resilience
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    } catch (e) {}
  }, [timerState]);

  // Fetch current timesheet from backend
  const fetchTimesheetData = useCallback(async () => {
    if (!tenantId) return;
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId
      };

      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/hr`, { headers });
      if (!res.ok) return;

      const data = await res.json();
      const timesheets = data.timesheets || [];
      if (timesheets.length > 0) {
        const active = timesheets[0];
        setActiveTimesheetId(active.id);
        setPeriodStart(active.periodStart);
        setPeriodEnd(active.periodEnd);
        const entries: TimesheetEntryItem[] = active.entries || [];
        setAllWeekEntries(entries);

        const todayIso = new Date().toISOString().split('T')[0];
        const todays = entries.filter((e) => e.date?.startsWith(todayIso));
        setTodayEntries(todays);
      }
    } catch (err) {
      console.warn('[TimeTrackerWidget] Could not load timesheet data:', err);
    }
  }, [tenantId, targetMemberId, token]);

  useEffect(() => {
    fetchTimesheetData();
  }, [fetchTimesheetData]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking within a modal (e.g. CreatePartyModal)
      const isModalClick = (e.target as Element)?.closest?.('[data-aurora-modal], [role="dialog"], .aurora-modal-backdrop');
      if (isModalClick) return;

      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calculate billable hours respecting billingBlockMinutes (e.g. 6m law firm block, 15m block, or standard)
  const computeBillableHours = (totalSecs: number, blockMins: number = 15) => {
    if (totalSecs <= 0) return 0;
    const rawMinutes = Math.ceil(totalSecs / 60);
    if (blockMins > 0) {
      const roundedMinutes = Math.ceil(rawMinutes / blockMins) * blockMins;
      return Number((roundedMinutes / 60).toFixed(2));
    }
    return Number((totalSecs / 3600).toFixed(2));
  };

  const currentHours = computeBillableHours(elapsedSeconds, timerState.billingBlockMinutes);
  const currentAccruedFee = timerState.isBillable ? Math.round(currentHours * timerState.hourlyRate * 100) / 100 : 0;

  // Timer Actions
  const handleStart = () => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
      description: taskDescription
    }));
  };

  const handlePause = () => {
    if (!timerState.isRunning || !timerState.startTime) return;
    const currentRun = Date.now() - timerState.startTime;
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      startTime: null,
      accumulatedMs: prev.accumulatedMs + currentRun,
      description: taskDescription
    }));
  };

  const handleDiscard = () => {
    if (confirm('Discard current timer recording?')) {
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedMs: 0,
        description: ''
      }));
      setTaskDescription('');
      setElapsedSeconds(0);
    }
  };

  // Stop & Log Time directly to PostgreSQL database
  const handleStopAndSave = async () => {
    const currentSeconds = calculateElapsed();
    if (currentSeconds < 30) {
      toast.error('Timer duration is too short to log (minimum 30 seconds)');
      return;
    }

    const hours = Math.max(0.1, computeBillableHours(currentSeconds, timerState.billingBlockMinutes));

    setIsSaving(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId!
      };

      const updatedEntries = [
        ...allWeekEntries.map((e) => ({
          date: e.date,
          hours: e.hours,
          description: e.description,
          partyId: e.partyId,
          catalogItemId: e.catalogItemId,
          hourlyRate: e.hourlyRate,
          isBillable: e.isBillable,
          billingStatus: e.billingStatus
        })),
        {
          date: new Date().toISOString(),
          hours,
          description: taskDescription.trim() || `${timerState.catalogItemName || 'Professional Services'} work`,
          partyId: timerState.partyId || null,
          catalogItemId: timerState.catalogItemId || null,
          hourlyRate: timerState.hourlyRate,
          currency: 'AUD',
          isBillable: timerState.isBillable,
          billingStatus: timerState.isBillable ? 'UNBILLED' : 'NON_BILLABLE'
        }
      ];

      const res = await fetch(`${API_BASE_URL}/api/members/${targetMemberId}/timesheets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          timesheetId: activeTimesheetId || undefined,
          periodStart: periodStart || new Date().toISOString(),
          periodEnd: periodEnd || new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
          status: 'Draft',
          entries: updatedEntries
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save timesheet entry');
      }

      toast.success(
        `Logged ${hours}h ${timerState.isBillable ? `($${(hours * timerState.hourlyRate).toFixed(2)} AUD WIP)` : ''} to timesheet`
      );

      // Reset timer
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedMs: 0,
        description: ''
      }));
      setTaskDescription('');
      setElapsedSeconds(0);
      await fetchTimesheetData();
    } catch (err: any) {
      console.error('[TimeTrackerWidget] Error saving entry:', err);
      toast.error(err.message || 'Error saving time');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${hh}:${mm}:${ss}`;
  };

  const todayTotalHours = todayEntries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
  const targetDailyHours = 7.6;
  const progressPercent = Math.min(100, Math.round((todayTotalHours / targetDailyHours) * 100));

  return (
    <>
      <div className="relative" ref={popoverRef}>
        {/* Glance Navbar Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left select-none cursor-pointer group",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
            isOpen && "bg-zinc-100 dark:bg-zinc-800"
          )}
          title={
            timerState.isRunning
              ? `Tracking ${timerState.isBillable ? `$${currentAccruedFee.toFixed(2)}` : ''} - ${timerState.partyName || taskDescription || 'Working'}`
              : `Time Tracker: ${todayTotalHours.toFixed(1)}h logged today`
          }
        >
          <div
            className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
              timerState.isRunning
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
          )}
        >
          <Clock size={12} className={cn(timerState.isRunning && "animate-spin text-emerald-500 duration-[4000ms]")} />
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1 font-mono">
              {timerState.isRunning ? formatTimer(elapsedSeconds) : `${todayTotalHours.toFixed(1)}h`}
              {timerState.isRunning && timerState.isBillable && timerState.hourlyRate > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
                  • ${currentAccruedFee.toFixed(0)}
                </span>
              )}
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  timerState.isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                )}
              />
            </span>
            {!isCompact && (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 tracking-tight max-w-[105px] truncate">
                {timerState.isRunning
                  ? (timerState.partyName || taskDescription.trim() || 'Billable Time')
                  : `${Math.round(progressPercent)}% of day`}
              </span>
            )}
          </div>
        </button>

        {/* Detail Popover Card */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-[370px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-visible z-[65] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Billable Time Tracker</span>
              </div>
              <div className="flex items-center gap-1">
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCustomize();
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title="Customize widgets"
                  >
                    <SlidersHorizontal size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Active Timer & Accrued Dollars Display */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 text-center">
              <div className="text-3xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-white">
                {formatTimer(elapsedSeconds)}
              </div>
              {timerState.isBillable && timerState.hourlyRate > 0 && (
                <div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ${currentAccruedFee.toFixed(2)} AUD{' '}
                  <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                    ({currentHours.toFixed(2)}h @ ${timerState.hourlyRate}/hr)
                  </span>
                </div>
              )}

              {/* Client & Rate Selectors */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-left">
                {/* Client / Directory Lookup */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Building2 size={10} />
                    <span>Client (Directory)</span>
                  </label>
                  <DirectoryLookup
                    value={timerState.partyId}
                    onChange={(partyId, party) => {
                      setTimerState((prev) => ({
                        ...prev,
                        partyId,
                        partyName: party?.displayName || ''
                      }));
                    }}
                    placeholder="-- Internal / General --"
                    dropdownWidth="w-[335px]"
                  />
                </div>

                {/* Rate from Pricing Catalog */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Tag size={10} />
                    <span>Rate (Catalog)</span>
                  </label>
                  <select
                    value={timerState.catalogItemId}
                    onChange={(e) => {
                      const sel = rateOptions.find((r) => r.id === e.target.value);
                      if (sel) {
                        setTimerState((prev) => ({
                          ...prev,
                          catalogItemId: sel.id,
                          catalogItemName: sel.name,
                          hourlyRate: sel.basePrice,
                          billingBlockMinutes: sel.billingBlockMinutes || 15
                        }));
                      }
                    }}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-zinc-900 dark:text-zinc-100 font-medium truncate cursor-pointer"
                  >
                    {rateOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (${r.basePrice}/hr)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task description */}
              <div className="mt-2 text-left">
                <input
                  type="text"
                  value={taskDescription}
                  onChange={(e) => {
                    setTaskDescription(e.target.value);
                    setTimerState((prev) => ({ ...prev, description: e.target.value }));
                  }}
                  placeholder="Task / case note (e.g. Contract Drafting)"
                  className="w-full text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </div>

              {/* Billable Toggle & Timer Controls */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={timerState.isBillable}
                    onChange={(e) => setTimerState((prev) => ({ ...prev, isBillable: e.target.checked }))}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Billable to Client</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {!timerState.isRunning ? (
                    <button
                      type="button"
                      onClick={handleStart}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
                    >
                      <Play size={11} />
                      <span>{elapsedSeconds > 0 ? 'Resume' : 'Clock In'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm cursor-pointer"
                    >
                      <Pause size={11} />
                      <span>Pause</span>
                    </button>
                  )}

                  {elapsedSeconds > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleStopAndSave}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Save billable time entry to database"
                      >
                        {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 text-zinc-500 transition-colors cursor-pointer"
                        title="Discard recording"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Logged Entries */}
            <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
                Today's Recorded Sessions
              </div>
              {todayEntries.length > 0 ? (
                todayEntries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="px-2 py-1 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-800 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">
                      {entry.description || 'Professional Work'}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 font-mono">
                      {Number(entry.hours).toFixed(2)}h
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-[11px] text-zinc-400">
                  No sessions logged today yet.
                </div>
              )}
            </div>

            {/* Footer Actions: Invoicing Integration */}
            <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsInvoiceModalOpen(true);
                }}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Generate invoice from unbilled WIP"
              >
                <FileText size={12} />
                <span>Bill Unbilled Time (WIP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/workspace');
                  window.dispatchEvent(new CustomEvent('aurora:open-account-tab', { detail: { tab: 'timesheet' } }));
                }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>Timesheets</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Generation Modal */}
      <GenerateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        selectedPartyId={timerState.partyId}
        onInvoiceCreated={() => {
          fetchTimesheetData();
        }}
      />
    </>
  );
};

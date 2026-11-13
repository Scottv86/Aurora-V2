import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Send, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Calendar, 
  AlertCircle,
  FileCheck2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MemberHRData, TimesheetEntry } from './types';
import { toast } from 'sonner';

interface TimesheetTabProps {
  hrData: MemberHRData;
  onSaveTimesheet: (payload: {
    timesheetId?: string;
    periodStart: string;
    periodEnd: string;
    status?: 'Draft' | 'Submitted';
    entries: Array<{ date: string; hours: number; description?: string }>;
  }) => Promise<boolean>;
  onSubmitTimesheet: (timesheetId: string) => Promise<boolean>;
}

export const TimesheetTab: React.FC<TimesheetTabProps> = ({ 
  hrData, 
  onSaveTimesheet, 
  onSubmitTimesheet 
}) => {
  const activeTimesheet = hrData.timesheets[0];

  // Compute Monday date for current period
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const [periodStart] = useState<Date>(
    activeTimesheet?.periodStart ? new Date(activeTimesheet.periodStart) : getStartOfWeek()
  );

  // Initialize 5 working days (Mon-Fri)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const [entries, setEntries] = useState<Array<{ day: string; date: string; hours: number; description: string }>>(() => {
    return dayNames.map((name, i) => {
      const dayDate = new Date(periodStart);
      dayDate.setDate(periodStart.getDate() + i);
      const isoDate = dayDate.toISOString().split('T')[0];
      
      const existing = activeTimesheet?.entries?.find(e => e.date?.startsWith(isoDate));
      return {
        day: name,
        date: isoDate,
        hours: existing ? existing.hours : 7.6,
        description: existing?.description || (i % 2 === 0 ? 'Core Architecture & Platform Engineering' : 'Sprint Features & Peer Code Review')
      };
    });
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
  const targetHours = 38.0;
  const overtimeHours = Math.max(0, totalHours - targetHours);

  const handleHourChange = (index: number, val: string) => {
    const num = Math.max(0, Math.min(24, parseFloat(val) || 0));
    setEntries(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], hours: num };
      return copy;
    });
  };

  const handleDescChange = (index: number, val: string) => {
    setEntries(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description: val };
      return copy;
    });
  };

  const handleFillStandard = () => {
    setEntries(prev => prev.map((e, idx) => ({
      ...e,
      hours: 7.6,
      description: e.description || (idx % 2 === 0 ? 'Core Architecture & Platform Engineering' : 'Sprint Features & Code Reviews')
    })));
    toast.info('Filled standard 38 hours (7.6h x 5 days)');
  };

  const handleResetZero = () => {
    setEntries(prev => prev.map(e => ({ ...e, hours: 0, description: '' })));
  };

  const handleSave = async (status: 'Draft' | 'Submitted' = 'Draft') => {
    setIsSaving(true);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);

    const payload = {
      timesheetId: activeTimesheet?.id,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      status,
      entries: entries.map(e => ({
        date: new Date(e.date).toISOString(),
        hours: e.hours,
        description: e.description
      }))
    };

    const ok = await onSaveTimesheet(payload);
    setIsSaving(false);
    return ok;
  };

  const handleSubmitForSignoff = async () => {
    if (activeTimesheet?.id) {
      setIsSubmitting(true);
      await onSubmitTimesheet(activeTimesheet.id);
      setIsSubmitting(false);
    } else {
      await handleSave('Submitted');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-purple-500" />
            Working Hours & Timesheet
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Log your daily project hours, view overtime accrual, and submit weekly timesheets for payroll.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleFillStandard}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1.5"
          >
            <Sparkles size={13} className="text-purple-400" />
            Fill Standard 38h
          </button>
          <button
            onClick={() => handleSave('Draft')}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all flex items-center gap-1.5"
          >
            <Save size={13} />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmitForSignoff}
            disabled={isSubmitting || activeTimesheet?.status === 'Submitted'}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={13} />
            {activeTimesheet?.status === 'Submitted' ? 'Submitted' : 'Submit for Sign-Off'}
          </button>
        </div>
      </div>

      {/* Week Progress Bar & Indicators */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Pay Period:</span>
            <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
              {periodStart.toLocaleDateString()} – {new Date(periodStart.getTime() + 6 * 24 * 3600 * 1000).toLocaleDateString()}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTimesheet?.status === 'Submitted'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {activeTimesheet?.status || 'Draft'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Standard contractual baseline: 38.0 hours/week (7.6h daily standard)
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-zinc-500">Total Hours</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold font-mono ${
                totalHours >= targetHours ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'
              }`}>
                {totalHours.toFixed(1)}h
              </span>
              <span className="text-xs text-zinc-400">/ {targetHours}h</span>
            </div>
          </div>

          {overtimeHours > 0 && (
            <div className="text-right pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-amber-500 font-medium">Overtime / TOIL</span>
              <p className="text-xl font-bold font-mono text-amber-400">+{overtimeHours.toFixed(1)}h</p>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column (8 cols): Daily Entries Grid */}
        <div className="xl:col-span-8 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Clock size={14} className="text-purple-500" />
              Daily Time Entries (Mon – Fri)
            </h3>
            <button
              onClick={handleResetZero}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              Reset to 0h
            </button>
          </div>

          <div className="space-y-2.5">
            {entries.map((entry, idx) => (
              <div
                key={entry.day}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
              >
                {/* Day name & date */}
                <div className="w-36 shrink-0 space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {entry.day}
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Description */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Log activity, tasks, or project work..."
                    value={entry.description}
                    onChange={(e) => handleDescChange(idx, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Hours input */}
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={entry.hours}
                    onChange={(e) => handleHourChange(idx, e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl text-xs font-mono font-bold text-center bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-xs text-zinc-500 w-8">hrs</span>
                </div>
              </div>
            ))}
          </div>

          {/* Auto-fill & Overtime policy notice */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-purple-400 shrink-0" />
              <p className="text-xs text-zinc-400">
                Approved timesheets automatically calculate Time-in-Lieu (TOIL) or overtime allowances for payroll on the fortnightly cycle.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Timesheet Summary & Submission Card */}
        <div className="xl:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <FileCheck2 size={14} className="text-purple-500" />
              Period Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Regular Contract Hours</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-white">{Math.min(totalHours, targetHours).toFixed(1)} / 38.0h</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Overtime / TOIL Hours</span>
                <span className="font-mono font-semibold text-amber-500">+{overtimeHours.toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Direct Approver</span>
                <span className="font-semibold text-zinc-900 dark:text-white">Sarah Lin (Lead)</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-500">Payroll Cut-Off</span>
                <span className="font-semibold text-zinc-900 dark:text-white">Friday 5:00 PM</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSubmitForSignoff}
                disabled={isSubmitting || activeTimesheet?.status === 'Submitted'}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={14} />
                {activeTimesheet?.status === 'Submitted' ? 'Timesheet Submitted' : 'Submit Weekly Timesheet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

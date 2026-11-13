import React, { useState } from 'react';
import { 
  MapPin, 
  Home, 
  Building2, 
  Plane, 
  Clock, 
  CheckCircle2, 
  Save, 
  Sparkles, 
  HelpCircle,
  Laptop,
  CalendarDays
} from 'lucide-react';
import { MemberHRData, WorkArrangementsData, WorkSchedule } from './types';
import { toast } from 'sonner';

interface WorkArrangementsTabProps {
  hrData: MemberHRData;
  onUpdateArrangements: (arrangements: WorkArrangementsData) => Promise<boolean>;
}

export const WorkArrangementsTab: React.FC<WorkArrangementsTabProps> = ({ 
  hrData, 
  onUpdateArrangements 
}) => {
  const defaultSchedule: WorkSchedule = {
    monday: 'Home',
    tuesday: 'Office',
    wednesday: 'Office',
    thursday: 'Office',
    friday: 'Home'
  };

  const initialSchedule = hrData.workArrangements?.schedule || defaultSchedule;
  const [schedule, setSchedule] = useState<WorkSchedule>(initialSchedule);
  const [pattern, setPattern] = useState(hrData.workArrangements?.pattern || 'Hybrid (3 Days Office / 2 Days Home)');
  const [location, setLocation] = useState(hrData.workArrangements?.location || 'Sydney HQ & Home Office');
  const [notes, setNotes] = useState(hrData.workArrangements?.notes || 'Standard flexible hybrid schedule');
  const [isSaving, setIsSaving] = useState(false);
  const [showVariationForm, setShowVariationForm] = useState(false);

  const daysList: Array<{ key: keyof WorkSchedule; label: string }> = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' }
  ];

  const cycleStatus = (dayKey: keyof WorkSchedule) => {
    const states: Array<WorkSchedule[keyof WorkSchedule]> = ['Office', 'Home', 'Client', 'Off'];
    const current = schedule[dayKey];
    const nextIdx = (states.indexOf(current) + 1) % states.length;
    setSchedule(prev => ({
      ...prev,
      [dayKey]: states[nextIdx]
    }));
  };

  // Compute tally
  const counts = Object.values(schedule).reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    const updatedPattern = `${counts['Office'] || 0} Office / ${counts['Home'] || 0} Home Hybrid`;
    setPattern(updatedPattern);

    const payload: WorkArrangementsData = {
      pattern: updatedPattern,
      schedule,
      location,
      notes,
      flexibleHours: true
    };

    await onUpdateArrangements(payload);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <MapPin size={18} className="text-amber-500" />
            Work Arrangements & Hybrid Schedule
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage your remote and in-office schedule, coordinate desk availability, and submit flexible working requests.
          </p>
        </div>

        <button
          onClick={handleSaveSchedule}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Save Weekly Schedule'}
        </button>
      </div>

      {/* Arrangement Banner Card */}
      <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Current Arrangement:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {pattern}
            </span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">
            Primary Base: <span className="font-semibold">{location}</span>
          </p>
          <p className="text-[11px] text-zinc-500 max-w-2xl">
            {notes}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="p-3.5 px-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center shadow-sm">
            <span className="text-xs text-zinc-400">Office Days</span>
            <p className="text-xl font-bold text-indigo-500">{counts['Office'] || 0} days</p>
          </div>
          <div className="p-3.5 px-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center shadow-sm">
            <span className="text-xs text-zinc-400">Remote Days</span>
            <p className="text-xl font-bold text-amber-500">{counts['Home'] || 0} days</p>
          </div>
        </div>
      </div>

      {/* 5-Day Weekly Location Strip */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <CalendarDays size={14} className="text-amber-500" />
            Weekly In-Office vs Remote Planner (Click day to toggle status)
          </h3>
          <span className="text-[11px] text-zinc-400">
            Syncs with team desk availability
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full">
          {daysList.map(({ key, label }) => {
            const status = schedule[key];
            const isOffice = status === 'Office';
            const isHome = status === 'Home';
            const isClient = status === 'Client';

            return (
              <button
                key={key}
                type="button"
                onClick={() => cycleStatus(key)}
                className={`p-5 rounded-2xl border text-center transition-all flex flex-col items-center gap-3 group relative hover:scale-[1.02] shadow-sm ${
                  isOffice
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                    : isHome
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : isClient
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {label}
                </span>

                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900/80 shadow-sm">
                  {isOffice && <Building2 size={22} className="text-indigo-500" />}
                  {isHome && <Home size={22} className="text-amber-500" />}
                  {isClient && <Plane size={22} className="text-emerald-500" />}
                  {!isOffice && !isHome && !isClient && <Clock size={22} className="text-zinc-400" />}
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs font-bold capitalize">
                    {status}
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    {isOffice ? 'Sydney Desk 4B' : isHome ? 'Remote Setup' : isClient ? 'Client Site' : 'RDO / Off'}
                  </p>
                </div>

                <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to cycle
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workplace Preferences & Equipment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Laptop size={15} className="text-indigo-500" />
            Home Office & Ergonomics
          </h4>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Workstation compliant with company WHS safety policy. Eligible for annual $600 work-from-home hardware refresh allowance.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-500 font-medium">
            <CheckCircle2 size={14} /> Ergonomic self-assessment completed for 2026
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            Need a Formal Schedule Variation?
          </h4>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Apply for compressed 9-day fortnights, adjusted core hours (e.g., 7am - 3:30pm), or international remote work stints.
          </p>
          <button
            onClick={() => toast.info('Arrangement variation workflow lodged with People Operations.')}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 underline pt-1"
          >
            Lodge Formal Flexible Work Request →
          </button>
        </div>

      </div>
    </div>
  );
};

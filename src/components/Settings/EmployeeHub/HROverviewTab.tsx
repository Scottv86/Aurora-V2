import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Plane, 
  ShieldCheck, 
  Laptop, 
  Plus,
  Briefcase
} from 'lucide-react';
import { MemberHRData } from './types';

interface HROverviewTabProps {
  hrData: MemberHRData;
  onNavigateTab: (tab: string) => void;
}

export const HROverviewTab: React.FC<HROverviewTabProps> = ({ hrData, onNavigateTab }) => {
  const [showPayAmount, setShowPayAmount] = useState(false);

  const annualLeave = hrData.leaveBalances.find(b => b.type.toLowerCase().includes('annual')) || { accrued: 20, used: 0 };
  const sickLeave = hrData.leaveBalances.find(b => b.type.toLowerCase().includes('sick')) || { accrued: 10, used: 0 };
  const daysRemaining = Math.max(0, annualLeave.accrued - annualLeave.used);

  const activeContract = hrData.contracts[0];
  const activeRemuneration = activeContract?.remuneration?.[0];
  const rawSalary = activeRemuneration?.amount || 115000;
  const currency = activeRemuneration?.currency || 'AUD';

  const currentTimesheet = hrData.timesheets[0];
  const loggedHours = currentTimesheet?.entries?.reduce((sum, e) => sum + (e.hours || 0), 0) || 0;
  const targetHours = 38.0;

  // Today's day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = days[new Date().getDay()] as keyof typeof hrData.workArrangements.schedule;
  const todayLocation = hrData.workArrangements?.schedule?.[todayName] || 'Office';

  const pendingRequestsCount = (hrData.requests || []).filter(r => r.status.toLowerCase().includes('pending')).length;

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner - Personal Status & Digital Twin Sync */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-zinc-900/80 border border-indigo-500/20 p-6 shadow-xl backdrop-blur-md w-full">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Workforce Profile Active
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Sparkles size={12} className="text-purple-400" />
                Digital Twin Linked
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Welcome back, {hrData.member.firstName || 'Team Member'}
            </h1>
            <p className="text-xs text-zinc-300 max-w-2xl">
              {hrData.member.position?.title || 'Systems Analyst'} • {hrData.member.team?.name || 'Core Engineering'} • All self-service tasks, time tracking, and compensation records in one workspace.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('hr-leave')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <Plane size={14} />
              Book Leave
            </button>
            <button
              onClick={() => onNavigateTab('hr-timesheet')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all flex items-center gap-1.5"
            >
              <Clock size={14} />
              Log Hours
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        
        {/* Card 1: Leave Balance */}
        <div 
          onClick={() => onNavigateTab('hr-leave')}
          className="cursor-pointer group p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 hover:shadow-lg transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Annual Leave</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {daysRemaining.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-500">days available</span>
            </div>
            <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (daysRemaining / annualLeave.accrued) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Accrued: {annualLeave.accrued}d</span>
            <span className="text-indigo-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Manage <ArrowRight size={11} />
            </span>
          </div>
        </div>

        {/* Card 2: Timesheet Status */}
        <div 
          onClick={() => onNavigateTab('hr-timesheet')}
          className="cursor-pointer group p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 hover:shadow-lg transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Current Timesheet</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {loggedHours.toFixed(1)}h
              </span>
              <span className="text-xs text-zinc-500">/ {targetHours}h</span>
            </div>
            <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (loggedHours / targetHours) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 font-mono text-[10px]">
              {currentTimesheet?.status || 'Draft'}
            </span>
            <span className="text-purple-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Review <ArrowRight size={11} />
            </span>
          </div>
        </div>

        {/* Card 3: Today's Location */}
        <div 
          onClick={() => onNavigateTab('hr-arrangements')}
          className="cursor-pointer group p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 hover:shadow-lg transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Location Today</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white capitalize">
                {todayLocation}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
              {hrData.workArrangements?.pattern || 'Hybrid 3/2 Arrangement'}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>5-Day Planner</span>
            <span className="text-amber-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Update <ArrowRight size={11} />
            </span>
          </div>
        </div>

        {/* Card 4: Remuneration Snapshot */}
        <div 
          onClick={() => onNavigateTab('hr-pay')}
          className="cursor-pointer group p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 hover:shadow-lg transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Annual Package</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPayAmount(!showPayAmount);
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              title="Toggle Privacy Mask"
            >
              {showPayAmount ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight font-mono text-zinc-900 dark:text-white">
                {showPayAmount ? `$${rawSalary.toLocaleString()} ${currency}` : '$•••,••• AUD'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={11} /> Next pay: 20 Nov 2026
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Payslips & Super</span>
            <span className="text-emerald-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              View <ArrowRight size={11} />
            </span>
          </div>
        </div>

      </div>

      {/* Two Column Layout: Quick Actions + Recent Requests */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        
        {/* Left Column: Quick Launch Actions */}
        <div className="xl:col-span-5 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-500" />
            Quick Employee Actions
          </h2>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => onNavigateTab('hr-leave')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Plane size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Lodge Leave Request</p>
                  <p className="text-[11px] text-zinc-500">Annual, sick, or personal time off</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onNavigateTab('hr-requests')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <DollarSign size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Claim Expense</p>
                  <p className="text-[11px] text-zinc-500">Submit receipt for reimbursement</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onNavigateTab('hr-requests')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Laptop size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Request Equipment</p>
                  <p className="text-[11px] text-zinc-500">Hardware, monitors & accessories</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-zinc-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onNavigateTab('hr-arrangements')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <MapPin size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Set Weekly Schedule</p>
                  <p className="text-[11px] text-zinc-500">Update days in office vs remote</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Right Column: Active Requests & Activity Timeline */}
        <div className="xl:col-span-7 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <FileText size={14} className="text-purple-500" />
              Active Workplace Requests ({pendingRequestsCount} Pending)
            </h2>
            <button
              onClick={() => onNavigateTab('hr-requests')}
              className="text-xs text-indigo-500 hover:text-indigo-400 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {hrData.requests && hrData.requests.length > 0 ? (
              hrData.requests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                        {req.type}
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {req.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">
                      {req.description}
                    </p>
                    <span className="text-[10px] text-zinc-400">
                      Submitted {new Date(req.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    req.status.toLowerCase().includes('approved')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No active pending requests</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Use the quick actions on the left to lodge leave, claims, or IT tickets.</p>
              </div>
            )}
          </div>

          {/* Handover & Digital Twin Delegation Notice */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-200">Aurora Digital Twin Delegation</p>
                <p className="text-[11px] text-zinc-400">Your twin auto-arms whenever leave or away status is active to handle team triage.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('hr-leave')}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 shrink-0"
            >
              Configure →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

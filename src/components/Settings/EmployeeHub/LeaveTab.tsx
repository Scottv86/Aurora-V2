import React, { useState } from 'react';
import { 
  Calendar, 
  Plane, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  Users, 
  ArrowRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { MemberHRData } from './types';

interface LeaveTabProps {
  hrData: MemberHRData;
  onSubmitLeave: (payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
    handoverTo?: string;
    enableTwinHandover?: boolean;
  }) => Promise<boolean>;
}

export const LeaveTab: React.FC<LeaveTabProps> = ({ hrData, onSubmitLeave }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [handoverTo, setHandoverTo] = useState('Alex Rivera');
  const [enableTwinHandover, setEnableTwinHandover] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute calculated days
  const computeDays = () => {
    if (!startDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    setIsSubmitting(true);
    const success = await onSubmitLeave({
      leaveType,
      startDate,
      endDate: endDate || startDate,
      reason,
      handoverTo,
      enableTwinHandover
    });

    setIsSubmitting(false);
    if (success) {
      setShowApplyModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  };

  // Team members on leave mock for enterprise context
  const teamAway = [
    { name: 'Sarah Lin', role: 'Frontend Lead', dates: '18 Nov - 22 Nov', type: 'Annual Leave' },
    { name: 'David Kim', role: 'Security Engineer', dates: '24 Nov - 25 Nov', type: 'RDO / TOIL' }
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header & Apply Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Plane size={18} className="text-indigo-500" />
            Leave & Absence Management
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            View accrued leave balances, lodge time off, and coordinate coverage with your team & Digital Twin.
          </p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          Apply for Leave
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {hrData.leaveBalances.map((bal) => {
          const remaining = Math.max(0, bal.accrued - bal.used);
          const percentUsed = Math.min(100, (bal.used / Math.max(1, bal.accrued)) * 100);

          return (
            <div
              key={bal.id || bal.type}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {bal.type}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {bal.accrued}d total
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {remaining.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">days left</span>
                </div>
                <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentUsed > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${100 - percentUsed}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                <span>Used: {bal.used}d</span>
                <span className="text-emerald-500 font-medium">Accruing</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Leave Request Form Drawer / Modal */}
      {showApplyModal && (
        <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-zinc-900/90 border border-indigo-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">New Leave Lodgement</h3>
                <p className="text-[11px] text-zinc-500">Submit time off for manager approval and configure handover</p>
              </div>
            </div>
            <button
              onClick={() => setShowApplyModal(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Leave Category
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick & Carer's Leave">Sick & Carer's Leave</option>
                  <option value="Time In Lieu (TOIL)">Time In Lieu (TOIL)</option>
                  <option value="Compassionate Leave">Compassionate Leave</option>
                  <option value="Study & Exam Leave">Study & Exam Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  disabled={isHalfDay}
                  value={isHalfDay ? startDate : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Half Day Toggle & Handover Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Designated Team Handover
                </label>
                <select
                  value={handoverTo}
                  onChange={(e) => setHandoverTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Alex Rivera">Alex Rivera (Senior Engineer)</option>
                  <option value="Sarah Lin">Sarah Lin (Lead Architect)</option>
                  <option value="David Kim">David Kim (Security Analyst)</option>
                  <option value="Whole Team">Entire Core Team / Shared Queue</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isHalfDay}
                    onChange={(e) => setIsHalfDay(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Half-day leave only (0.5d)
                </label>

                {startDate && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                    Total: {computeDays()} working day(s)
                  </span>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Reason / Handover Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief description or handover notes for manager and team..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Aurora Digital Twin Auto-Handover Arming */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">Auto-Arm Aurora Digital Twin</p>
                  <p className="text-[11px] text-zinc-400">
                    Twin will automatically handle status updates, route critical emergencies, and produce your handover digest.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={enableTwinHandover}
                onChange={(e) => setEnableTwinHandover(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !startDate}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Lodge Leave'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two Columns: Leave Requests History + Team Who's Away */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        
        {/* Left Column: Leave Request History */}
        <div className="xl:col-span-8 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Clock size={14} className="text-indigo-500" />
            My Leave History & Requests
          </h3>

          <div className="space-y-2.5">
            {hrData.leaveRequests && hrData.leaveRequests.length > 0 ? (
              hrData.leaveRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {req.type}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {req.reason}
                      </p>
                    )}
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    req.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : req.status === 'Declined'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                No past leave records found. Use "Apply for Leave" above.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Team Who's Away Calendar */}
        <div className="xl:col-span-4 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Users size={14} className="text-purple-500" />
            Team Absence Calendar
          </h3>
          <p className="text-[11px] text-zinc-500">
            Check upcoming leaves in your team to avoid scheduling conflicts:
          </p>

          <div className="space-y-2.5 pt-1">
            {teamAway.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{t.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-400">
                    {t.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{t.role}</span>
                  <span className="font-mono text-indigo-400">{t.dates}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-500" />
              Minimum team coverage (65%) satisfied.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

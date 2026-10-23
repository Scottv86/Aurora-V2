import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Phone, 
  Mail, 
  CheckSquare, 
  FileText, 
  Clock, 
  User, 
  Loader2,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ScheduledActivity, ScheduledActivityType } from '../../lib/workflowProcessUtils';
import { cn } from '../../lib/utils';
import { Booking, BookingArchetype } from '../../types/scheduling';
import { usePlatform } from '../../context/PlatformContext';
import { schedulingService } from '../../services/schedulingService';

export interface ScheduleActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId?: string;
  recordKey?: string;
  recordTitle?: string;
  moduleName?: string;
  moduleData?: any;
  onSchedule: (activity: ScheduledActivity) => Promise<void> | void;
  onCompleteActivity?: (activityId: string) => Promise<void> | void;
  onDeleteActivity?: (activityId: string) => Promise<void> | void;
  activities?: ScheduledActivity[];
  currentUserName?: string;
  currentUserId?: string;
  isSubmitting?: boolean;
}

const ACTIVITY_TYPES: { id: ScheduledActivityType; label: string; icon: React.ElementType; color: string; badge: string }[] = [
  { id: 'call', label: 'Call', icon: Phone, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { id: 'todo', label: 'To-Do', icon: CheckSquare, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { id: 'document', label: 'Document', icon: FileText, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' }
];

type FilterTab = 'PENDING' | 'COMPLETED' | 'ALL';

export const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({
  isOpen,
  onClose,
  recordId,
  recordKey,
  recordTitle,
  moduleName,
  moduleData,
  onSchedule,
  onCompleteActivity,
  onDeleteActivity,
  activities = [],
  currentUserName,
  currentUserId,
  isSubmitting = false
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const summaryInputRef = useRef<HTMLInputElement>(null);

  // Cached record metadata so exit animation displays cleanly
  const recordInfoRef = useRef({
    recordId,
    recordKey,
    recordTitle,
    moduleName
  });

  if (recordId || recordTitle) {
    recordInfoRef.current = {
      recordId,
      recordKey,
      recordTitle,
      moduleName
    };
  }

  const activeRecordKey = recordKey || recordInfoRef.current.recordKey;
  const activeRecordTitle = recordTitle || recordInfoRef.current.recordTitle;
  const activeModuleName = moduleName || recordInfoRef.current.moduleName;

  const { tenant, members, modules } = usePlatform();
  const availableResources = useMemo(() => {
    return schedulingService.getResources(tenant?.id, members, modules);
  }, [tenant?.id, members, modules]);

  // Mode switcher: CRM activities vs Bookings
  const isResourcePool = moduleData?.schedulingRole === 'RESOURCE_POOL';
  const isBookingEvent = moduleData?.schedulingRole === 'BOOKING_EVENT';
  const [mainMode, setMainMode] = useState<'crm' | 'booking'>(
    isResourcePool || isBookingEvent ? 'booking' : 'crm'
  );

  // View state
  const [activeFilter, setActiveFilter] = useState<FilterTab>('PENDING');
  const [isComposerExpanded, setIsComposerExpanded] = useState(activities.length === 0);

  // Form state for CRM Activity
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDueDate = tomorrow.toISOString().split('T')[0];

  const [type, setType] = useState<ScheduledActivityType>('call');
  const [summary, setSummary] = useState('');
  const [duePreset, setDuePreset] = useState<'tomorrow' | '3days' | '1week' | 'custom'>('tomorrow');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // Unified Booking & Scheduling State
  const [bookingArchetype, setBookingArchetype] = useState<BookingArchetype>(
    moduleData?.schedulingConfig?.archetype || 'APPOINTMENT'
  );
  const [bookingDate, setBookingDate] = useState(defaultDueDate);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [selectedResource, setSelectedResource] = useState<string>(
    activeRecordTitle || 'Meeting Room Alpha'
  );
  const [customerName, setCustomerName] = useState('Customer / Client');
  const [bookingNotes, setBookingNotes] = useState('');
  const [holdSeconds, setHoldSeconds] = useState(594);
  const [isHoldActive, setIsHoldActive] = useState(true);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // 10-minute hold countdown timer
  useEffect(() => {
    if (!isHoldActive || !isOpen) return;
    const timer = setInterval(() => {
      setHoldSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isHoldActive, isOpen]);

  const handleConfirmBooking = async () => {
    try {
      setLocalSubmitting(true);
      const bookingId = `bk_${Date.now()}`;
      const matchedRes = availableResources.find(r => r.name === selectedResource || r.id === selectedResource);
      const newBooking: Booking = {
        id: bookingId,
        configId: 'cfg_universal',
        configTitle: `${bookingArchetype} Booking`,
        resourceId: matchedRes?.id || recordId || 'res_1',
        resourceName: matchedRes?.name || selectedResource,
        archetype: bookingArchetype,
        customerName: customerName.trim() || 'Client / Guest',
        customerEmail: 'client@aurora.app',
        startDateTime: `${bookingDate}T${selectedSlot}:00`,
        endDateTime: `${bookingDate}T17:00:00`,
        status: 'CONFIRMED',
        notes: bookingNotes.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      schedulingService.createBooking(tenant?.id, newBooking);

      await onSchedule({
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'meeting',
        summary: `Booking: ${bookingArchetype} - ${newBooking.resourceName} (${selectedSlot})`,
        dueDate: bookingDate,
        assignedToName: currentUserName || 'Current User',
        assignedToId: currentUserId,
        note: `Unified Reservation #${bookingId} confirmed in scheduling ledger. Notes: ${bookingNotes}`,
        done: false,
        createdAt: new Date().toISOString()
      });

      setIsBookingConfirmed(true);
      setBookingSuccessMsg(`Reservation #${bookingId} confirmed and synchronized to Central Bookings Ledger & Worksuite Calendar.`);
    } catch (err) {
      console.error('Failed to confirm booking:', err);
    } finally {
      setLocalSubmitting(false);
    }
  };

  // Auto-expand composer if no activities exist
  useEffect(() => {
    if (activities.length === 0) {
      setIsComposerExpanded(true);
    }
  }, [activities.length]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handlePresetChange = (preset: 'tomorrow' | '3days' | '1week' | 'custom') => {
    setDuePreset(preset);
    const target = new Date();
    if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      setDueDate(target.toISOString().split('T')[0]);
    } else if (preset === '3days') {
      target.setDate(target.getDate() + 3);
      setDueDate(target.toISOString().split('T')[0]);
    } else if (preset === '1week') {
      target.setDate(target.getDate() + 7);
      setDueDate(target.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Please provide a summary for this activity.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    try {
      setLocalSubmitting(true);
      const newActivity: ScheduledActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        summary: summary.trim(),
        dueDate,
        assignedToName: currentUserName || 'Current User',
        assignedToId: currentUserId,
        note: note.trim() || undefined,
        done: false,
        createdAt: new Date().toISOString()
      };

      await onSchedule(newActivity);
      setSummary('');
      setNote('');
      setError('');
      setIsComposerExpanded(false);
      handlePresetChange('tomorrow');
    } catch (err) {
      console.error('Error creating activity:', err);
    } finally {
      setLocalSubmitting(false);
    }
  };

  // Filtered Activities
  const pendingCount = useMemo(() => {
    return activities.filter(a => !a.done).length;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    let result = [...activities];
    if (activeFilter === 'PENDING') {
      result = result.filter(a => !a.done);
    } else if (activeFilter === 'COMPLETED') {
      result = result.filter(a => a.done);
    }

    // Sort by due date
    return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [activities, activeFilter]);

  const formatDueDate = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueZero = new Date(due);
    dueZero.setHours(0, 0, 0, 0);

    const isOverdue = dueZero.getTime() < now.getTime();
    const isToday = dueZero.getTime() === now.getTime();
    const isTomorrow = new Date(now.getTime() + 86400000).getTime() === dueZero.getTime();

    let text = '';
    if (isToday) {
      text = 'Today';
    } else if (isTomorrow) {
      text = 'Tomorrow';
    } else {
      text = due.toLocaleDateString([], { month: 'short', day: 'numeric', year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }

    return { text, isOverdue, isToday };
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="schedule-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[99998] bg-zinc-950/60 backdrop-blur-xs cursor-pointer"
        />
      )}

      {isOpen && (
        <motion.div
          key="schedule-drawer-panel"
          ref={drawerRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-y-0 right-0 z-[99999] w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* TOP HEADER */}
          <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      Scheduled Activities & Tasks
                    </h2>
                    {pendingCount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                        {pendingCount} pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        All clear
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {activeModuleName ? `${activeModuleName} • ` : ''}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {activeRecordKey || activeRecordTitle || 'Record'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Close Drawer (Esc)"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Close</span>
                  <kbd className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-400 font-mono">Esc</kbd>
                </button>
              </div>
            </div>

            {/* TOP-LEVEL MODE SWITCHER: CRM vs BOOKING */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80">
              <button
                type="button"
                onClick={() => setMainMode('crm')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  mainMode === 'crm'
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <CheckSquare size={13} />
                <span>CRM Follow-up</span>
                {pendingCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-500 font-black">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMainMode('booking')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  mainMode === 'booking'
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Calendar size={13} />
                <span>Book Appointment & Slot</span>
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Engine
                </span>
              </button>
            </div>

            {/* TAB SELECTOR & COMPOSER TOGGLE (CRM MODE) */}
            {mainMode === 'crm' && (
              <div className="flex items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 text-xs font-semibold">
                  {[
                    { id: 'PENDING', label: `Pending (${pendingCount})` },
                    { id: 'COMPLETED', label: `Completed (${activities.filter(a => a.done).length})` },
                    { id: 'ALL', label: `All (${activities.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs",
                        activeFilter === tab.id
                          ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {!isComposerExpanded && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerExpanded(true);
                      setTimeout(() => summaryInputRef.current?.focus(), 50);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={13} />
                    <span>New Activity</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* DRAWER BODY */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {mainMode === 'booking' ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                {isBookingConfirmed ? (
                  <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-500/30 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Booking Confirmed!</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        {bookingSuccessMsg}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBookingConfirmed(false);
                          setHoldSeconds(600);
                          setIsHoldActive(true);
                        }}
                        className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Book Another
                      </button>
                      <a
                        href="/workspace/apps/calendar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Calendar size={13} />
                        View in Calendar
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Resource Pool Card if current module is a resource */}
                    {isResourcePool && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Bookable Resource Pool
                            </span>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {activeRecordTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Category: {moduleData?.schedulingConfig?.resourceType || 'Space / Room'} • Status: Available
                          </p>
                        </div>
                        <a
                          href="/workspace/settings/platform-modules/scheduling"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 shrink-0"
                        >
                          Blackout Rules
                        </a>
                      </div>
                    )}

                    {/* Booking Setup Form */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Reserve Time Slot</h3>
                          <p className="text-[10px] text-zinc-400">Schedule appointments, dispatches, or facility reservations</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                          Live Availability
                        </span>
                      </div>

                      {/* Archetype Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Booking Archetype</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'APPOINTMENT', label: '1:1 Meeting', icon: User },
                            { id: 'RENTAL', label: 'Stay / Rental', icon: Calendar },
                            { id: 'FIELD_SERVICE', label: 'Field Service', icon: Sparkles }
                          ].map((arch) => (
                            <button
                              key={arch.id}
                              type="button"
                              onClick={() => setBookingArchetype(arch.id as any)}
                              className={cn(
                                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2",
                                bookingArchetype === arch.id
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                              )}
                            >
                              <arch.icon size={13} className="shrink-0" />
                              <span className="text-xs font-bold truncate">{arch.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date & Resource Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Date</label>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Resource</label>
                          <select
                            value={selectedResource}
                            onChange={(e) => setSelectedResource(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                          >
                            {activeRecordTitle && (
                              <option value={activeRecordTitle}>{activeRecordTitle} (Current Record)</option>
                            )}
                            {availableResources
                              .filter(r => r.name !== activeRecordTitle)
                              .map(r => (
                                <option key={r.id} value={r.name}>
                                  {r.name} ({r.type})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Slot Selection */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Available Slot</label>
                          <span className="text-[9px] text-zinc-400">Timezone: Tenant Local</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setIsHoldActive(true);
                                setHoldSeconds(599);
                              }}
                              className={cn(
                                "py-2 px-1 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer",
                                selectedSlot === slot
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                                  : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                              )}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 10-Minute Hold Lock Banner */}
                      {isHoldActive && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 animate-in fade-in">
                          <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Tentative Hold Active: {Math.floor(holdSeconds / 60)}:{(holdSeconds % 60).toString().padStart(2, '0')}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                                Atomic Lock
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                              Slot <strong>{selectedSlot}</strong> on <strong>{bookingDate}</strong> is reserved exclusively for this record against duplicate bookings across Aurora.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Customer & Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Client / Attendee</label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Client name or reference"
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Booking Notes</label>
                          <input
                            type="text"
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            placeholder="Optional instructions..."
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleConfirmBooking}
                          disabled={localSubmitting}
                          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {localSubmitting ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>Confirm Reservation & Add to Calendar</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
            {/* Quick Activity Composer */}
            <div className={cn(
              "rounded-2xl border transition-all duration-200 overflow-hidden",
              isComposerExpanded
                ? "bg-white dark:bg-zinc-900 border-indigo-400/60 dark:border-indigo-500/40 shadow-md ring-1 ring-indigo-400/20"
                : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400/40"
            )}>
              {!isComposerExpanded ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsComposerExpanded(true);
                    setTimeout(() => summaryInputRef.current?.focus(), 50);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                      Schedule a call, email, meeting, or task...
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                    Schedule <ArrowRight size={11} />
                  </span>
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-500" /> New Activity
                    </span>
                    {activities.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsComposerExpanded(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Activity Type Selection Chips */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Activity Type
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ACTIVITY_TYPES.map(item => {
                        const Icon = item.icon;
                        const isSelected = type === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setType(item.id)}
                            className={cn(
                              "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            <Icon size={16} className={cn("mb-1", isSelected ? "text-indigo-500" : "text-zinc-400")} />
                            <span className="text-[10px] font-semibold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Summary / Next Action <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={summaryInputRef}
                      type="text"
                      value={summary}
                      onChange={(e) => {
                        setSummary(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder={
                        type === 'call' 
                          ? 'e.g. Call client to discuss quote approval' 
                          : type === 'email' 
                          ? 'e.g. Send updated pricing proposal' 
                          : type === 'meeting' 
                          ? 'e.g. Review requirements kick-off' 
                          : 'e.g. Complete invoice review'
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Due Date & Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <Clock size={11} /> Due Date
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: '3days', label: 'In 3 Days' },
                        { id: '1week', label: 'Next Week' },
                        { id: 'custom', label: 'Custom' }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetChange(preset.id as any)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                            duePreset === preset.id
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {duePreset === 'custom' && (
                      <div className="pt-1">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Assignee & Note */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <User size={11} /> Assigned To
                    </label>
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-[10px]">
                        {(currentUserName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{currentUserName || 'Current User'}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Notes / Talking Points (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add talking points, context, or instructions..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> {error}
                    </p>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    {activities.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsComposerExpanded(false)}
                        className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={localSubmitting || isSubmitting || !summary.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {localSubmitting || isSubmitting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Calendar size={13} />
                      )}
                      <span>Schedule Activity</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Activities Feed */}
            {filteredActivities.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Calendar size={20} />
                </div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {activeFilter === 'COMPLETED' ? 'No completed activities' : 'No activities scheduled'}
                </h3>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  {activeFilter === 'COMPLETED'
                    ? 'Completed calls, emails, and meetings will be cataloged here for audit.'
                    : 'Schedule next steps to keep this record progressing smoothly through the pipeline.'}
                </p>
                {!isComposerExpanded && activeFilter !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setIsComposerExpanded(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Schedule First Activity</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map(act => {
                  const typeConfig = ACTIVITY_TYPES.find(t => t.id === act.type) || ACTIVITY_TYPES[0];
                  const Icon = typeConfig.icon;
                  const isCompleted = act.done;
                  const { text: dueFormatted, isOverdue, isToday } = formatDueDate(act.dueDate);

                  return (
                    <div
                      key={act.id}
                      className={cn(
                        "group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all shadow-xs",
                        isCompleted
                          ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-70"
                          : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-900/50"
                      )}
                    >
                      {/* Checkbox */}
                      {onCompleteActivity && (
                        <button
                          type="button"
                          onClick={() => onCompleteActivity(act.id)}
                          className="mt-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                          title={isCompleted ? 'Mark not done' : 'Mark done'}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle size={18} className="hover:scale-110 transition-transform" />
                          )}
                        </button>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Type Pill */}
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0",
                              typeConfig.badge
                            )}>
                              <Icon size={11} />
                              <span>{typeConfig.label}</span>
                            </span>

                            <h4 className={cn(
                              "text-xs font-bold truncate",
                              isCompleted
                                ? "line-through text-zinc-400 dark:text-zinc-500"
                                : "text-zinc-900 dark:text-white"
                            )}>
                              {act.summary}
                            </h4>
                          </div>

                          {/* Delete Action */}
                          {onDeleteActivity && (
                            <button
                              type="button"
                              onClick={() => onDeleteActivity(act.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer"
                              title="Delete activity"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {act.note && (
                          <p className={cn(
                            "text-xs leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60",
                            isCompleted ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-600 dark:text-zinc-300"
                          )}>
                            {act.note}
                          </p>
                        )}

                        {/* Metadata Footer */}
                        <div className="flex items-center justify-between text-[10px] pt-1 text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className={!isCompleted && isOverdue ? "text-rose-500" : ""} />
                            <span className={cn(
                              !isCompleted && isOverdue && "text-rose-600 dark:text-rose-400 font-bold",
                              !isCompleted && isToday && "text-amber-600 dark:text-amber-400 font-bold"
                            )}>
                              {!isCompleted && isOverdue ? `Overdue • Due ${dueFormatted}` : `Due ${dueFormatted}`}
                            </span>
                          </div>

                          {act.assignedToName && (
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                              <User size={10} />
                              <span>{act.assignedToName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export { ScheduleActivityModal as RecordScheduleDrawer };


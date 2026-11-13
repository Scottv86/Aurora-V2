import React, { useState, useEffect, useMemo } from 'react';
import { format, addHours, addMinutes, addDays, differenceInHours, differenceInCalendarDays } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldAlert,
  X,
  Check,
  DollarSign
} from 'lucide-react';
import { Button, Input } from '../../UI/Primitives';
import { cn } from '../../../lib/utils';
import {
  Booking,
  BookingArchetype,
  BookingConfig,
  BookingResource,
  BookingStatus
} from '../../../types/scheduling';
import { schedulingService } from '../../../services/schedulingService';
import {
  CalendarEvent,
  CalendarTaskItem,
  ARCHETYPE_STYLES,
  safeParseDate,
  formatTimeRange
} from './calendarUtils';

/* ============================================================================
 * 1. EVENT DETAIL PEEK MODAL (GOOGLE / OUTLOOK STYLE INSPECTOR)
 * ========================================================================== */
interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  onStatusChange: (eventId: string, status: BookingStatus) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  if (!event) return null;
  const style = ARCHETYPE_STYLES[event.archetype];
  const start = safeParseDate(event.startDateTime);
  const end = safeParseDate(event.endDateTime);

  const statuses: BookingStatus[] = [
    'HELD',
    'CONFIRMED',
    'CHECKED_IN',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
      >
        {/* Top Accent Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-800/30">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('w-3.5 h-10 rounded-full shrink-0 mt-0.5', event.resourceColor || style.dot)} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-md', style.badge)}>
                  {style.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{event.id}</span>
              </div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white mt-1 truncate">
                {event.customerName}
              </h3>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                {event.configTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="p-2 rounded-xl hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Edit / Reschedule"
            >
              <Edit3 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors cursor-pointer"
              title="Delete Booking"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Clock size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                {format(start, 'EEEE, MMMM d, yyyy')}
                {format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')
                  ? ` → ${format(end, 'EEEE, MMMM d, yyyy')}`
                  : ''}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                {formatTimeRange(event.startDateTime, event.endDateTime)}
              </p>
            </div>
          </div>

          {/* Resource */}
          <div className="flex items-center gap-3">
            <User size={16} className="text-indigo-500 shrink-0" />
            <div>
              <span className="text-zinc-400 text-[10px] font-black uppercase block">Assigned Resource</span>
              <span className="font-bold text-zinc-900 dark:text-white">{event.resourceName}</span>
            </div>
          </div>

          {/* Contact & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={14} className="text-zinc-400 shrink-0" />
              <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
                {event.customerEmail || 'No email'}
              </span>
            </div>
            {event.customerPhone && (
              <div className="flex items-center gap-2 min-w-0">
                <Phone size={14} className="text-zinc-400 shrink-0" />
                <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium">
                  {event.customerPhone}
                </span>
              </div>
            )}
            {event.totalPrice !== undefined && event.totalPrice > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-emerald-500 shrink-0" />
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ${event.totalPrice} {event.currency || 'USD'}
                </span>
              </div>
            )}
          </div>

          {event.notes && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <FileText size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{event.notes}</p>
            </div>
          )}

          {/* Status Workflow Transition Pills */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Booking Lifecycle Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map(st => {
                const active = event.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onStatusChange(event.id, st)}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border',
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
                    )}
                  >
                    {st.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. TASK / REMINDER DETAIL MODAL
 * ========================================================================== */
interface TaskDetailModalProps {
  task: CalendarTaskItem | null;
  onClose: () => void;
  onToggleComplete: (task: CalendarTaskItem, e: React.MouseEvent) => void;
  onDelete: (task: CalendarTaskItem) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onToggleComplete,
  onDelete
}) => {
  if (!task) return null;
  const due = safeParseDate(task.dueAt);
  const isDone = task.status === 'COMPLETED';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={e => onToggleComplete(task, e)}
              className="mt-0.5 text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {task.priority} Reminder / Task
              </span>
              <h3 className={cn('text-sm font-black text-zinc-900 dark:text-white mt-1', isDone && 'line-through opacity-60')}>
                {task.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
              title="Delete Task"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
            <Clock size={14} className="text-emerald-500" />
            <span>
              Due {format(due, 'EEEE, MMM d, yyyy')} at {format(due, 'h:mm a')}
            </span>
          </div>

          {task.assignedToName && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <User size={14} className="text-zinc-400" />
              <span>Assigned to {task.assignedToName}</span>
            </div>
          )}

          {task.description && (
            <p className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
              {task.description}
            </p>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={e => {
              onToggleComplete(task, e);
              onClose();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Check size={13} className="mr-1" />
            {isDone ? 'Reopen Task' : 'Mark Completed'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. CREATE / EDIT BOOKING OR TASK MODAL
 * ========================================================================== */
export interface BookingModalInitialDraft {
  mode?: 'booking' | 'task';
  editingEvent?: CalendarEvent;
  date?: Date;
  hour?: number;
  resourceId?: string;
}

interface BookingCreateEditModalProps {
  isOpen: boolean;
  draft: BookingModalInitialDraft | null;
  tenantId?: string;
  resources: BookingResource[];
  configs: BookingConfig[];
  onClose: () => void;
  onSaveBooking: (booking: Booking, isEdit: boolean) => void;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    dueAt: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) => void;
}

export const BookingCreateEditModal: React.FC<BookingCreateEditModalProps> = ({
  isOpen,
  draft,
  tenantId,
  resources,
  configs,
  onClose,
  onSaveBooking,
  onCreateTask
}) => {
  const isEdit = Boolean(draft?.editingEvent);
  const [entryTab, setEntryTab] = useState<'booking' | 'task'>('booking');

  // Booking form state
  const [configId, setConfigId] = useState<string>('custom');
  const [archetype, setArchetype] = useState<BookingArchetype>('APPOINTMENT');
  const [title, setTitle] = useState('1:1 Client Consultation');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [resourceId, setResourceId] = useState(resources[0]?.id || 'res-sarah');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  useEffect(() => {
    if (!isOpen) return;
    if (draft?.editingEvent) {
      const ev = draft.editingEvent;
      const s = safeParseDate(ev.startDateTime);
      const e = safeParseDate(ev.endDateTime);
      setEntryTab('booking');
      setConfigId(ev.configId || 'custom');
      setArchetype(ev.archetype);
      setTitle(ev.configTitle);
      setCustomerName(ev.customerName);
      setCustomerEmail(ev.customerEmail || '');
      setCustomerPhone(ev.customerPhone || '');
      setResourceId(ev.resourceId);
      setStartDate(format(s, 'yyyy-MM-dd'));
      setStartTime(format(s, 'HH:mm'));
      setEndDate(format(e, 'yyyy-MM-dd'));
      setEndTime(format(e, 'HH:mm'));
      setNotes(ev.notes || '');
    } else {
      const baseDate = draft?.date || new Date();
      const hr = draft?.hour !== undefined ? draft.hour : 10;
      const sDt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hr, 0, 0);
      const eDt = addHours(sDt, 1);

      setEntryTab(draft?.mode || 'booking');
      setConfigId(configs[0]?.id || 'custom');
      setArchetype(configs[0]?.archetype || 'APPOINTMENT');
      setTitle(configs[0]?.title || 'Manual Booking');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setResourceId(draft?.resourceId || resources[0]?.id || 'res-sarah');
      setStartDate(format(sDt, 'yyyy-MM-dd'));
      setStartTime(format(sDt, 'HH:mm'));
      setEndDate(format(eDt, 'yyyy-MM-dd'));
      setEndTime(format(eDt, 'HH:mm'));
      setNotes('');
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('MEDIUM');
    }
  }, [isOpen, draft, resources, configs]);

  const handleConfigChange = (newCfgId: string) => {
    setConfigId(newCfgId);
    const cfg = configs.find(c => c.id === newCfgId);
    if (cfg) {
      setArchetype(cfg.archetype);
      setTitle(cfg.title);
      if (cfg.resourceIds && cfg.resourceIds.length > 0 && resources.some(r => r.id === cfg.resourceIds[0])) {
        setResourceId(cfg.resourceIds[0]);
      }
      // Auto-calculate end date/time from policy rules
      if (cfg.archetype === 'RENTAL') {
        const nights = cfg.minNights || 1;
        const inTime = cfg.checkInTime || '14:00';
        const outTime = cfg.checkOutTime || '10:00';
        const baseStart = safeParseDate(`${startDate}T${inTime}:00`);
        const endDt = addDays(baseStart, nights);
        setStartTime(inTime);
        setEndDate(format(endDt, 'yyyy-MM-dd'));
        setEndTime(outTime);
      } else if (cfg.slotDurationMinutes) {
        const startDt = safeParseDate(`${startDate}T${startTime}:00`);
        const endDt = addMinutes(startDt, cfg.slotDurationMinutes);
        setEndDate(format(endDt, 'yyyy-MM-dd'));
        setEndTime(format(endDt, 'HH:mm'));
      }
    }
  };

  // Live Conflict, Blackout & Policy Rule Validation
  const conflictCheck = useMemo(() => {
    if (entryTab !== 'booking' || !startDate || !startTime || !endDate || !endTime) return {};
    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();
    return schedulingService.checkConflict(
      tenantId,
      resourceId,
      startIso,
      endIso,
      draft?.editingEvent?.id
    );
  }, [entryTab, tenantId, resourceId, startDate, startTime, endDate, endTime, draft?.editingEvent?.id]);

  const policyWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (entryTab !== 'booking' || isEdit) return warnings;
    const cfg = configs.find(c => c.id === configId);
    if (!cfg || !startDate || !startTime) return warnings;

    const startDt = new Date(`${startDate}T${startTime}:00`);
    const now = new Date();
    const hoursNotice = differenceInHours(startDt, now);
    const daysAhead = differenceInCalendarDays(startDt, now);

    if (cfg.minNoticeHours && hoursNotice < cfg.minNoticeHours && hoursNotice >= 0) {
      warnings.push(`Requires at least ${cfg.minNoticeHours}h advance notice.`);
    }
    if (cfg.maxAdvanceDays && daysAhead > cfg.maxAdvanceDays) {
      warnings.push(`Exceeds ${cfg.maxAdvanceDays}-day advance booking window.`);
    }
    if (cfg.bufferBeforeMinutes || cfg.bufferAfterMinutes) {
      warnings.push(
        `Policy includes ${cfg.bufferBeforeMinutes || 0}m pre / ${cfg.bufferAfterMinutes || 0}m post buffer.`
      );
    }
    return warnings;
  }, [entryTab, isEdit, configs, configId, startDate, startTime]);

  if (!isOpen) return null;

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const startDt = new Date(`${startDate}T${startTime}:00`);
    let endDt = new Date(`${endDate}T${endTime}:00`);
    if (endDt.getTime() <= startDt.getTime()) {
      endDt = addHours(startDt, 1);
    }

    const res = resources.find(r => r.id === resourceId) || resources[0];
    const cfg = configs.find(c => c.id === configId);

    const payload: Booking = {
      id: draft?.editingEvent?.id || `bk-${Date.now().toString().slice(-5)}`,
      configId: cfg?.id || configId || 'cfg-manual-direct',
      configTitle: title.trim() || `${archetype.replace('_', ' ')} Booking`,
      resourceId: res ? res.id : resourceId,
      resourceName: res ? res.name : 'Primary Resource',
      archetype,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || 'walkin@example.com',
      customerPhone: customerPhone.trim() || undefined,
      startDateTime: startDt.toISOString(),
      endDateTime: endDt.toISOString(),
      status: draft?.editingEvent?.status || 'CONFIRMED',
      totalPrice: draft?.editingEvent?.totalPrice ?? cfg?.basePrice,
      currency: draft?.editingEvent?.currency ?? cfg?.currency ?? 'USD',
      notes: notes.trim() || undefined,
      createdAt: draft?.editingEvent?.createdAt || new Date().toISOString()
    };

    onSaveBooking(payload, isEdit);
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const dueDt = new Date(`${startDate}T${startTime}:00`);
    onCreateTask({
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      dueAt: dueDt.toISOString(),
      priority: taskPriority
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarIcon size={17} className="text-indigo-500" />
            {isEdit ? 'Edit / Reschedule Booking' : 'New Calendar Entry'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher (only when creating) */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setEntryTab('booking')}
              className={cn(
                'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                entryTab === 'booking'
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              Resource Booking
            </button>
            <button
              type="button"
              onClick={() => setEntryTab('task')}
              className={cn(
                'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                entryTab === 'task'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              Reminder / CRM Task
            </button>
          </div>
        )}

        {entryTab === 'booking' ? (
          <form onSubmit={handleSubmitBooking} className="space-y-3.5 text-xs">
            {/* Conflict / Blackout Warnings */}
            {conflictCheck.blackout && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Blackout Period Active</p>
                  <p className="text-[11px] opacity-90">
                    {conflictCheck.blackout.reason} ({conflictCheck.blackout.startDate} to {conflictCheck.blackout.endDate})
                  </p>
                </div>
              </div>
            )}

            {conflictCheck.conflict && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Resource Double-Booking Warning</p>
                  <p className="text-[11px] opacity-90">
                    Overlaps with <strong>{conflictCheck.conflict.customerName}</strong> (
                    {formatTimeRange(conflictCheck.conflict.startDateTime, conflictCheck.conflict.endDateTime)}).
                  </p>
                </div>
              </div>
            )}

            {policyWarnings.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200 text-[11px] space-y-0.5">
                <p className="font-black">Policy Rules</p>
                {policyWarnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {/* Editable Title */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Event / Booking Title *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Executive Consultation"
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Policy + Archetype */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Booking Policy</label>
                <select
                  value={configId}
                  onChange={e => handleConfigChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                >
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                  <option value="custom">Custom Manual Entry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Archetype</label>
                <select
                  value={archetype}
                  onChange={e => setArchetype(e.target.value as BookingArchetype)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                >
                  <option value="APPOINTMENT">Appointment (1:1)</option>
                  <option value="RENTAL">Stay / Rental</option>
                  <option value="FIELD_SERVICE">Field Service Dispatch</option>
                  <option value="CAPACITY">Group Capacity</option>
                </select>
              </div>
            </div>

            {/* Customer Name & Resource */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Customer / Guest Name *</label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Assigned Resource</label>
                <select
                  value={resourceId}
                  onChange={e => setResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                >
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.type}] {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start & End Date/Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Email</label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Phone</label>
                <Input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Operational Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Instructions, gate codes, or dispatch notes..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium resize-none focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                {isEdit ? 'Save Changes' : 'Confirm Reservation'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitTask} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Task / Reminder Title *</label>
              <Input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="e.g. Follow up on invoice approval"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Due Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Priority</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">Details</label>
              <textarea
                rows={2}
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="Optional context..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium resize-none"
              />
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Add to Tasks Layer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
  addMinutes
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  SlidersHorizontal,
  CheckSquare,
  ShieldAlert,
  Keyboard,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from '../../components/UI/Primitives';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Booking,
  BookingConfig,
  BookingResource,
  BookingStatus,
  BlackoutDate
} from '../../types/scheduling';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import { schedulingService } from '../../services/schedulingService';
import { RemindersClientService } from '../../services/remindersService';
import {
  CalendarEvent,
  CalendarTaskItem,
  CalendarViewMode,
  getLocalCalendarTasks,
  saveLocalCalendarTasks,
  mapReminderToTaskItem,
  shiftEventToTargetDate
} from '../../components/Apps/Calendar/calendarUtils';
import {
  MonthYearPickerPopover,
  SidebarMiniCalendar
} from '../../components/Apps/Calendar/MonthYearPickerPopover';
import { CalendarTimeGridView } from '../../components/Apps/Calendar/CalendarTimeGridView';
import {
  CalendarMonthView,
  CalendarYearView,
  CalendarDispatchView,
  CalendarScheduleView
} from '../../components/Apps/Calendar/CalendarMonthYearViews';
import {
  EventDetailModal,
  TaskDetailModal,
  BookingCreateEditModal,
  BookingModalInitialDraft
} from '../../components/Apps/Calendar/CalendarEventModals';

const VIEW_TABS: { id: CalendarViewMode; label: string; shortcut: string }[] = [
  { id: 'day', label: 'Day', shortcut: 'D' },
  { id: 'workweek', label: 'Work Week', shortcut: '5' },
  { id: 'week', label: 'Week', shortcut: 'W' },
  { id: 'month', label: 'Month', shortcut: 'M' },
  { id: 'year', label: 'Year', shortcut: 'Y' },
  { id: 'dispatch', label: 'Dispatch', shortcut: 'R' },
  { id: 'schedule', label: 'Agenda', shortcut: 'A' }
];

export const CalendarApp: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, members, modules } = usePlatform();
  const { session } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<BookingResource[]>(() =>
    schedulingService.getResources(tenant?.id, members, modules)
  );
  const [configs, setConfigs] = useState<BookingConfig[]>(() =>
    schedulingService.getConfigs(tenant?.id)
  );
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(() =>
    schedulingService.getBlackouts(tenant?.id)
  );
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const raw = schedulingService.getBookings(tenant?.id);
    const resList = schedulingService.getResources(tenant?.id, members, modules);
    return raw.map(b => ({
      ...b,
      resourceColor: resList.find(r => r.id === b.resourceId)?.color || 'bg-indigo-500'
    }));
  });

  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(() =>
    schedulingService.getResources(tenant?.id, members, modules).map(r => r.id)
  );

  // Tasks & Reminders layer state
  const [tasks, setTasks] = useState<CalendarTaskItem[]>(() =>
    getLocalCalendarTasks(tenant?.id)
  );
  const [showTasksLayer, setShowTasksLayer] = useState(true);
  const [showBlackouts, setShowBlackouts] = useState(true);

  // Core View & Filter State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [archetypeFilter, setArchetypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const use24Hour = (tenant?.localization as any)?.timeFormat === '24h';

  // Modals State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTaskItem | null>(null);
  const [modalDraft, setModalDraft] = useState<BookingModalInitialDraft | null>(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);

  // Sync scheduling service + hydrate from backend /api/scheduling
  useEffect(() => {
    schedulingService.setAuthToken(session?.access_token);
    const refresh = () => {
      const resList = schedulingService.getResources(tenant?.id, members, modules);
      setResources(resList);
      setConfigs(schedulingService.getConfigs(tenant?.id));
      setBlackouts(schedulingService.getBlackouts(tenant?.id));
      const raw = schedulingService.getBookings(tenant?.id);
      setEvents(
        raw.map(b => ({
          ...b,
          resourceColor: resList.find(r => r.id === b.resourceId)?.color || 'bg-indigo-500'
        }))
      );
    };
    refresh();
    if (tenant?.id && session?.access_token) {
      void schedulingService.syncFromBackend(tenant.id, session.access_token);
    }
    return schedulingService.subscribe(refresh);
  }, [tenant?.id, session?.access_token, members, modules]);

  // Keep selectedResourceIds populated when resources load
  useEffect(() => {
    if (selectedResourceIds.length === 0 && resources.length > 0) {
      setSelectedResourceIds(resources.map(r => r.id));
    }
  }, [resources, selectedResourceIds.length]);

  // Load Reminders from API + merge with local fallback tasks
  useEffect(() => {
    let active = true;
    const localTasks = getLocalCalendarTasks(tenant?.id);
    setTasks(localTasks);

    if (tenant?.id && session?.access_token) {
      RemindersClientService.getReminders({}, session.access_token, tenant.id)
        .then(apiReminders => {
          if (!active) return;
          if (Array.isArray(apiReminders) && apiReminders.length > 0) {
            const mapped = apiReminders.map(mapReminderToTaskItem);
            setTasks([...mapped, ...localTasks]);
          }
        })
        .catch(() => {
          // Gracefully keep local tasks if backend reminders endpoint is unavailable
        });
    }
    return () => {
      active = false;
    };
  }, [tenant?.id, session?.access_token]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter(e => {
      const matchSearch =
        !q ||
        e.customerName.toLowerCase().includes(q) ||
        e.configTitle.toLowerCase().includes(q) ||
        e.resourceName.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q));
      const matchResource = selectedResourceIds.includes(e.resourceId);
      const matchArchetype = archetypeFilter === 'ALL' || e.archetype === archetypeFilter;
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      return matchSearch && matchResource && matchArchetype && matchStatus;
    });
  }, [events, searchQuery, selectedResourceIds, archetypeFilter, statusFilter]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  const activeHoldsCount = useMemo(
    () => events.filter(e => e.status === 'HELD').length,
    [events]
  );

  // Navigation Handlers
  const handlePrev = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'year') return subYears(prev, 1);
      if (viewMode === 'month') return subMonths(prev, 1);
      if (viewMode === 'week' || viewMode === 'workweek') return subWeeks(prev, 1);
      return subDays(prev, 1);
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'year') return addYears(prev, 1);
      if (viewMode === 'month') return addMonths(prev, 1);
      if (viewMode === 'week' || viewMode === 'workweek') return addWeeks(prev, 1);
      return addDays(prev, 1);
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Google Calendar Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (isCreateEditOpen || selectedEvent || selectedTask) {
        if (e.key === 'Escape') {
          setIsCreateEditOpen(false);
          setSelectedEvent(null);
          setSelectedTask(null);
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 't') handleToday();
      else if (key === 'd') setViewMode('day');
      else if (key === 'w') setViewMode('week');
      else if (key === '5') setViewMode('workweek');
      else if (key === 'm') setViewMode('month');
      else if (key === 'y') setViewMode('year');
      else if (key === 'r') setViewMode('dispatch');
      else if (key === 'a') setViewMode('schedule');
      else if (key === 'j' || e.key === 'ArrowLeft') handlePrev();
      else if (key === 'k' || e.key === 'ArrowRight') handleNext();
      else if (key === 'c' || key === 'n') {
        e.preventDefault();
        setModalDraft({ mode: 'booking', date: currentDate, hour: 10 });
        setIsCreateEditOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?') {
        setShowShortcutsHint(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToday, handlePrev, handleNext, currentDate, isCreateEditOpen, selectedEvent, selectedTask]);

  // Resource Toggle
  const toggleResource = (id: string) => {
    if (selectedResourceIds.includes(id)) {
      if (selectedResourceIds.length > 1) {
        setSelectedResourceIds(selectedResourceIds.filter(rId => rId !== id));
      } else {
        toast.info('At least one resource must remain visible');
      }
    } else {
      setSelectedResourceIds([...selectedResourceIds, id]);
    }
  };

  // Create / Update Booking
  const handleSaveBooking = (booking: Booking, isEdit: boolean) => {
    if (isEdit) {
      schedulingService.updateBooking(tenant?.id, booking);
      toast.success(`Updated booking for ${booking.customerName}`);
    } else {
      schedulingService.createBooking(tenant?.id, booking);
      toast.success(`Reservation created for ${booking.customerName} on ${booking.resourceName}`);
    }
    setIsCreateEditOpen(false);
    setModalDraft(null);
  };

  // Quick Status Change
  const handleStatusChange = (eventId: string, status: BookingStatus) => {
    schedulingService.updateBookingStatus(tenant?.id, eventId, status);
    setSelectedEvent(prev => (prev && prev.id === eventId ? { ...prev, status } : prev));
    toast.success(`Booking status updated to ${status.replace('_', ' ')}`);
  };

  // Delete Booking
  const handleDeleteBooking = (eventId: string) => {
    schedulingService.deleteBooking(tenant?.id, eventId);
    setSelectedEvent(null);
    toast.success('Booking removed from ledger');
  };

  // Drag-and-Drop Reschedule Booking (with 30-min snapping)
  const handleDropRescheduleEvent = (
    eventId: string,
    targetDate: Date,
    targetHour?: number,
    targetMinute: number = 0,
    targetResourceId?: string
  ) => {
    const existing = events.find(e => e.id === eventId);
    if (!existing) return;

    const { startDateTime, endDateTime } = shiftEventToTargetDate(
      existing,
      targetDate,
      targetHour,
      targetMinute
    );

    const newRes = targetResourceId
      ? resources.find(r => r.id === targetResourceId)
      : undefined;

    const updated: Booking = {
      ...existing,
      startDateTime,
      endDateTime,
      resourceId: newRes ? newRes.id : existing.resourceId,
      resourceName: newRes ? newRes.name : existing.resourceName
    };

    schedulingService.updateBooking(tenant?.id, updated);
    toast.success(
      `Rescheduled ${existing.customerName} to ${format(targetDate, 'MMM d')}${
        targetHour !== undefined
          ? ` at ${format(new Date(2026, 0, 1, targetHour, targetMinute), use24Hour ? 'HH:mm' : 'h:mm a')}`
          : ''
      }`
    );
  };

  // Drag-to-Resize Timed Booking Duration
  const handleResizeEvent = (eventId: string, newDurationMinutes: number) => {
    const existing = events.find(e => e.id === eventId);
    if (!existing) return;
    const startDt = new Date(existing.startDateTime);
    const endDt = addMinutes(startDt, newDurationMinutes);
    const updated: Booking = {
      ...existing,
      endDateTime: endDt.toISOString()
    };
    schedulingService.updateBooking(tenant?.id, updated);
    toast.success(`Updated duration for ${existing.customerName} to ${newDurationMinutes} mins`);
  };

  // Task / Reminder Handlers
  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    dueAt: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) => {
    const localNew: CalendarTaskItem = {
      id: `task-${Date.now().toString().slice(-5)}`,
      title: payload.title,
      description: payload.description,
      dueAt: payload.dueAt,
      priority: payload.priority,
      status: 'PENDING',
      activityType: 'todo',
      isLocalOnly: true
    };

    if (tenant?.id && session?.access_token) {
      try {
        const created = await RemindersClientService.createReminder(
          payload,
          session.access_token,
          tenant.id
        );
        const mapped = mapReminderToTaskItem(created);
        setTasks(prev => [mapped, ...prev]);
        setIsCreateEditOpen(false);
        toast.success('Reminder scheduled');
        return;
      } catch {
        // fallback to local storage
      }
    }

    const updatedLocal = [localNew, ...getLocalCalendarTasks(tenant?.id)];
    saveLocalCalendarTasks(tenant?.id, updatedLocal);
    setTasks(prev => [localNew, ...prev]);
    setIsCreateEditOpen(false);
    toast.success('Task added to Calendar');
  };

  const handleToggleTaskComplete = async (task: CalendarTaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: CalendarTaskItem['status'] =
      task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    if (selectedTask?.id === task.id) {
      setSelectedTask({ ...task, status: nextStatus });
    }

    if (task.isLocalOnly) {
      const updated = getLocalCalendarTasks(tenant?.id).map(t =>
        t.id === task.id ? { ...t, status: nextStatus } : t
      );
      saveLocalCalendarTasks(tenant?.id, updated);
    } else if (tenant?.id && session?.access_token) {
      try {
        await RemindersClientService.toggleComplete(task.id, session.access_token, tenant.id);
      } catch {
        // ignore
      }
    }
    toast.success(nextStatus === 'COMPLETED' ? 'Task completed' : 'Task reopened');
  };

  const handleDeleteTask = async (task: CalendarTaskItem) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setSelectedTask(null);

    if (task.isLocalOnly) {
      const updated = getLocalCalendarTasks(tenant?.id).filter(t => t.id !== task.id);
      saveLocalCalendarTasks(tenant?.id, updated);
    } else if (tenant?.id && session?.access_token) {
      try {
        await RemindersClientService.deleteReminder(task.id, session.access_token, tenant.id);
      } catch {
        // ignore
      }
    }
    toast.success('Task deleted');
  };

  const handleDropRescheduleTask = async (
    taskId: string,
    targetDate: Date,
    targetHour?: number,
    targetMinute: number = 0
  ) => {
    const existing = tasks.find(t => t.id === taskId);
    if (!existing) return;

    const oldDue = new Date(existing.dueAt);
    const newDue = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      targetHour !== undefined ? targetHour : oldDue.getHours(),
      targetHour !== undefined ? targetMinute : oldDue.getMinutes(),
      0,
      0
    ).toISOString();

    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, dueAt: newDue } : t)));
    if (existing.isLocalOnly) {
      const updated = getLocalCalendarTasks(tenant?.id).map(t =>
        t.id === taskId ? { ...t, dueAt: newDue } : t
      );
      saveLocalCalendarTasks(tenant?.id, updated);
    } else if (tenant?.id && session?.access_token) {
      try {
        await RemindersClientService.updateReminder(
          taskId,
          { dueAt: newDue },
          session.access_token,
          tenant.id
        );
      } catch {
        toast.error('Failed to persist reminder reschedule');
        return;
      }
    }
    toast.success(`Moved task to ${format(targetDate, 'MMM d')}`);
  };

  // Dynamic Header Title Label based on active View Mode
  const headerTitleLabel = useMemo(() => {
    if (viewMode === 'year') return format(currentDate, 'yyyy');
    if (viewMode === 'day') return format(currentDate, 'MMMM d, yyyy');
    if (viewMode === 'week' || viewMode === 'workweek') {
      const s = startOfWeek(currentDate, { weekStartsOn: viewMode === 'workweek' ? 1 : 0 });
      const e = viewMode === 'workweek' ? addDays(s, 4) : endOfWeek(currentDate);
      if (s.getMonth() === e.getMonth()) {
        return `${format(s, 'MMMM d')} – ${format(e, 'd, yyyy')}`;
      }
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate, viewMode]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
      {/* LEFT SIDEBAR: Create, Mini Calendar, Tasks Layer & Resource Pools */}
      {isSidebarOpen && (
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
        <div className="space-y-5">
          {/* Primary Actions */}
          <div className="space-y-2">
            <Button
              onClick={() => {
                setModalDraft({ mode: 'booking', date: currentDate, hour: 10 });
                setIsCreateEditOpen(true);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>New Booking / Task</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/workspace/settings/platform-modules/scheduling')}
              className="w-full text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-pointer"
            >
              <SlidersHorizontal size={12} className="mr-1 text-indigo-500" />
              Scheduling Engine Rules
            </Button>
          </div>

          {/* Real Interactive Mini Calendar with Month/Year Drilldown */}
          <SidebarMiniCalendar
            currentDate={currentDate}
            onSelectDate={d => setCurrentDate(d)}
            viewMode={viewMode}
            events={filteredEvents}
            tasks={filteredTasks}
            showTasksLayer={showTasksLayer}
          />

          {/* Calendar Layers (Tasks/Reminders & Blackouts) */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Calendar Layers
            </span>
            <div className="space-y-1">
              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs">
                <input
                  type="checkbox"
                  checked={showTasksLayer}
                  onChange={() => setShowTasksLayer(!showTasksLayer)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex-1">
                  Reminders & CRM Tasks
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  {tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs">
                <input
                  type="checkbox"
                  checked={showBlackouts}
                  onChange={() => setShowBlackouts(!showBlackouts)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                />
                <ShieldAlert size={13} className="text-rose-500 shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex-1">
                  Blackouts & Holidays
                </span>
                <span className="text-[10px] font-bold text-zinc-400">{blackouts.length}</span>
              </label>
            </div>
          </div>

          {/* Bookable Resource Pool Filter List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Bookable Resources ({resources.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedResourceIds(resources.map(r => r.id))}
                className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
              >
                All
              </button>
            </div>

            <div className="space-y-1">
              {resources.map(res => {
                const isChecked = selectedResourceIds.includes(res.id);
                return (
                  <label
                    key={res.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleResource(res.id)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', res.color || 'bg-indigo-500')} />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate flex-1">
                      {res.name}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-zinc-400">{res.type}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Active Hold & Shortcuts */}
        <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              <span>Active Holds</span>
            </span>
            <span>{activeHoldsCount} Active</span>
          </div>
          <button
            type="button"
            onClick={() => setShowShortcutsHint(!showShortcutsHint)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Keyboard size={11} />
              Keyboard Shortcuts
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">?</kbd>
          </button>
        </div>
      </aside>
      )}

      {/* MAIN CALENDAR AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation, Search, Filters & View Switcher */}
        <header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Sidebar Toggle + Today + Prev/Next + Fast Month/Year Picker */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 cursor-pointer"
                title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
              >
                {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                title="Jump to Today (T)"
              >
                Today
              </button>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 cursor-pointer"
                  title="Previous (J / Left Arrow)"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 cursor-pointer"
                  title="Next (K / Right Arrow)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <MonthYearPickerPopover
                currentDate={currentDate}
                onSelectDate={d => setCurrentDate(d)}
                onSwitchToYearView={() => setViewMode('year')}
                titleLabel={headerTitleLabel}
              />
            </div>

            {/* Right: View Mode Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl overflow-x-auto">
              {VIEW_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  title={`${tab.label} View (${tab.shortcut})`}
                  className={cn(
                    'px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer',
                    viewMode === tab.id
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Filter Strip: Search + Archetype Pills + Status */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search guests, resources, tasks... (/)"
                className="w-full pl-8 pr-7 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Types' },
                { id: 'APPOINTMENT', label: 'Appointments' },
                { id: 'RENTAL', label: 'Stays / Rentals' },
                { id: 'FIELD_SERVICE', label: 'Field Dispatch' },
                { id: 'CAPACITY', label: 'Capacity' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setArchetypeFilter(f.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border',
                    archetypeFilter === f.id
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  )}
                >
                  {f.label}
                </button>
              ))}

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="HELD">Held</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </header>

        {/* Calendar Body Viewport */}
        <div className="flex-1 overflow-hidden p-4">
          {(viewMode === 'day' || viewMode === 'week' || viewMode === 'workweek') && (
            <CalendarTimeGridView
              mode={viewMode}
              currentDate={currentDate}
              events={filteredEvents}
              tasks={filteredTasks}
              blackouts={blackouts}
              resources={resources.filter(r => selectedResourceIds.includes(r.id))}
              showTasksLayer={showTasksLayer}
              showBlackouts={showBlackouts}
              use24Hour={use24Hour}
              onSelectDate={d => setCurrentDate(d)}
              onDrillToDay={d => {
                setCurrentDate(d);
                setViewMode('day');
              }}
              onSelectEvent={ev => setSelectedEvent(ev)}
              onSelectTask={tk => setSelectedTask(tk)}
              onToggleTaskComplete={handleToggleTaskComplete}
              onCreateSlot={(date, hour, resourceId) => {
                setModalDraft({ mode: 'booking', date, hour, resourceId });
                setIsCreateEditOpen(true);
              }}
              onDropRescheduleEvent={handleDropRescheduleEvent}
              onDropRescheduleTask={handleDropRescheduleTask}
              onResizeEvent={handleResizeEvent}
            />
          )}

          {viewMode === 'month' && (
            <CalendarMonthView
              currentDate={currentDate}
              events={filteredEvents}
              tasks={filteredTasks}
              blackouts={blackouts}
              configs={configs}
              showTasksLayer={showTasksLayer}
              showBlackouts={showBlackouts}
              onDrillToDay={d => {
                setCurrentDate(d);
                setViewMode('day');
              }}
              onSelectEvent={ev => setSelectedEvent(ev)}
              onSelectTask={tk => setSelectedTask(tk)}
              onToggleTaskComplete={handleToggleTaskComplete}
              onCreateOnDate={date => {
                setModalDraft({ mode: 'booking', date, hour: 10 });
                setIsCreateEditOpen(true);
              }}
              onDropRescheduleEvent={(eventId, d) => handleDropRescheduleEvent(eventId, d)}
              onDropRescheduleTask={handleDropRescheduleTask}
            />
          )}

          {viewMode === 'year' && (
            <CalendarYearView
              currentDate={currentDate}
              events={filteredEvents}
              tasks={filteredTasks}
              showTasksLayer={showTasksLayer}
              onSelectDate={d => setCurrentDate(d)}
              onDrillToMonth={d => {
                setCurrentDate(d);
                setViewMode('month');
              }}
              onDrillToDay={d => {
                setCurrentDate(d);
                setViewMode('day');
              }}
            />
          )}

          {viewMode === 'dispatch' && (
            <CalendarDispatchView
              currentDate={currentDate}
              events={filteredEvents}
              resources={resources.filter(r => selectedResourceIds.includes(r.id))}
              blackouts={blackouts}
              showBlackouts={showBlackouts}
              onSelectEvent={ev => setSelectedEvent(ev)}
              onCreateSlot={(date, hour, resourceId) => {
                setModalDraft({ mode: 'booking', date, hour, resourceId });
                setIsCreateEditOpen(true);
              }}
              onDropRescheduleEvent={(eventId, d, hr, resId) =>
                handleDropRescheduleEvent(eventId, d, hr, 0, resId)
              }
            />
          )}

          {viewMode === 'schedule' && (
            <CalendarScheduleView
              currentDate={currentDate}
              events={filteredEvents}
              tasks={filteredTasks}
              showTasksLayer={showTasksLayer}
              onSelectEvent={ev => setSelectedEvent(ev)}
              onSelectTask={tk => setSelectedTask(tk)}
              onToggleTaskComplete={handleToggleTaskComplete}
              onQuickStatusChange={handleStatusChange}
              onCreateOnDate={date => {
                setModalDraft({ mode: 'booking', date, hour: 10 });
                setIsCreateEditOpen(true);
              }}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={ev => {
          setSelectedEvent(null);
          setModalDraft({ editingEvent: ev });
          setIsCreateEditOpen(true);
        }}
        onDelete={handleDeleteBooking}
        onStatusChange={handleStatusChange}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onToggleComplete={handleToggleTaskComplete}
        onDelete={handleDeleteTask}
      />

      <BookingCreateEditModal
        isOpen={isCreateEditOpen}
        draft={modalDraft}
        tenantId={tenant?.id}
        resources={resources}
        configs={configs}
        onClose={() => {
          setIsCreateEditOpen(false);
          setModalDraft(null);
        }}
        onSaveBooking={handleSaveBooking}
        onCreateTask={handleCreateTask}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {showShortcutsHint && (
        <div
          onClick={() => setShowShortcutsHint(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Keyboard size={15} className="text-indigo-500" />
                Calendar Keyboard Shortcuts
              </h4>
              <button
                type="button"
                onClick={() => setShowShortcutsHint(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['T', 'Jump to Today'],
                ['D / W / 5', 'Day / Week / Work Week'],
                ['M / Y', 'Month / Year View'],
                ['R / A', 'Dispatch / Agenda'],
                ['J / K or ← / →', 'Prev / Next Period'],
                ['C or N', 'New Booking / Task'],
                ['/', 'Focus Search Bar'],
                ['?', 'Toggle Shortcuts']
              ].map(([k, desc]) => (
                <div key={k} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">{desc}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] font-bold">
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarApp;

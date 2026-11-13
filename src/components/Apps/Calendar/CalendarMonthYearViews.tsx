import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  setMonth,
  setYear,
  addDays
} from 'date-fns';
import {
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  ShieldAlert,
  Users,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BookingResource, BlackoutDate, BookingConfig, BookingStatus } from '../../../types/scheduling';
import {
  CalendarEvent,
  CalendarTaskItem,
  ARCHETYPE_STYLES,
  doesEventOverlapDay,
  doesBlackoutOverlapDay,
  safeParseDate,
  formatTimeRange
} from './calendarUtils';

/* ============================================================================
 * 1. MONTH VIEW
 * ========================================================================== */
interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskItem[];
  blackouts: BlackoutDate[];
  configs: BookingConfig[];
  showTasksLayer: boolean;
  showBlackouts: boolean;
  onDrillToDay: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectTask: (task: CalendarTaskItem) => void;
  onToggleTaskComplete: (task: CalendarTaskItem, e: React.MouseEvent) => void;
  onCreateOnDate: (date: Date) => void;
  onDropRescheduleEvent: (eventId: string, targetDate: Date) => void;
  onDropRescheduleTask: (taskId: string, targetDate: Date) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  events,
  tasks,
  blackouts,
  configs,
  showTasksLayer,
  showBlackouts,
  onDrillToDay,
  onSelectEvent,
  onSelectTask,
  onToggleTaskComplete,
  onCreateOnDate,
  onDropRescheduleEvent,
  onDropRescheduleTask
}) => {
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [expandedDayModal, setExpandedDayModal] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Calculate dynamic turnover buffer dates from RENTAL bookings
  const turnoverDaySet = useMemo(() => {
    const set = new Set<string>();
    events.forEach(ev => {
      if (ev.archetype === 'RENTAL' && ev.status !== 'CANCELLED') {
        const cfg = configs.find(c => c.id === ev.configId);
        const bufferDays = cfg?.turnoverBufferDays ?? 1;
        if (bufferDays > 0) {
          const checkout = safeParseDate(ev.endDateTime);
          for (let i = 0; i < bufferDays; i++) {
            set.add(format(addDays(checkout, i), 'yyyy-MM-dd'));
          }
        }
      }
    });
    return set;
  }, [events, configs]);

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDateKey(null);
    const eventId = e.dataTransfer.getData('application/aurora-calendar-event');
    if (eventId) {
      onDropRescheduleEvent(eventId, day);
      return;
    }
    const taskId = e.dataTransfer.getData('application/aurora-calendar-task');
    if (taskId) {
      onDropRescheduleTask(taskId, day);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-center py-2.5 shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Month Days Matrix */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto custom-scrollbar">
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const inCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const isSelectedDate = isSameDay(day, currentDate);
          const isTurnover = turnoverDaySet.has(dateKey);
          const isDragOver = dragOverDateKey === dateKey;

          const dayEvents = events.filter(ev => doesEventOverlapDay(ev, day));
          const dayTasks = showTasksLayer
            ? tasks.filter(t => t.status !== 'CANCELLED' && isSameDay(safeParseDate(t.dueAt), day))
            : [];
          const dayBlackouts = showBlackouts
            ? blackouts.filter(bo => doesBlackoutOverlapDay(bo, day))
            : [];

          const totalItems = dayEvents.length + dayTasks.length;
          const maxVisible = dayBlackouts.length > 0 ? 2 : 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const remainingSlots = Math.max(0, maxVisible - visibleEvents.length);
          const visibleTasks = dayTasks.slice(0, remainingSlots);
          const hiddenCount = totalItems - (visibleEvents.length + visibleTasks.length);

          return (
            <div
              key={dateKey}
              onClick={() => onCreateOnDate(day)}
              onDragOver={e => {
                e.preventDefault();
                if (dragOverDateKey !== dateKey) setDragOverDateKey(dateKey);
              }}
              onDragLeave={() => {
                if (dragOverDateKey === dateKey) setDragOverDateKey(null);
              }}
              onDrop={e => handleDrop(e, day)}
              className={cn(
                'p-2 min-h-[115px] flex flex-col justify-between transition-all cursor-pointer group relative',
                inCurrentMonth
                  ? 'bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30'
                  : 'bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-400',
                isSelectedDate && inCurrentMonth && 'ring-1 ring-inset ring-indigo-500/30 bg-indigo-50/10',
                isDragOver && 'bg-indigo-500/15 ring-2 ring-inset ring-indigo-500'
              )}
            >
              {/* Top Row: Day Number + Badges */}
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDrillToDay(day);
                  }}
                  title="Open Day View"
                  className={cn(
                    'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer',
                    isTodayDate
                      ? 'bg-indigo-600 text-white font-black shadow-xs'
                      : inCurrentMonth
                      ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
                      : 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-200/50'
                  )}
                >
                  {format(day, 'd')}
                </button>

                <div className="flex items-center gap-1">
                  {isTurnover && (
                    <span
                      className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 px-1.5 py-0.2 rounded"
                      title="Property turnover cleaning buffer window"
                    >
                      Turnover
                    </span>
                  )}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-indigo-500 px-1">
                    +
                  </span>
                </div>
              </div>

              {/* Middle: Events, Blackouts & Tasks */}
              <div className="space-y-1 mt-1.5 flex-1">
                {dayBlackouts.slice(0, 1).map(bo => (
                  <div
                    key={bo.id}
                    onClick={e => e.stopPropagation()}
                    className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 truncate flex items-center gap-1"
                    title={`Blackout: ${bo.reason}`}
                  >
                    <ShieldAlert size={9} className="text-rose-500 shrink-0" />
                    <span className="truncate">{bo.reason}</span>
                  </div>
                ))}

                {visibleEvents.map(ev => {
                  const style = ARCHETYPE_STYLES[ev.archetype];
                  const start = safeParseDate(ev.startDateTime);
                  const end = safeParseDate(ev.endDateTime);
                  const multiDay = !isSameDay(start, end);
                  const isStartDay = isSameDay(start, day);
                  const isEndDay = isSameDay(end, day);

                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/aurora-calendar-event', ev.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        'px-1.5 py-1 text-[10px] font-bold border truncate transition-all shadow-2xs flex items-center gap-1 cursor-grab active:cursor-grabbing',
                        style.bg,
                        style.text,
                        multiDay
                          ? cn(
                              isStartDay ? `rounded-l-lg ${style.border}` : 'border-l-0 -ml-2 pl-2 border-amber-300/70 dark:border-amber-700/70',
                              isEndDay ? 'rounded-r-lg border-r border-amber-300/70 dark:border-amber-700/70' : 'border-r-0 -mr-2 pr-2 rounded-r-none'
                            )
                          : cn('rounded-lg', style.border),
                        ev.status === 'CANCELLED' && 'opacity-50 line-through'
                      )}
                      title={`${ev.customerName} — ${ev.configTitle} (${ev.resourceName})`}
                    >
                      {(!multiDay || isStartDay) && (
                        <span className="text-[9px] font-mono opacity-75 shrink-0">
                          {format(start, 'HH:mm')}
                        </span>
                      )}
                      <span className="truncate">
                        {multiDay && !isStartDay
                          ? `${ev.customerName}${isEndDay ? ' (Out)' : ''}`
                          : ev.customerName}
                      </span>
                    </div>
                  );
                })}

                {visibleTasks.map(task => {
                  const isDone = task.status === 'COMPLETED';
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/aurora-calendar-task', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        onSelectTask(task);
                      }}
                      className={cn(
                        'px-1.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 dark:border-emerald-700/70 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 truncate flex items-center gap-1 cursor-grab active:cursor-grabbing',
                        isDone && 'opacity-55 line-through'
                      )}
                      title={`Task: ${task.title}`}
                    >
                      <button
                        type="button"
                        onClick={e => onToggleTaskComplete(task, e)}
                        className="text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer"
                      >
                        {isDone ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                      </button>
                      <span className="truncate">{task.title}</span>
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedDayModal(day);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* "+X More" Day Overflow Popover Modal */}
      {expandedDayModal && (
        <div
          onClick={() => setExpandedDayModal(null)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                  {format(expandedDayModal, 'EEEE, MMMM d, yyyy')}
                </h4>
                <p className="text-[11px] text-zinc-400">All scheduled bookings & tasks</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const d = expandedDayModal;
                    setExpandedDayModal(null);
                    onDrillToDay(d);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold hover:underline cursor-pointer"
                >
                  Open Day View
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedDayModal(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {events
                .filter(ev => doesEventOverlapDay(ev, expandedDayModal))
                .map(ev => {
                  const style = ARCHETYPE_STYLES[ev.archetype];
                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setExpandedDayModal(null);
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs cursor-pointer transition-all',
                        style.bg,
                        style.border,
                        style.text
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{ev.customerName}</span>
                        <span className="text-[10px] font-mono">
                          {formatTimeRange(ev.startDateTime, ev.endDateTime)}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {ev.configTitle} • {ev.resourceName}
                      </p>
                    </div>
                  );
                })}

              {showTasksLayer &&
                tasks
                  .filter(t => t.status !== 'CANCELLED' && isSameDay(safeParseDate(t.dueAt), expandedDayModal))
                  .map(task => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setExpandedDayModal(null);
                        onSelectTask(task);
                      }}
                      className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => onToggleTaskComplete(task, e)}
                          className="text-emerald-600"
                        >
                          {task.status === 'COMPLETED' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </button>
                        <span className={cn('font-bold', task.status === 'COMPLETED' && 'line-through opacity-60')}>
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono">
                        {format(safeParseDate(task.dueAt), 'h:mm a')}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. YEAR VIEW (GOOGLE CALENDAR 12-MONTH OVERVIEW MATRIX)
 * ========================================================================== */
interface CalendarYearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskItem[];
  showTasksLayer: boolean;
  onSelectDate: (date: Date) => void;
  onDrillToMonth: (date: Date) => void;
  onDrillToDay: (date: Date) => void;
}

export const CalendarYearView: React.FC<CalendarYearViewProps> = ({
  currentDate,
  events,
  tasks,
  showTasksLayer,
  onSelectDate,
  onDrillToMonth,
  onDrillToDay
}) => {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, idx) => new Date(year, idx, 1));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 overflow-y-auto custom-scrollbar shadow-sm space-y-5">
      {/* Fast Year Bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-indigo-500" />
          <h3 className="text-lg font-black text-zinc-900 dark:text-white">{year} Annual Overview</h3>
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
            • Click any month title to open Month View, or any date to open Day View
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[year - 2, year - 1, year, year + 1, year + 2].map(yr => (
            <button
              key={yr}
              type="button"
              onClick={() => onSelectDate(setYear(currentDate, yr))}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
                yr === year
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* 12-Month Grid (4x3 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {months.map((monthStart, mIdx) => {
          const gridStart = startOfWeek(startOfMonth(monthStart));
          const gridEnd = endOfWeek(endOfMonth(monthStart));
          const mDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
          const isCurrentMonth =
            new Date().getFullYear() === year && new Date().getMonth() === mIdx;

          return (
            <div
              key={mIdx}
              className={cn(
                'p-4 rounded-2xl border transition-all',
                isCurrentMonth
                  ? 'border-indigo-500/40 bg-indigo-50/10 dark:bg-indigo-950/10'
                  : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => onDrillToMonth(setMonth(currentDate, mIdx))}
                  className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  {format(monthStart, 'MMMM')}
                </button>
                <button
                  type="button"
                  onClick={() => onDrillToMonth(setMonth(currentDate, mIdx))}
                  className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  Open &rarr;
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-black uppercase text-zinc-400 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center">
                {mDays.map(d => {
                  const inM = isSameMonth(d, monthStart);
                  const isT = isToday(d);
                  const isSel = isSameDay(d, currentDate);
                  const hasEv = inM && events.some(e => doesEventOverlapDay(e, d));
                  const hasTk =
                    inM &&
                    showTasksLayer &&
                    tasks.some(t => t.status !== 'CANCELLED' && isSameDay(safeParseDate(t.dueAt), d));

                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!inM}
                      onClick={() => onDrillToDay(d)}
                      className={cn(
                        'h-6 w-6 mx-auto rounded-md text-[10px] font-semibold flex items-center justify-center relative transition-all',
                        !inM && 'opacity-0 pointer-events-none',
                        inM && 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer text-zinc-700 dark:text-zinc-300',
                        (hasEv || hasTk) && !isT && !isSel && 'font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
                        isT && 'bg-indigo-600 text-white font-black shadow-2xs',
                        isSel && !isT && 'ring-1 ring-indigo-500 font-black'
                      )}
                      title={inM ? format(d, 'MMMM d, yyyy') : undefined}
                    >
                      {format(d, 'd')}
                      {(hasEv || hasTk) && !isT && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. DISPATCH / RESOURCE TIMELINE VIEW (OUTLOOK SCHEDULE SWIMLANES)
 * ========================================================================== */
interface CalendarDispatchViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resources: BookingResource[];
  blackouts: BlackoutDate[];
  showBlackouts: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateSlot: (date: Date, hour: number, resourceId?: string) => void;
  onDropRescheduleEvent: (
    eventId: string,
    targetDate: Date,
    targetHour: number,
    targetResourceId?: string
  ) => void;
}

const DISPATCH_HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

export const CalendarDispatchView: React.FC<CalendarDispatchViewProps> = ({
  currentDate,
  events,
  resources,
  blackouts,
  showBlackouts,
  onSelectEvent,
  onCreateSlot,
  onDropRescheduleEvent
}) => {
  const [scale, setScale] = useState<'day' | 'week'>('day');
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Users size={16} className="text-indigo-500" />
            Resource Dispatch & Swimlane Schedule
          </h3>
          <p className="text-[11px] text-zinc-400">
            Drag and drop bookings between resources or time slots to reassign and reschedule
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setScale('day')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
              scale === 'day'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            Hourly ({format(currentDate, 'MMM d')})
          </button>
          <button
            type="button"
            onClick={() => setScale('week')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
              scale === 'week'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            7-Day Resource Matrix
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {scale === 'day' ? (
          <div className="min-w-[1000px]">
            {/* X-Axis Hours Header */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 sticky top-0 z-20">
              <div className="w-56 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Bookable Resource ({resources.length})
              </div>
              <div
                className="flex-1 grid divide-x divide-zinc-200 dark:divide-zinc-800"
                style={{ gridTemplateColumns: `repeat(${DISPATCH_HOURS.length}, minmax(0, 1fr))` }}
              >
                {DISPATCH_HOURS.map(hr => (
                  <div key={hr} className="py-2.5 text-center text-[10px] font-mono font-bold text-zinc-500">
                    {format(new Date(2026, 0, 1, hr, 0), 'h a')}
                  </div>
                ))}
              </div>
            </div>

            {/* Y-Axis Resource Swimlanes */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resources.map(res => {
                const resEvents = events.filter(
                  ev => ev.resourceId === res.id && doesEventOverlapDay(ev, currentDate)
                );
                const isBlackedOut =
                  showBlackouts &&
                  blackouts.some(
                    bo => (!bo.resourceId || bo.resourceId === res.id) && doesBlackoutOverlapDay(bo, currentDate)
                  );

                return (
                  <div key={res.id} className="flex min-h-[76px] hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20">
                    {/* Resource Info Cell */}
                    <div className="w-56 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', res.color || 'bg-indigo-500')} />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {res.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400">
                        <span className="font-black uppercase">{res.type}</span>
                        {res.location && <span className="truncate">• {res.location}</span>}
                      </div>
                    </div>

                    {/* Hourly Slots */}
                    <div
                      className="flex-1 grid divide-x divide-zinc-100 dark:divide-zinc-800/70 relative"
                      style={{ gridTemplateColumns: `repeat(${DISPATCH_HOURS.length}, minmax(0, 1fr))` }}
                    >
                      {DISPATCH_HOURS.map(hr => {
                        const cellKey = `${res.id}-${hr}`;
                        const isOver = dragTarget === cellKey;
                        const isWorkHr = hr >= 9 && hr < 17;

                        return (
                          <div
                            key={hr}
                            onClick={() => onCreateSlot(currentDate, hr, res.id)}
                            onDragOver={e => {
                              e.preventDefault();
                              if (dragTarget !== cellKey) setDragTarget(cellKey);
                            }}
                            onDragLeave={() => {
                              if (dragTarget === cellKey) setDragTarget(null);
                            }}
                            onDrop={e => {
                              e.preventDefault();
                              setDragTarget(null);
                              const evId = e.dataTransfer.getData('application/aurora-calendar-event');
                              if (evId) onDropRescheduleEvent(evId, currentDate, hr, res.id);
                            }}
                            className={cn(
                              'h-full transition-colors cursor-pointer',
                              !isWorkHr && 'bg-zinc-50/70 dark:bg-zinc-950/40',
                              isBlackedOut && 'bg-rose-500/5',
                              isOver && 'bg-indigo-500/20 ring-2 ring-inset ring-indigo-500'
                            )}
                          />
                        );
                      })}

                      {/* Positioned Swimlane Bars */}
                      {resEvents.map(ev => {
                        const s = safeParseDate(ev.startDateTime);
                        const e = safeParseDate(ev.endDateTime);
                        const startHr = isSameDay(s, currentDate) ? s.getHours() + s.getMinutes() / 60 : 7;
                        const endHr = isSameDay(e, currentDate) ? e.getHours() + e.getMinutes() / 60 : 21;
                        const clampedStart = Math.max(7, Math.min(21, startHr));
                        const clampedEnd = Math.max(clampedStart + 0.5, Math.min(21, endHr));

                        const leftPct = ((clampedStart - 7) / DISPATCH_HOURS.length) * 100;
                        const widthPct = ((clampedEnd - clampedStart) / DISPATCH_HOURS.length) * 100;
                        const style = ARCHETYPE_STYLES[ev.archetype];

                        return (
                          <div
                            key={ev.id}
                            draggable
                            onDragStart={eDrag => {
                              eDrag.dataTransfer.setData('application/aurora-calendar-event', ev.id);
                              eDrag.dataTransfer.effectAllowed = 'move';
                            }}
                            onClick={eClick => {
                              eClick.stopPropagation();
                              onSelectEvent(ev);
                            }}
                            style={{
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              top: '8px',
                              bottom: '8px'
                            }}
                            className={cn(
                              'absolute z-10 rounded-xl p-2 border shadow-xs flex flex-col justify-center cursor-grab active:cursor-grabbing overflow-hidden',
                              style.bg,
                              style.border,
                              style.text
                            )}
                            title={`${ev.customerName} — ${ev.configTitle}`}
                          >
                            <span className="text-[11px] font-black truncate">{ev.customerName}</span>
                            <span className="text-[9px] font-mono opacity-80 truncate">
                              {formatTimeRange(ev.startDateTime, ev.endDateTime)} • {ev.configTitle}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 7-Day Resource Matrix */
          <div className="min-w-[900px]">
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 sticky top-0 z-20">
              <div className="w-56 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Resource Pool
              </div>
              <div className="flex-1 grid grid-cols-7 divide-x divide-zinc-200 dark:divide-zinc-800">
                {weekDays.map(d => (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'py-2 px-2 text-center',
                      isToday(d) && 'bg-indigo-50/50 dark:bg-indigo-950/20'
                    )}
                  >
                    <div className="text-[10px] font-black uppercase text-zinc-400">{format(d, 'EEE')}</div>
                    <div className="text-xs font-black text-zinc-900 dark:text-white">{format(d, 'MMM d')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resources.map(res => (
                <div key={res.id} className="flex min-h-[90px]">
                  <div className="w-56 shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', res.color || 'bg-indigo-500')} />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{res.name}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-zinc-400 mt-0.5">{res.type}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-7 divide-x divide-zinc-100 dark:divide-zinc-800">
                    {weekDays.map(d => {
                      const cellKey = `${res.id}-${format(d, 'yyyy-MM-dd')}`;
                      const cellEvents = events.filter(
                        ev => ev.resourceId === res.id && doesEventOverlapDay(ev, d)
                      );
                      return (
                        <div
                          key={cellKey}
                          onClick={() => onCreateSlot(d, 10, res.id)}
                          onDragOver={e => {
                            e.preventDefault();
                            if (dragTarget !== cellKey) setDragTarget(cellKey);
                          }}
                          onDragLeave={() => {
                            if (dragTarget === cellKey) setDragTarget(null);
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            setDragTarget(null);
                            const evId = e.dataTransfer.getData('application/aurora-calendar-event');
                            if (evId) {
                              const existing = events.find(x => x.id === evId);
                              const hr = existing ? safeParseDate(existing.startDateTime).getHours() : 10;
                              onDropRescheduleEvent(evId, d, hr, res.id);
                            }
                          }}
                          className={cn(
                            'p-1.5 space-y-1 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors',
                            dragTarget === cellKey && 'bg-indigo-500/20 ring-2 ring-inset ring-indigo-500'
                          )}
                        >
                          {cellEvents.map(ev => {
                            const style = ARCHETYPE_STYLES[ev.archetype];
                            return (
                              <div
                                key={ev.id}
                                draggable
                                onDragStart={eDrag => {
                                  eDrag.dataTransfer.setData('application/aurora-calendar-event', ev.id);
                                }}
                                onClick={eClick => {
                                  eClick.stopPropagation();
                                  onSelectEvent(ev);
                                }}
                                className={cn(
                                  'p-1.5 rounded-lg text-[10px] font-bold border truncate cursor-grab',
                                  style.bg,
                                  style.border,
                                  style.text
                                )}
                              >
                                <div className="truncate">{ev.customerName}</div>
                                <div className="text-[9px] font-mono opacity-75">
                                  {format(safeParseDate(ev.startDateTime), 'h:mm a')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. SCHEDULE / AGENDA VIEW (CHRONOLOGICAL GROUPED FEED)
 * ========================================================================== */
interface CalendarScheduleViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskItem[];
  showTasksLayer: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectTask: (task: CalendarTaskItem) => void;
  onToggleTaskComplete: (task: CalendarTaskItem, e: React.MouseEvent) => void;
  onQuickStatusChange: (eventId: string, status: BookingStatus) => void;
  onCreateOnDate: (date: Date) => void;
}

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({
  currentDate,
  events,
  tasks,
  showTasksLayer,
  onSelectEvent,
  onSelectTask,
  onToggleTaskComplete,
  onQuickStatusChange,
  onCreateOnDate
}) => {
  const [showPast, setShowPast] = useState(false);

  // Group events and tasks by YYYY-MM-DD sorted chronologically, anchored at currentDate unless showPast is enabled
  const groupedDays = useMemo(() => {
    const anchorStart = startOfDay(currentDate);
    const map = new Map<string, { date: Date; events: CalendarEvent[]; tasks: CalendarTaskItem[] }>();

    const ensureDay = (d: Date) => {
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, { date: d, events: [], tasks: [] });
      }
      return map.get(key)!;
    };

    events.forEach(ev => {
      const s = safeParseDate(ev.startDateTime);
      if (!showPast && isBefore(s, anchorStart)) return;
      ensureDay(s).events.push(ev);
    });

    if (showTasksLayer) {
      tasks
        .filter(t => t.status !== 'CANCELLED')
        .forEach(tk => {
          const d = safeParseDate(tk.dueAt);
          if (!showPast && isBefore(d, anchorStart)) return;
          ensureDay(d).tasks.push(tk);
        });
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);
  }, [events, tasks, showTasksLayer, currentDate, showPast]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6 h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-indigo-500" />
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white">
              Schedule & Operational Agenda
            </h3>
            <p className="text-[11px] text-zinc-400">
              {showPast
                ? 'Showing all historical & upcoming reservations and reminders'
                : `Upcoming from ${format(currentDate, 'EEEE, MMM d, yyyy')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
              showPast
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
            )}
          >
            {showPast ? 'Showing All Dates' : 'Show Past'}
          </button>
          <button
            type="button"
            onClick={() => onCreateOnDate(currentDate)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {groupedDays.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <CalendarIcon size={32} className="mx-auto text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No scheduled items match your filters</p>
          <p className="text-xs text-zinc-400">Try adjusting your resource filters or create a new booking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDays.map(group => {
            const isT = isToday(group.date);
            return (
              <div key={group.date.toISOString()} className="flex flex-col md:flex-row gap-4">
                {/* Left Date Badge */}
                <div className="md:w-44 shrink-0 flex md:flex-col items-baseline gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black',
                        isT
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                      )}
                    >
                      {format(group.date, 'd')}
                    </span>
                    <div>
                      <div className="text-xs font-black text-zinc-900 dark:text-white uppercase">
                        {isT ? 'Today' : format(group.date, 'EEEE')}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        {format(group.date, 'MMM yyyy')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Items List */}
                <div className="flex-1 space-y-2.5">
                  {group.events.map(ev => {
                    const style = ARCHETYPE_STYLES[ev.archetype];
                    return (
                      <div
                        key={ev.id}
                        onClick={() => onSelectEvent(ev)}
                        className="p-4 bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-500/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-2.5 h-10 rounded-full shrink-0', ev.resourceColor || 'bg-indigo-500')} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-black text-zinc-900 dark:text-white">
                                {ev.customerName}
                              </h4>
                              <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded', style.badge)}>
                                {style.label}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                                  ev.status === 'CONFIRMED' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                  ev.status === 'HELD' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                  ev.status === 'CHECKED_IN' && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                                  ev.status === 'COMPLETED' && 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300',
                                  ev.status === 'CANCELLED' && 'bg-rose-500/10 text-rose-600 line-through'
                                )}
                              >
                                {ev.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              {ev.configTitle} •{' '}
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {ev.resourceName}
                              </span>
                              {ev.notes ? ` — "${ev.notes}"` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <div className="text-right font-mono text-[11px]">
                            <p className="text-zinc-800 dark:text-zinc-200 font-bold">
                              {formatTimeRange(ev.startDateTime, ev.endDateTime)}
                            </p>
                            {ev.totalPrice ? (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ${ev.totalPrice} {ev.currency || 'USD'}
                              </p>
                            ) : null}
                          </div>

                          {ev.status === 'HELD' && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onQuickStatusChange(ev.id, 'CONFIRMED');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          {ev.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onQuickStatusChange(ev.id, 'CHECKED_IN');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Check In
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {group.tasks.map(task => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-4 hover:border-emerald-500/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={e => onToggleTaskComplete(task, e)}
                            className="text-emerald-600 dark:text-emerald-400 cursor-pointer"
                          >
                            {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-xs font-bold text-zinc-900 dark:text-white',
                                  isDone && 'line-through opacity-60'
                                )}
                              >
                                {task.title}
                              </span>
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                {task.priority} TASK
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                          {format(safeParseDate(task.dueAt), 'h:mm a')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

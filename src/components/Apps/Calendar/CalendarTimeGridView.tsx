import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addDays
} from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Columns,
  Calendar as CalendarIcon,
  ShieldAlert,
  GripVertical
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BookingResource, BlackoutDate } from '../../../types/scheduling';
import {
  CalendarEvent,
  CalendarTaskItem,
  ARCHETYPE_STYLES,
  doesEventOverlapDay,
  isMultiDayEvent,
  doesBlackoutOverlapDay,
  layoutDayEvents,
  safeParseDate,
  formatTimeRange
} from './calendarUtils';

interface CalendarTimeGridViewProps {
  mode: 'day' | 'week' | 'workweek';
  currentDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTaskItem[];
  blackouts: BlackoutDate[];
  resources: BookingResource[];
  showTasksLayer: boolean;
  showBlackouts: boolean;
  use24Hour?: boolean;
  workStartHour?: number;
  workEndHour?: number;
  onSelectDate: (date: Date) => void;
  onDrillToDay: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectTask: (task: CalendarTaskItem) => void;
  onToggleTaskComplete: (task: CalendarTaskItem, e: React.MouseEvent) => void;
  onCreateSlot: (date: Date, hour: number, resourceId?: string) => void;
  onDropRescheduleEvent: (
    eventId: string,
    targetDate: Date,
    targetHour: number,
    targetMinute?: number,
    targetResourceId?: string
  ) => void;
  onDropRescheduleTask: (
    taskId: string,
    targetDate: Date,
    targetHour: number,
    targetMinute?: number
  ) => void;
  onResizeEvent?: (eventId: string, newDurationMinutes: number) => void;
}

const HOUR_HEIGHT = 60; // 60px per hour -> 1440px total height
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const CalendarTimeGridView: React.FC<CalendarTimeGridViewProps> = ({
  mode,
  currentDate,
  events,
  tasks,
  blackouts,
  resources,
  showTasksLayer,
  showBlackouts,
  use24Hour = false,
  workStartHour = 9,
  workEndHour = 17,
  onSelectDate,
  onDrillToDay,
  onSelectEvent,
  onSelectTask,
  onToggleTaskComplete,
  onCreateSlot,
  onDropRescheduleEvent,
  onDropRescheduleTask,
  onResizeEvent
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [splitByResource, setSplitByResource] = useState(false);
  const [now, setNow] = useState(new Date());
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Drag-to-resize state
  const [resizing, setResizing] = useState<{
    eventId: string;
    initialY: number;
    initialDurationMins: number;
    previewDurationMins: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = Math.max(0, workStartHour - 1) * HOUR_HEIGHT;
    }
  }, [mode, workStartHour]);

  // Global mouse listeners for drag-to-resize
  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizing.initialY;
      // 30px = 30 mins -> snap to 30-min increments
      const deltaMins = Math.round(deltaY / 30) * 30;
      const nextDuration = Math.max(30, Math.min(720, resizing.initialDurationMins + deltaMins));
      setResizing(prev => (prev ? { ...prev, previewDurationMins: nextDuration } : null));
    };
    const handleMouseUp = () => {
      if (resizing && onResizeEvent && resizing.previewDurationMins !== resizing.initialDurationMins) {
        onResizeEvent(resizing.eventId, resizing.previewDurationMins);
      }
      setResizing(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, onResizeEvent]);

  const days = useMemo(() => {
    if (mode === 'day') return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: mode === 'workweek' ? 1 : 0 });
    if (mode === 'workweek') {
      return Array.from({ length: 5 }, (_, i) => addDays(start, i));
    }
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [mode, currentDate]);

  const columns = useMemo(() => {
    if (mode === 'day' && splitByResource && resources.length > 0) {
      return resources.map(res => ({
        key: `res-${res.id}`,
        date: currentDate,
        resource: res,
        title: res.name,
        subtitle: res.type
      }));
    }
    return days.map(d => ({
      key: d.toISOString(),
      date: d,
      resource: undefined as BookingResource | undefined,
      title: format(d, 'EEE'),
      subtitle: format(d, 'd')
    }));
  }, [mode, splitByResource, resources, currentDate, days]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPercent = (nowMinutes / 1440) * 100;

  const handleDragStartEvent = (e: React.DragEvent, eventId: string) => {
    if (resizing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/aurora-calendar-event', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartTask = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('application/aurora-calendar-task', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnHalfSlot = (
    e: React.DragEvent,
    targetDate: Date,
    targetHour: number,
    targetMinute: number,
    targetResourceId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    const eventId = e.dataTransfer.getData('application/aurora-calendar-event');
    if (eventId) {
      onDropRescheduleEvent(eventId, targetDate, targetHour, targetMinute, targetResourceId);
      return;
    }
    const taskId = e.dataTransfer.getData('application/aurora-calendar-task');
    if (taskId) {
      onDropRescheduleTask(taskId, targetDate, targetHour, targetMinute);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Sub-header for Day Mode Resource Split Toggle */}
      {mode === 'day' && (
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-indigo-500" />
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSplitByResource(!splitByResource)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer',
              splitByResource
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
            )}
          >
            <Columns size={12} />
            <span>{splitByResource ? 'Grouped by Resource Columns' : 'Split Columns by Resource'}</span>
          </button>
        </div>
      )}

      {/* Column Headers */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/80 shrink-0">
        <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase py-2">
          GMT{format(now, 'xxx')}
        </div>

        <div
          className="flex-1 grid divide-x divide-zinc-200 dark:divide-zinc-800"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map(col => {
            const isTodayCol = isToday(col.date);
            const isSelectedCol = isSameDay(col.date, currentDate);
            return (
              <div
                key={col.key}
                onClick={() => {
                  if (!col.resource) {
                    onSelectDate(col.date);
                    if (mode !== 'day') onDrillToDay(col.date);
                  }
                }}
                className={cn(
                  'py-2.5 px-2 text-center transition-colors cursor-pointer select-none',
                  isTodayCol && 'bg-indigo-50/40 dark:bg-indigo-950/20',
                  !col.resource && 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                )}
              >
                {col.resource ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2.5 h-2.5 rounded-full', col.resource.color || 'bg-indigo-500')} />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">
                        {col.resource.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                      {col.resource.type} {col.resource.location ? `• ${col.resource.location}` : ''}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-wider',
                        isTodayCol ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                      )}
                    >
                      {col.title}
                    </span>
                    <span
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all',
                        isTodayCol
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isSelectedCol
                          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {col.subtitle}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* All-Day / Multi-Day / Stay Rentals & Blackout Strip */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/40 shrink-0 min-h-[34px]">
        <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-[9px] font-black uppercase text-zinc-400 px-1 text-center">
          All-Day / Stays
        </div>
        <div
          className="flex-1 grid divide-x divide-zinc-200 dark:divide-zinc-800"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map(col => {
            const colMultiDayEvents = events.filter(ev => {
              if (!isMultiDayEvent(ev)) return false;
              if (col.resource && ev.resourceId !== col.resource.id) return false;
              return doesEventOverlapDay(ev, col.date);
            });
            const colBlackouts = showBlackouts
              ? blackouts.filter(bo => {
                  if (col.resource && bo.resourceId && bo.resourceId !== col.resource.id) return false;
                  return doesBlackoutOverlapDay(bo, col.date);
                })
              : [];

            return (
              <div
                key={`allday-${col.key}`}
                onClick={() => onCreateSlot(col.date, 14, col.resource?.id)}
                className="py-1 space-y-1 min-w-0 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors"
                title="Click to create a stay or all-day booking"
              >
                {colBlackouts.map(bo => {
                  const isStart = isSameDay(safeParseDate(bo.startDate), col.date);
                  const isEnd = isSameDay(safeParseDate(bo.endDate), col.date);
                  return (
                    <div
                      key={bo.id}
                      onClick={e => e.stopPropagation()}
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-y border-dashed border-zinc-400 dark:border-zinc-600 flex items-center gap-1 truncate',
                        isStart ? 'ml-1 rounded-l-md border-l' : 'border-l-0',
                        isEnd ? 'mr-1 rounded-r-md border-r' : 'border-r-0'
                      )}
                      title={`Blackout: ${bo.reason} (${bo.startDate} to ${bo.endDate})`}
                    >
                      <ShieldAlert size={10} className="text-rose-500 shrink-0" />
                      <span className="truncate">{isStart || mode === 'day' ? bo.reason : '···'}</span>
                    </div>
                  );
                })}
                {colMultiDayEvents.map(ev => {
                  const style = ARCHETYPE_STYLES[ev.archetype];
                  const isStart = isSameDay(safeParseDate(ev.startDateTime), col.date);
                  const isEnd = isSameDay(safeParseDate(ev.endDateTime), col.date);
                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={e => handleDragStartEvent(e, ev.id)}
                      onClick={e => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-bold border-y truncate cursor-pointer transition-all shadow-2xs',
                        style.bg,
                        style.text,
                        isStart ? `ml-1 rounded-l-md ${style.border}` : 'border-l-0 border-amber-300/70 dark:border-amber-700/70',
                        isEnd ? 'mr-1 rounded-r-md border-r border-amber-300/70 dark:border-amber-700/70' : 'border-r-0'
                      )}
                      title={`${ev.customerName} — ${ev.configTitle} (${ev.resourceName})`}
                    >
                      <span className="truncate">
                        {isStart || mode === 'day'
                          ? `${ev.customerName} • ${ev.resourceName}`
                          : `↳ ${ev.customerName}${isEnd ? ' (Check-out)' : ''}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable 24-Hour Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="flex relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Left Hour Labels Gutter */}
          <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/60 select-none">
            {HOURS.map(hour => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative border-b border-zinc-100 dark:border-zinc-800/60 pr-2 text-right"
              >
                <span className="text-[10px] font-mono font-bold text-zinc-400 -top-2 relative">
                  {hour === 0
                    ? ''
                    : format(new Date(2026, 0, 1, hour, 0), use24Hour ? 'HH:00' : 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Columns Grid */}
          <div
            className="flex-1 grid divide-x divide-zinc-200 dark:divide-zinc-800 relative"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map(col => {
              const isTodayCol = isToday(col.date);
              const singleDayEvents = events.filter(ev => {
                if (isMultiDayEvent(ev)) return false;
                if (col.resource && ev.resourceId !== col.resource.id) return false;
                return doesEventOverlapDay(ev, col.date);
              });

              const positionedEvents = layoutDayEvents(singleDayEvents, col.date);

              const dayTasks = showTasksLayer
                ? tasks.filter(t => {
                    if (t.status === 'CANCELLED') return false;
                    return isSameDay(safeParseDate(t.dueAt), col.date);
                  })
                : [];

              return (
                <div key={`grid-${col.key}`} className="relative h-full">
                  {/* 24 Hour Cells split into two 30-min drop/click halves */}
                  {HOURS.map(hour => {
                    const isWorkingHour = hour >= workStartHour && hour < workEndHour;
                    const topHalfKey = `${col.key}-${hour}-00`;
                    const bottomHalfKey = `${col.key}-${hour}-30`;

                    return (
                      <div
                        key={hour}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className={cn(
                          'border-b border-zinc-100 dark:border-zinc-800/70 relative flex flex-col',
                          !isWorkingHour && 'bg-zinc-50/60 dark:bg-zinc-950/30'
                        )}
                      >
                        {/* :00 Half */}
                        <div
                          onClick={() => onCreateSlot(col.date, hour, col.resource?.id)}
                          onDragOver={e => {
                            e.preventDefault();
                            if (dragOverSlot !== topHalfKey) setDragOverSlot(topHalfKey);
                          }}
                          onDragLeave={() => {
                            if (dragOverSlot === topHalfKey) setDragOverSlot(null);
                          }}
                          onDrop={e => handleDropOnHalfSlot(e, col.date, hour, 0, col.resource?.id)}
                          className={cn(
                            'flex-1 relative group cursor-pointer transition-colors border-b border-dashed border-zinc-100/80 dark:border-zinc-800/40',
                            dragOverSlot === topHalfKey && 'bg-indigo-500/20 ring-1 ring-inset ring-indigo-500'
                          )}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1.5 top-0.5 text-[9px] font-bold text-indigo-500 pointer-events-none">
                            + {format(new Date(2026, 0, 1, hour, 0), use24Hour ? 'HH:mm' : 'h:mm a')}
                          </span>
                        </div>

                        {/* :30 Half */}
                        <div
                          onClick={() => onCreateSlot(col.date, hour, col.resource?.id)}
                          onDragOver={e => {
                            e.preventDefault();
                            if (dragOverSlot !== bottomHalfKey) setDragOverSlot(bottomHalfKey);
                          }}
                          onDragLeave={() => {
                            if (dragOverSlot === bottomHalfKey) setDragOverSlot(null);
                          }}
                          onDrop={e => handleDropOnHalfSlot(e, col.date, hour, 30, col.resource?.id)}
                          className={cn(
                            'flex-1 relative group cursor-pointer transition-colors',
                            dragOverSlot === bottomHalfKey && 'bg-indigo-500/20 ring-1 ring-inset ring-indigo-500'
                          )}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1.5 top-0.5 text-[9px] font-bold text-indigo-500 pointer-events-none">
                            + {format(new Date(2026, 0, 1, hour, 30), use24Hour ? 'HH:mm' : 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Live Current-Time Red Line Indicator */}
                  {isTodayCol && (
                    <div
                      style={{ top: `${nowTopPercent}%` }}
                      className="absolute inset-x-0 z-30 pointer-events-none flex items-center"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shadow-sm ring-2 ring-white dark:ring-zinc-900" />
                      <div className="flex-1 h-[2px] bg-rose-500 shadow-xs" />
                    </div>
                  )}

                  {/* Positioned Timed Bookings */}
                  {positionedEvents.map(pos => {
                    const { event, topPercent, heightPercent, colIndex, totalCols, startMinutes, endMinutes } = pos;
                    const style = ARCHETYPE_STYLES[event.archetype];
                    const widthPct = 100 / totalCols;
                    const leftPct = colIndex * widthPct;

                    const isBeingResized = resizing?.eventId === event.id;
                    const effectiveHeightPct = isBeingResized
                      ? Math.max((30 / 1440) * 100, (resizing.previewDurationMins / 1440) * 100)
                      : heightPercent;

                    return (
                      <div
                        key={event.id}
                        draggable={!isBeingResized}
                        onDragStart={e => handleDragStartEvent(e, event.id)}
                        onClick={e => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        style={{
                          top: `${topPercent}%`,
                          height: `${effectiveHeightPct}%`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`
                        }}
                        className={cn(
                          'absolute z-20 rounded-xl p-2 pb-3 border shadow-xs transition-shadow cursor-grab active:cursor-grabbing overflow-hidden flex flex-col justify-between select-none group/ev',
                          style.bg,
                          style.border,
                          style.text,
                          event.status === 'CANCELLED' && 'opacity-50 line-through',
                          isBeingResized && 'ring-2 ring-indigo-500 z-40'
                        )}
                        title={`${event.customerName} — ${event.configTitle} (${formatTimeRange(event.startDateTime, event.endDateTime)})`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-black truncate">{event.customerName}</span>
                            <GripVertical size={11} className="opacity-40 shrink-0" />
                          </div>
                          <p className="text-[10px] font-semibold opacity-85 truncate">
                            {event.configTitle}
                          </p>
                          <p className="text-[9px] font-mono opacity-75 truncate mt-0.5">
                            {isBeingResized
                              ? `${resizing.previewDurationMins} mins`
                              : `${formatTimeRange(event.startDateTime, event.endDateTime)} • ${event.resourceName}`}
                          </p>
                        </div>

                        {event.status === 'HELD' && (
                          <span className="self-start text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200">
                            HOLD
                          </span>
                        )}

                        {/* Drag-to-Resize Bottom Handle */}
                        {onResizeEvent && (
                          <div
                            onMouseDown={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              const initialDurationMins = Math.max(30, endMinutes - startMinutes);
                              setResizing({
                                eventId: event.id,
                                initialY: e.clientY,
                                initialDurationMins,
                                previewDurationMins: initialDurationMins
                              });
                            }}
                            title="Drag to resize duration"
                            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover/ev:opacity-100 transition-opacity"
                          >
                            <div className="w-8 h-1 rounded-full bg-current opacity-40" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Positioned Reminders & CRM Tasks */}
                  {dayTasks.map(task => {
                    const due = safeParseDate(task.dueAt);
                    const startMin = due.getHours() * 60 + due.getMinutes();
                    const topPct = (startMin / 1440) * 100;
                    const isDone = task.status === 'COMPLETED';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => handleDragStartTask(e, task.id)}
                        onClick={e => {
                          e.stopPropagation();
                          onSelectTask(task);
                        }}
                        style={{
                          top: `${topPct}%`,
                          height: `${(35 / 1440) * 100}%`,
                          right: '4px',
                          left: '4px'
                        }}
                        className={cn(
                          'absolute z-25 rounded-lg px-2 py-1 border border-emerald-400/70 dark:border-emerald-600/70 bg-emerald-50/95 dark:bg-emerald-950/85 text-emerald-950 dark:text-emerald-100 shadow-xs flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-[10px] font-bold',
                          isDone && 'opacity-60 line-through'
                        )}
                        title={`Task: ${task.title} (${format(due, use24Hour ? 'HH:mm' : 'h:mm a')})`}
                      >
                        <button
                          type="button"
                          onClick={e => onToggleTaskComplete(task, e)}
                          className="text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform shrink-0 cursor-pointer"
                        >
                          {isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        </button>
                        <span className="truncate flex-1">{task.title}</span>
                        <span className="text-[9px] font-mono opacity-75 shrink-0">
                          {format(due, use24Hour ? 'HH:mm' : 'h:mm a')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

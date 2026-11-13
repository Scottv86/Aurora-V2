import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isSameWeek,
  isToday,
  addMonths,
  subMonths,
  setMonth,
  setYear
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CalendarEvent, CalendarTaskItem, CalendarViewMode, doesEventOverlapDay, safeParseDate } from './calendarUtils';

interface MonthYearPickerPopoverProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onSwitchToYearView?: () => void;
  titleLabel?: string;
}

export const MonthYearPickerPopover: React.FC<MonthYearPickerPopoverProps> = ({
  currentDate,
  onSelectDate,
  onSwitchToYearView,
  titleLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'months' | 'years'>('months');
  const [browseYear, setBrowseYear] = useState(currentDate.getFullYear());
  const [yearInput, setYearInput] = useState(String(currentDate.getFullYear()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBrowseYear(currentDate.getFullYear());
    setYearInput(String(currentDate.getFullYear()));
  }, [currentDate, isOpen]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const startDecadeYear = browseYear - (browseYear % 20);
  const yearGrid = Array.from({ length: 20 }, (_, i) => startDecadeYear + i);

  const handleYearInputCommit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(yearInput, 10);
    if (!isNaN(parsed) && parsed >= 1970 && parsed <= 2100) {
      setBrowseYear(parsed);
      const updated = setYear(currentDate, parsed);
      onSelectDate(updated);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setPickerMode('months');
          setIsOpen(!isOpen);
        }}
        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left cursor-pointer"
        title="Click to quickly select Month or Year"
      >
        <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
          {titleLabel || format(currentDate, 'MMMM yyyy')}
        </h2>
        <ChevronDown
          size={15}
          className={cn(
            'text-zinc-400 group-hover:text-indigo-500 transition-transform duration-150',
            isOpen && 'rotate-180 text-indigo-500'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Top Year Controls */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBrowseYear(y => (pickerMode === 'years' ? y - 20 : y - 1))}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                title={pickerMode === 'years' ? 'Previous 20 years' : 'Previous year'}
              >
                {pickerMode === 'years' ? <ChevronsLeft size={14} /> : <ChevronLeft size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setPickerMode(pickerMode === 'months' ? 'years' : 'months')}
                className="px-2.5 py-1 rounded-lg text-xs font-black text-zinc-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {pickerMode === 'months'
                  ? browseYear
                  : `${startDecadeYear} – ${startDecadeYear + 19}`}
              </button>

              <button
                type="button"
                onClick={() => setBrowseYear(y => (pickerMode === 'years' ? y + 20 : y + 1))}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                title={pickerMode === 'years' ? 'Next 20 years' : 'Next year'}
              >
                {pickerMode === 'years' ? <ChevronsRight size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            <form onSubmit={handleYearInputCommit} className="flex items-center gap-1">
              <input
                type="number"
                min={1970}
                max={2100}
                value={yearInput}
                onChange={e => setYearInput(e.target.value)}
                onBlur={handleYearInputCommit}
                className="w-16 px-2 py-1 text-xs font-bold text-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                title="Type any year and press Enter"
              />
            </form>
          </div>

          {/* Months Grid */}
          {pickerMode === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {months.map((mName, idx) => {
                const isSelected =
                  currentDate.getFullYear() === browseYear && currentDate.getMonth() === idx;
                const isThisMonth =
                  new Date().getFullYear() === browseYear && new Date().getMonth() === idx;

                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      const next = setMonth(setYear(currentDate, browseYear), idx);
                      onSelectDate(next);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      isThisMonth && !isSelected && 'border border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years 20-Year Grid */}
          {pickerMode === 'years' && (
            <div className="grid grid-cols-4 gap-1.5">
              {yearGrid.map(yr => {
                const isSelected = currentDate.getFullYear() === yr;
                const isCurrentYr = new Date().getFullYear() === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setBrowseYear(yr);
                      setYearInput(String(yr));
                      onSelectDate(setYear(currentDate, yr));
                      setPickerMode('months');
                    }}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      isCurrentYr && !isSelected && 'border border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Quick Actions */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                onSelectDate(new Date());
                setIsOpen(false);
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Jump to Today
            </button>
            {onSwitchToYearView && (
              <button
                type="button"
                onClick={() => {
                  onSwitchToYearView();
                  setIsOpen(false);
                }}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <CalendarIcon size={12} />
                Full Year View
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SidebarMiniCalendarProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  viewMode: CalendarViewMode;
  events: CalendarEvent[];
  tasks: CalendarTaskItem[];
  showTasksLayer: boolean;
}

export const SidebarMiniCalendar: React.FC<SidebarMiniCalendarProps> = ({
  currentDate,
  onSelectDate,
  viewMode,
  events,
  tasks,
  showTasksLayer
}) => {
  const [miniMonthDate, setMiniMonthDate] = useState<Date>(currentDate);
  const [miniMode, setMiniMode] = useState<'days' | 'months' | 'years'>('days');

  useEffect(() => {
    setMiniMonthDate(currentDate);
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(miniMonthDate));
    const end = endOfWeek(endOfMonth(miniMonthDate));
    return eachDayOfInterval({ start, end });
  }, [miniMonthDate]);

  const currentYear = miniMonthDate.getFullYear();
  const startDecade = currentYear - (currentYear % 12);

  return (
    <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-2.5 select-none">
      {/* Mini Calendar Header with Month & Year Drilldown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMiniMode(miniMode === 'months' ? 'days' : 'months')}
            className="text-xs font-black text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider px-1 py-0.5 rounded transition-colors cursor-pointer"
            title="Select Month"
          >
            {format(miniMonthDate, 'MMMM')}
          </button>
          <button
            type="button"
            onClick={() => setMiniMode(miniMode === 'years' ? 'days' : 'years')}
            className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-0.5 rounded transition-colors cursor-pointer"
            title="Select Year"
          >
            {format(miniMonthDate, 'yyyy')}
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (miniMode === 'years') {
                setMiniMonthDate(setYear(miniMonthDate, currentYear - 12));
              } else if (miniMode === 'months') {
                setMiniMonthDate(setYear(miniMonthDate, currentYear - 1));
              } else {
                setMiniMonthDate(subMonths(miniMonthDate, 1));
              }
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500 cursor-pointer"
            title="Previous"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (miniMode === 'years') {
                setMiniMonthDate(setYear(miniMonthDate, currentYear + 12));
              } else if (miniMode === 'months') {
                setMiniMonthDate(setYear(miniMonthDate, currentYear + 1));
              } else {
                setMiniMonthDate(addMonths(miniMonthDate, 1));
              }
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500 cursor-pointer"
            title="Next"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Mode: Days */}
      {miniMode === 'days' && (
        <>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-black uppercase text-zinc-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium">
            {calendarDays.map(day => {
              const inMonth = isSameMonth(day, miniMonthDate);
              const isSelected = isSameDay(day, currentDate);
              const isTodayDate = isToday(day);
              const inSelectedWeek =
                (viewMode === 'week' || viewMode === 'workweek') && isSameWeek(day, currentDate);

              const hasBooking = events.some(e => doesEventOverlapDay(e, day));
              const hasTask =
                showTasksLayer &&
                tasks.some(t => t.status !== 'CANCELLED' && isSameDay(safeParseDate(t.dueAt), day));

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    'h-7 w-7 mx-auto rounded-lg flex items-center justify-center transition-all relative text-[11px] cursor-pointer',
                    !inMonth && 'text-zinc-300 dark:text-zinc-600',
                    inMonth && !isSelected && 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60',
                    inSelectedWeek && !isSelected && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold',
                    isTodayDate && !isSelected && 'ring-1 ring-indigo-500 text-indigo-600 dark:text-indigo-400 font-black',
                    isSelected && 'bg-indigo-600 text-white font-bold shadow-xs'
                  )}
                >
                  {format(day, 'd')}
                  {(hasBooking || hasTask) && !isSelected && (
                    <div className="absolute bottom-0.5 flex items-center gap-0.5">
                      {hasBooking && <span className="w-1 h-1 rounded-full bg-indigo-500" />}
                      {hasTask && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Mode: Months */}
      {miniMode === 'months' && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {Array.from({ length: 12 }, (_, idx) => {
            const mDate = setMonth(miniMonthDate, idx);
            const isSel = isSameMonth(mDate, currentDate);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const target = setMonth(miniMonthDate, idx);
                  setMiniMonthDate(target);
                  onSelectDate(target);
                  setMiniMode('days');
                }}
                className={cn(
                  'py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                  isSel
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
                )}
              >
                {format(mDate, 'MMM')}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode: Years */}
      {miniMode === 'years' && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {Array.from({ length: 12 }, (_, idx) => {
            const yr = startDecade + idx;
            const isSel = currentDate.getFullYear() === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  const target = setYear(miniMonthDate, yr);
                  setMiniMonthDate(target);
                  onSelectDate(target);
                  setMiniMode('months');
                }}
                className={cn(
                  'py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                  isSel
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
                )}
              >
                {yr}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

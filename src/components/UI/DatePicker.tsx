import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  isValid,
  isWeekend,
  setYear,
  setMonth,
  isBefore,
  isAfter
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value: string; // ISO or YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  dateFormat?: string;
  excludeWeekends?: boolean;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  onBlur?: () => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date...",
  readonly = false,
  className,
  onBlur,
  dateFormat = 'PPP',
  excludeWeekends = false,
  min,
  max
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const date = new Date(value);
    return isValid(date) ? date : null;
  }, [value]);

  // Sync viewDate when opening if we have a value
  useEffect(() => {
    if (isOpen) {
      setViewMode('days');
      if (selectedDate) {
        setViewDate(selectedDate);
      }
    }
  }, [isOpen, selectedDate]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div 
        onClick={() => !readonly && setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white flex items-center justify-between cursor-pointer transition-all group",
          isOpen && "border-indigo-500 ring-4 ring-indigo-500/5 bg-white dark:bg-zinc-950",
          readonly && "cursor-default opacity-70 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className={cn("text-zinc-400", isOpen && "text-indigo-500")} />
          <span className={cn(!value && "text-zinc-400")}>
            {selectedDate ? format(selectedDate, dateFormat) : placeholder}
          </span>
        </div>
        {!readonly && value && (
          <button 
            onClick={clearDate}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 left-0 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <button 
                  onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                  className="text-left group/mode"
                >
                  <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover/mode:text-indigo-500 transition-colors">
                    {format(viewDate, 'MMMM')}
                  </span>
                </button>
                <button 
                  onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')}
                  className="text-left group/mode"
                >
                  <span className="text-[10px] text-zinc-400 font-medium group-hover/mode:text-indigo-500 transition-colors">
                    {format(viewDate, 'yyyy')}
                  </span>
                </button>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {viewMode === 'days' && (
              <>
                {/* Week Days */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="h-8 flex items-center justify-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, i) => {
                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(date, viewDate);
                    const isTodayDate = isToday(date);
                    const isWeekendDay = isWeekend(date);

                    const isBeforeMin = min ? isBefore(date, new Date(min)) && !isSameDay(date, new Date(min)) : false;
                    const isAfterMax = max ? isAfter(date, new Date(max)) && !isSameDay(date, new Date(max)) : false;
                    const isDisabled = (excludeWeekends && isWeekendDay) || isBeforeMin || isAfterMax;

                    return (
                      <button
                        key={i}
                        onClick={() => !isDisabled && handleDateSelect(date)}
                        disabled={isDisabled}
                        className={cn(
                          "h-8 rounded-lg text-[11px] font-medium flex items-center justify-center transition-all relative group",
                          !isCurrentMonth && "text-zinc-300 dark:text-zinc-700",
                          isCurrentMonth && !isSelected && !isDisabled && "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          isSelected && "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30",
                          isTodayDate && !isSelected && "text-indigo-600 font-bold",
                          isDisabled && "opacity-20 cursor-not-allowed grayscale"
                        )}
                      >
                        {format(date, 'd')}
                        {isTodayDate && !isSelected && (
                          <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const date = setMonth(viewDate, i);
                  const isSelected = isSameMonth(date, selectedDate || new Date());
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setViewDate(date);
                        setViewMode('days');
                      }}
                      className={cn(
                        "h-12 rounded-xl text-xs font-bold transition-all",
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      {format(date, 'MMM')}
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === 'years' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 20 }, (_, i) => {
                    const currentYear = viewDate.getFullYear();
                    const startYear = currentYear - (currentYear % 20);
                    const year = startYear + i;
                    const isSelected = selectedDate ? selectedDate.getFullYear() === year : false;
                    const isCurrent = new Date().getFullYear() === year;
                    
                    return (
                      <button
                        key={year}
                        onClick={() => {
                          setViewDate(setYear(viewDate, year));
                          setViewMode('days');
                        }}
                        className={cn(
                          "h-10 rounded-xl text-[11px] font-bold transition-all relative",
                          isSelected 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          isCurrent && !isSelected && "border border-indigo-500/30 text-indigo-500"
                        )}
                      >
                        {year}
                        {isCurrent && !isSelected && (
                          <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between px-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewDate(setYear(viewDate, viewDate.getFullYear() - 20));
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
                  >
                    <ChevronLeft size={12} />
                    Prev 20 Years
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewDate(setYear(viewDate, viewDate.getFullYear() + 20));
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-indigo-500 transition-colors uppercase tracking-widest"
                  >
                    Next 20 Years
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Footer / Quick Actions */}
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <button 
                onClick={() => handleDateSelect(new Date())}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
              >
                Today
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

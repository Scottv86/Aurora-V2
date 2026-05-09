import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Clock,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  className?: string;
  onBlur?: () => void;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  min?: string; // HH:mm
  max?: string; // HH:mm
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time...",
  readonly = false,
  className,
  onBlur,
  timeFormat = '12h',
  minuteStep = 15,
  min,
  max
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [hours, minutes] = useMemo(() => {
    if (!value) return [12, 0];
    const [h, m] = value.split(':').map(Number);
    return [h, m];
  }, [value]);

  const displayTime = useMemo(() => {
    if (!value) return placeholder;
    if (timeFormat === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const h = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }, [value, hours, minutes, placeholder, timeFormat]);

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

  const updateTime = (newHours: number, newMinutes: number) => {
    const h = Math.max(0, Math.min(23, newHours));
    const m = Math.max(0, Math.min(59, newMinutes));
    onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const setHour = (h: number) => updateTime(h, minutes);
  const setMinute = (m: number) => updateTime(hours, m);
  
  const isPM = hours >= 12;
  const toggleAMPM = () => {
    const newHours = isPM ? hours - 12 : hours + 12;
    updateTime(newHours, minutes);
  };

  const clearTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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
          <Clock size={14} className={cn("text-zinc-400", isOpen && "text-indigo-500")} />
          <span className={cn(!value && "text-zinc-400")}>
            {displayTime}
          </span>
        </div>
        {!readonly && value && (
          <button 
            onClick={clearTime}
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
            className="absolute z-[100] mt-2 left-0 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 overflow-hidden"
          >
            {/* Header / Selector */}
            <div className="flex flex-col items-center gap-6 py-2">
              <div className="flex items-center gap-4">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <button onClick={() => setHour((hours - 1 + 24) % 24)} className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors">
                    <ChevronUp size={20} />
                  </button>
                  <span className="text-3xl font-black text-zinc-900 dark:text-white w-12 text-center">
                    {timeFormat === '24h' ? hours.toString().padStart(2, '0') : (hours % 12 || 12)}
                  </span>
                  <button onClick={() => setHour((hours + 1) % 24)} className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors">
                    <ChevronDown size={20} />
                  </button>
                </div>

                <span className="text-2xl font-black text-zinc-300 dark:text-zinc-700">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <button onClick={() => setMinute((minutes - minuteStep + 60) % 60)} className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors">
                    <ChevronUp size={20} />
                  </button>
                  <span className="text-3xl font-black text-zinc-900 dark:text-white w-12 text-center">
                    {minutes.toString().padStart(2, '0')}
                  </span>
                  <button onClick={() => setMinute((minutes + minuteStep) % 60)} className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors">
                    <ChevronDown size={20} />
                  </button>
                </div>

                {/* AM/PM */}
                {timeFormat === '12h' && (
                  <button 
                    onClick={toggleAMPM}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-black text-zinc-600 dark:text-zinc-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    {isPM ? 'PM' : 'AM'}
                  </button>
                )}
              </div>

              {/* Quick Select Presets */}
              <div className="w-full space-y-3">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Quick Select</p>
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const steps = [];
                    for (let i = 0; i < 60; i += minuteStep) {
                      steps.push(i);
                    }
                    return steps.slice(0, 8).map(m => {
                      const mStr = m.toString().padStart(2, '0');
                      const timeStr = `${hours.toString().padStart(2, '0')}:${mStr}`;
                      const isDisabled = (min && timeStr < min) || (max && timeStr > max);
                      
                      return (
                        <button
                          key={m}
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setMinute(m)}
                          className={cn(
                            "py-2 rounded-lg text-[10px] font-bold transition-all border",
                            minutes === m 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                              : isDisabled 
                                ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
                                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:border-indigo-500/50"
                          )}
                        >
                          :{mStr}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <button 
                onClick={() => {
                  const now = new Date();
                  updateTime(now.getHours(), now.getMinutes());
                }}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
              >
                Now
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

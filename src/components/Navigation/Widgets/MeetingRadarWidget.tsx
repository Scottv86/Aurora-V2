import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Video, ChevronRight, SlidersHorizontal, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { WidgetCommonProps } from './types';
import { schedulingService } from '../../../services/schedulingService';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { Booking } from '../../../types/scheduling';

export const MeetingRadarWidget: React.FC<WidgetCommonProps> = ({ onOpenCustomize, isCompact }) => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const tenantId = tenant?.id;

  // Hydrate from backend scheduling service
  useEffect(() => {
    if (!tenantId) return;

    schedulingService.setAuthToken(token);
    schedulingService.syncFromBackend(tenantId, token);

    const loadBookings = () => {
      const all = schedulingService.getBookings(tenantId);
      const now = new Date();
      // Filter for future or currently active bookings
      const active = all
        .filter((b) => {
          const end = new Date(b.endDateTime);
          return end > now && b.status !== 'CANCELLED';
        })
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

      setUpcomingBookings(active);
    };

    loadBookings();
    const unsubscribe = schedulingService.subscribe(loadBookings);
    return () => unsubscribe();
  }, [tenantId, token]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const nextBooking = upcomingBookings[0];
  const now = Date.now();

  const getMinutesRemaining = (iso: string) => {
    const target = new Date(iso).getTime();
    return Math.max(0, Math.round((target - now) / (60 * 1000)));
  };

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const minutesToNext = nextBooking ? getMinutesRemaining(nextBooking.startDateTime) : null;
  const isHappeningNow = nextBooking && new Date(nextBooking.startDateTime).getTime() <= now;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left select-none cursor-pointer group",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
          isOpen && "bg-zinc-100 dark:bg-zinc-800"
        )}
        title={nextBooking ? `Next: ${nextBooking.configTitle || 'Booking'} in ${minutesToNext}m` : "Calendar Radar: Free"}
      >
        <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
          <Calendar size={12} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1">
            {isHappeningNow ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">In progress</span>
            ) : minutesToNext !== null ? (
              minutesToNext <= 60 ? `In ${minutesToNext}m` : `In ${Math.round(minutesToNext / 60)}h`
            ) : (
              'Free today'
            )}
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isHappeningNow ? "bg-amber-500 animate-ping" : nextBooking ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
            )} />
          </span>
          {!isCompact && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 tracking-tight max-w-[95px] truncate">
              {nextBooking ? (nextBooking.customerName || nextBooking.configTitle || 'Appointment') : 'No meetings'}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden z-[65] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Schedule</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCustomize();
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Customize widgets"
                >
                  <SlidersHorizontal size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Agenda items */}
          <div className="p-2 space-y-1.5 max-h-56 overflow-y-auto">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.slice(0, 4).map((b, idx) => (
                <div 
                  key={b.id}
                  className={cn(
                    "p-2 rounded-lg border transition-all text-xs",
                    idx === 0 
                      ? "bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200/80 dark:border-indigo-500/30"
                      : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {b.configTitle || 'Scheduled Event'}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        Up Next
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5 truncate">
                    {b.customerName || b.resourceName || 'Booked session'}
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{formatEventTime(b.startDateTime)} - {formatEventTime(b.endDateTime)}</span>
                    </div>
                    {b.archetype === 'APPOINTMENT' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        <Video size={10} />
                        Virtual
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-zinc-400 dark:text-zinc-500">
                <Calendar size={24} className="mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-semibold">No upcoming events today</p>
                <p className="text-[11px] mt-0.5">Your schedule is currently clear.</p>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/workspace/calendar');
              }}
              className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1"
            >
              <span>Open Full Calendar</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

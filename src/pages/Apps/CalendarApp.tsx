import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  Building2, 
  Wrench, 
  ShieldCheck, 
  SlidersHorizontal,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button, Input } from '../../components/UI/Primitives';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Booking, BookingArchetype, BookingStatus, BookingResource } from '../../types/scheduling';
import { usePlatform } from '../../context/PlatformContext';
import { schedulingService } from '../../services/schedulingService';

interface CalendarEvent extends Booking {
  resourceColor?: string;
}

const INITIAL_RESOURCES: BookingResource[] = [
  { id: 'res-sarah', name: 'Sarah Jenkins', type: 'STAFF', location: 'Office / Remote', capacity: 1, isActive: true, color: 'bg-indigo-500' },
  { id: 'res-alex', name: 'Alex Rivera', type: 'STAFF', location: 'Office / Remote', capacity: 1, isActive: true, color: 'bg-emerald-500' },
  { id: 'res-villa-101', name: 'Oceanfront Villa 101', type: 'PROPERTY', location: 'Pacific Heights', capacity: 8, isActive: true, color: 'bg-amber-500' },
  { id: 'res-mike-tech', name: 'Mike Kowalski (Van 4)', type: 'STAFF', location: 'Metro North', capacity: 1, skills: ['HVAC', 'Electrical'], isActive: true, color: 'bg-rose-500' },
  { id: 'res-boardroom-a', name: 'Boardroom Suite A', type: 'SPACE', location: 'Level 14', capacity: 15, isActive: true, color: 'bg-purple-500' }
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'bk-101',
    configId: 'cfg-property-airbnb',
    configTitle: 'Seaside Villa Property Rental',
    resourceId: 'res-villa-101',
    resourceName: 'Oceanfront Villa 101',
    archetype: 'RENTAL',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.vance@example.com',
    customerPhone: '+1 (555) 234-5678',
    startDateTime: '2026-10-25T14:00:00Z',
    endDateTime: '2026-10-28T10:00:00Z',
    status: 'CONFIRMED',
    totalPrice: 960,
    currency: 'USD',
    resourceColor: 'bg-amber-500',
    createdAt: '2026-10-21'
  },
  {
    id: 'bk-102',
    configId: 'cfg-meeting-30',
    configTitle: 'Executive Consultation',
    resourceId: 'res-sarah',
    resourceName: 'Sarah Jenkins',
    archetype: 'APPOINTMENT',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@techcorp.io',
    startDateTime: '2026-10-24T10:00:00Z',
    endDateTime: '2026-10-24T10:30:00Z',
    status: 'CONFIRMED',
    totalPrice: 150,
    currency: 'USD',
    resourceColor: 'bg-indigo-500',
    createdAt: '2026-10-22'
  },
  {
    id: 'bk-103',
    configId: 'cfg-field-service',
    configTitle: 'On-Site HVAC & Electrical Dispatch',
    resourceId: 'res-mike-tech',
    resourceName: 'Mike Kowalski (Van 4)',
    archetype: 'FIELD_SERVICE',
    customerName: 'Apex Logistics Hub',
    customerEmail: 'facilities@apexlogistics.com',
    customerPhone: '+1 (555) 909-1234',
    startDateTime: '2026-10-24T13:30:00Z',
    endDateTime: '2026-10-24T15:00:00Z',
    status: 'HELD',
    notes: 'HVAC Unit 3 rattling on Roof B.',
    resourceColor: 'bg-rose-500',
    createdAt: '2026-10-23'
  },
  {
    id: 'bk-104',
    configId: 'cfg-class-capacity',
    configTitle: 'Leadership Masterclass',
    resourceId: 'res-boardroom-a',
    resourceName: 'Boardroom Suite A',
    archetype: 'CAPACITY',
    customerName: 'David Kim',
    customerEmail: 'david.kim@acme.org',
    startDateTime: '2026-10-27T09:00:00Z',
    endDateTime: '2026-10-27T11:00:00Z',
    status: 'CONFIRMED',
    totalPrice: 75,
    currency: 'USD',
    resourceColor: 'bg-purple-500',
    createdAt: '2026-10-22'
  }
];

export const CalendarApp: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, members, modules } = usePlatform();

  const [resources, setResources] = useState<BookingResource[]>(() => 
    schedulingService.getResources(tenant?.id, members, modules)
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

  // Keep state synchronized with central scheduling service
  useEffect(() => {
    const refresh = () => {
      const resList = schedulingService.getResources(tenant?.id, members, modules);
      setResources(resList);
      const raw = schedulingService.getBookings(tenant?.id);
      setEvents(raw.map(b => ({
        ...b,
        resourceColor: resList.find(r => r.id === b.resourceId)?.color || 'bg-indigo-500'
      })));
    };
    refresh();
    return schedulingService.subscribe(refresh);
  }, [tenant?.id, members, modules]);

  // Keep selected resource ids updated if empty
  useEffect(() => {
    if (selectedResourceIds.length === 0 && resources.length > 0) {
      setSelectedResourceIds(resources.map(r => r.id));
    }
  }, [resources]);

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'dispatch'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 24)); // October 2026
  const [archetypeFilter, setArchetypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Booking Drawer State
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newResourceId, setNewResourceId] = useState(() => resources[0]?.id || 'res-default');
  const [newDate, setNewDate] = useState('2026-10-25');
  const [newSlotTime, setNewSlotTime] = useState('11:00 AM');
  const [newArchetype, setNewArchetype] = useState<BookingArchetype>('APPOINTMENT');

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.configTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchResource = selectedResourceIds.includes(e.resourceId);
      const matchArchetype = archetypeFilter === 'ALL' || e.archetype === archetypeFilter;
      return matchSearch && matchResource && matchArchetype;
    });
  }, [events, searchQuery, selectedResourceIds, archetypeFilter]);

  const toggleResource = (id: string) => {
    if (selectedResourceIds.includes(id)) {
      if (selectedResourceIds.length > 1) {
        setSelectedResourceIds(selectedResourceIds.filter(rId => rId !== id));
      }
    } else {
      setSelectedResourceIds([...selectedResourceIds, id]);
    }
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const res = resources.find(r => r.id === newResourceId) || resources[0];
    const created: Booking = {
      id: `bk-${Date.now().toString().slice(-4)}`,
      configId: 'cfg-manual-direct',
      configTitle: `${newArchetype.replace('_', ' ')} Booking`,
      resourceId: res ? res.id : 'res-default',
      resourceName: res ? res.name : 'Primary Resource',
      archetype: newArchetype,
      customerName: newCustomerName.trim(),
      customerEmail: newCustomerEmail.trim() || 'walkin@example.com',
      startDateTime: `${newDate}T11:00:00Z`,
      endDateTime: `${newDate}T12:00:00Z`,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    schedulingService.createBooking(tenant?.id, created);
    setIsBookingDrawerOpen(false);
    setNewCustomerName('');
    setNewCustomerEmail('');
    toast.success(`Booking created for ${created.customerName} on ${created.resourceName}!`);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
      
      {/* LEFT SIDEBAR: Mini Calendar & Resource Filter Controls */}
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col justify-between shrink-0 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          
          {/* Header Action */}
          <div className="space-y-2">
            <Button
              onClick={() => setIsBookingDrawerOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={15} />
              <span>New Reservation / Booking</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/workspace/settings/platform-modules/scheduling')}
              className="w-full text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
            >
              <SlidersHorizontal size={12} className="mr-1 text-indigo-500" />
              Scheduling Engine Rules
            </Button>
          </div>

          {/* Mini Calendar Card */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                {monthName} {year}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={handlePrev} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500">
                  <ChevronLeft size={13} />
                </button>
                <button onClick={handleNext} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-zinc-400">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const isSelected = day === currentDate.getDate();
                const hasEvent = events.some(e => new Date(e.startDateTime).getDate() === day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const next = new Date(currentDate);
                      next.setDate(day);
                      setCurrentDate(next);
                    }}
                    className={cn(
                      "h-7 w-7 mx-auto rounded-lg flex items-center justify-center transition-all relative text-[11px]",
                      isSelected 
                        ? "bg-indigo-600 text-white font-bold shadow-xs" 
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50"
                    )}
                  >
                    {day}
                    {hasEvent && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bookable Resource Pool Filter List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Bookable Resources ({resources.length})
              </span>
              <button 
                onClick={() => setSelectedResourceIds(resources.map(r => r.id))}
                className="text-[10px] font-bold text-indigo-500 hover:underline"
              >
                All
              </button>
            </div>

            <div className="space-y-1.5">
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
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", res.color || 'bg-indigo-500')} />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate flex-1">{res.name}</span>
                    <span className="text-[9px] uppercase font-bold text-zinc-400">{res.type}</span>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Active Hold Indicator */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-1 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              <span>Active Checkout Holds</span>
            </span>
            <span>1 Active</span>
          </div>
          <p className="text-[10px] text-zinc-400">Slots held atomically across public forms & site widgets.</p>
        </div>
      </aside>

      {/* MAIN CALENDAR DISPLAY AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Navigation & Controls Bar */}
        <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronRight size={16} />
              </button>
            </div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white">
              {monthName} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              {(['month', 'week', 'day', 'dispatch'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                    viewMode === mode
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Calendar Body Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

          {/* 1. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-[10px] font-black uppercase text-zinc-400 text-center py-2.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800 min-h-[600px]">
                {Array.from({ length: 35 }, (_, idx) => {
                  const dayNumber = idx - 3; // Offset for demo October 2026
                  const isValidDay = dayNumber > 0 && dayNumber <= 31;
                  const dayEvents = isValidDay 
                    ? filteredEvents.filter(e => {
                        const start = new Date(e.startDateTime).getDate();
                        const end = new Date(e.endDateTime).getDate();
                        return dayNumber >= start && dayNumber <= end;
                      })
                    : [];

                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "p-2 min-h-[110px] flex flex-col justify-between transition-colors",
                        isValidDay ? "bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20" : "bg-zinc-50/30 dark:bg-zinc-950/20 opacity-40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-bold",
                          dayNumber === 24 ? "w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black" : "text-zinc-600 dark:text-zinc-400"
                        )}>
                          {isValidDay ? dayNumber : ''}
                        </span>
                        {isValidDay && dayNumber === 29 && (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/60 px-1.5 rounded">Turnover</span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1">
                        {dayEvents.map(ev => (
                          <div 
                            key={ev.id}
                            className={cn(
                              "p-1.5 rounded-lg text-[10px] font-bold border truncate transition-all shadow-2xs",
                              ev.archetype === 'RENTAL' && "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200",
                              ev.archetype === 'APPOINTMENT' && "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/60 text-indigo-900 dark:text-indigo-200",
                              ev.archetype === 'FIELD_SERVICE' && "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200",
                              ev.archetype === 'CAPACITY' && "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700/60 text-purple-900 dark:text-purple-200"
                            )}
                            title={`${ev.customerName} — ${ev.configTitle}`}
                          >
                            <span className="truncate">{ev.customerName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. WEEK / DAY / DISPATCH VIEW */}
          {viewMode !== 'month' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {viewMode === 'dispatch' ? 'Field Dispatch & Resource Timeline' : 'Operational Agenda Timeline'}
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Real-time Synced
                </span>
              </div>

              <div className="space-y-2">
                {filteredEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-indigo-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-10 rounded-full shrink-0", ev.resourceColor || 'bg-indigo-500')} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{ev.customerName}</h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                            {ev.archetype.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {ev.configTitle} &bull; <span className="font-semibold text-zinc-700 dark:text-zinc-300">{ev.resourceName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right font-mono text-[11px]">
                        <p className="text-zinc-800 dark:text-zinc-200 font-bold">
                          {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-zinc-400 text-[10px]">
                          {new Date(ev.startDateTime).toLocaleDateString()}
                        </p>
                      </div>

                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        ev.status === 'CONFIRMED' && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
                        ev.status === 'HELD' && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 animate-pulse"
                      )}>
                        {ev.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* QUICK NEW BOOKING DRAWER */}
      {isBookingDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CalendarIcon size={16} className="text-indigo-500" />
                New Reservation / Booking
              </h3>
              <button onClick={() => setIsBookingDrawerOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Customer / Guest Name</label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Customer Email</label>
                <Input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="e.g. marcus@example.com"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Bookable Resource</label>
                <select
                  value={newResourceId}
                  onChange={(e) => setNewResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                >
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.type}] {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Slot Time</label>
                  <input
                    type="text"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBookingDrawerOpen(false)} className="text-xs font-semibold">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
                  Confirm Reservation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarApp;

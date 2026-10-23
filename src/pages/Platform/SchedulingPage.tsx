import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Building2, 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  MapPin,
  ArrowUpRight,
  SlidersHorizontal
} from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button, Input } from '../../components/UI/Primitives';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Booking, BookingStatus, BookingArchetype } from '../../types/scheduling';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../../context/PlatformContext';
import { schedulingService } from '../../services/schedulingService';

const DEMO_BOOKINGS: Booking[] = [
  {
    id: 'bk-1001',
    configId: 'cfg-property-airbnb',
    configTitle: 'Seaside Villa Property Rental',
    resourceId: 'res-villa-101',
    resourceName: 'Luxury Oceanfront Villa (Unit 101)',
    archetype: 'RENTAL',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.vance@example.com',
    customerPhone: '+1 (555) 234-5678',
    startDateTime: '2026-10-25T14:00:00Z',
    endDateTime: '2026-10-28T10:00:00Z',
    status: 'CONFIRMED',
    totalPrice: 960,
    currency: 'USD',
    createdAt: '2026-10-21T08:14:00Z'
  },
  {
    id: 'bk-1002',
    configId: 'cfg-meeting-30',
    configTitle: 'Executive Consultation',
    resourceId: 'res-sarah',
    resourceName: 'Sarah Jenkins',
    archetype: 'APPOINTMENT',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@techcorp.io',
    customerPhone: '+1 (555) 876-5432',
    startDateTime: '2026-10-24T10:00:00Z',
    endDateTime: '2026-10-24T10:30:00Z',
    status: 'CONFIRMED',
    totalPrice: 150,
    currency: 'USD',
    createdAt: '2026-10-22T14:30:00Z'
  },
  {
    id: 'bk-1003',
    configId: 'cfg-field-service',
    configTitle: 'On-Site HVAC & Electrical Dispatch',
    resourceId: 'res-mike-tech',
    resourceName: 'Mike Kowalski (Lead Dispatch Van 4)',
    archetype: 'FIELD_SERVICE',
    customerName: 'Apex Logistics Hub',
    customerEmail: 'facilities@apexlogistics.com',
    customerPhone: '+1 (555) 909-1234',
    startDateTime: '2026-10-24T13:30:00Z',
    endDateTime: '2026-10-24T15:00:00Z',
    status: 'HELD',
    notes: 'HVAC Unit 3 making severe rattling noise on Roof B.',
    createdAt: '2026-10-23T07:15:00Z'
  },
  {
    id: 'bk-1004',
    configId: 'cfg-class-capacity',
    configTitle: 'Leadership Masterclass',
    resourceId: 'res-boardroom-a',
    resourceName: 'Boardroom Suite A (AV Enabled)',
    archetype: 'CAPACITY',
    customerName: 'David Kim',
    customerEmail: 'david.kim@acme.org',
    startDateTime: '2026-10-27T09:00:00Z',
    endDateTime: '2026-10-27T11:00:00Z',
    status: 'CONFIRMED',
    totalPrice: 75,
    currency: 'USD',
    createdAt: '2026-10-22T11:20:00Z'
  }
];

export const SchedulingPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const [bookings, setBookings] = useState<Booking[]>(() => schedulingService.getBookings(tenant?.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'ledger' | 'timeline'>('ledger');

  useEffect(() => {
    const refresh = () => {
      setBookings(schedulingService.getBookings(tenant?.id));
    };
    refresh();
    return schedulingService.subscribe(refresh);
  }, [tenant?.id]);

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.configTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: BookingStatus) => {
    schedulingService.updateBookingStatus(tenant?.id, id, newStatus);
    setBookings(schedulingService.getBookings(tenant?.id));
    toast.success(`Booking ${id} status updated to ${newStatus}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
      <PageHeader
        title="Bookings & Scheduling"
        description="Tenant-wide booking ledger across portals, dynamic forms, Airbnb rentals, and field dispatch."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/workspace/settings/platform-modules/scheduling')}
              className="text-xs font-bold"
            >
              <SlidersHorizontal size={13} className="mr-1 text-indigo-500" />
              Configure Rules & Resources
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/workspace/apps/calendar')}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus size={14} className="mr-1" />
              New Manual Booking
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Operational Overview Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Bookings</span>
            <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{bookings.length}</p>
            <span className="text-xs text-indigo-500 font-semibold mt-1 inline-block">Active this cycle</span>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Confirmed & Ready</span>
            <p className="text-2xl font-black text-emerald-500 mt-1">
              {bookings.filter(b => b.status === 'CONFIRMED').length}
            </p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">Guaranteed reservations</span>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Temporary Holds</span>
            <p className="text-2xl font-black text-amber-500 mt-1">
              {bookings.filter(b => b.status === 'HELD').length}
            </p>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 inline-block">In checkout or review</span>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Billed Volume</span>
            <p className="text-2xl font-black text-purple-500 mt-1">
              ${bookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0).toLocaleString()}
            </p>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1 inline-block">Settled via Transactions</span>
          </div>
        </div>

        {/* Filters & Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings, guests, resources..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {['ALL', 'CONFIRMED', 'HELD', 'CHECKED_IN', 'COMPLETED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  statusFilter === status
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                )}
              >
                {status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Ledger Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-[10px] uppercase font-black tracking-wider text-zinc-400">
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer / Guest</th>
                  <th className="py-3 px-4">Policy & Archetype</th>
                  <th className="py-3 px-4">Bookable Resource</th>
                  <th className="py-3 px-4">Scheduled Window</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Settlement</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {b.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 dark:text-white">{b.customerName}</div>
                      <div className="text-[11px] text-zinc-400">{b.customerEmail}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{b.configTitle}</div>
                      <span className={cn(
                        "inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase mt-0.5",
                        b.archetype === 'APPOINTMENT' && "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
                        b.archetype === 'RENTAL' && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
                        b.archetype === 'FIELD_SERVICE' && "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
                        b.archetype === 'CAPACITY' && "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                      )}>
                        {b.archetype.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{b.resourceName}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {new Date(b.startDateTime).toLocaleDateString()} {new Date(b.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Until {new Date(b.endDateTime).toLocaleDateString()} {new Date(b.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        b.status === 'CONFIRMED' && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
                        b.status === 'HELD' && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
                        b.status === 'CHECKED_IN' && "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40",
                        b.status === 'COMPLETED' && "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {b.totalPrice ? (
                        <span className="font-bold text-zinc-900 dark:text-white">
                          ${b.totalPrice} <span className="text-[10px] text-zinc-400 font-normal">{b.currency}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">Free / N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'HELD' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                            className="h-7 text-[11px] font-bold text-emerald-600 border-emerald-200 dark:border-emerald-800"
                          >
                            Confirm
                          </Button>
                        )}
                        {b.status === 'CONFIRMED' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(b.id, 'CHECKED_IN')}
                            className="h-7 text-[11px] font-bold text-indigo-600 border-indigo-200 dark:border-indigo-800"
                          >
                            Check-in
                          </Button>
                        )}
                        {b.status === 'CHECKED_IN' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                            className="h-7 text-[11px] font-bold text-zinc-700 dark:text-zinc-300"
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SchedulingPage;

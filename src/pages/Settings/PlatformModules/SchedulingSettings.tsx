import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  Users, 
  Building2, 
  Wrench, 
  ShieldCheck, 
  Sliders, 
  Code, 
  Play, 
  Layers, 
  DollarSign, 
  ArrowRight, 
  Check, 
  Trash2, 
  Sparkles,
  MapPin,
  ChevronRight,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { Button, Input } from '../../../components/UI/Primitives';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { usePlatform } from '../../../context/PlatformContext';
import { schedulingService } from '../../../services/schedulingService';
import { 
  BookingConfig, 
  BookingResource, 
  BookingArchetype, 
  ResourceType, 
  Booking, 
  BlackoutDate 
} from '../../../types/scheduling';

// Demo initial configurations covering key use cases
const INITIAL_CONFIGS: BookingConfig[] = [
  {
    id: 'cfg-meeting-30',
    title: 'Executive Consultation',
    slug: 'executive-consultation',
    description: '1-on-1 strategic advisory session with auto calendar invites and video link generation.',
    archetype: 'APPOINTMENT',
    resourceIds: ['res-sarah', 'res-alex'],
    slotDurationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    minNoticeHours: 4,
    maxAdvanceDays: 60,
    requiresPayment: true,
    basePrice: 150,
    currency: 'USD',
    status: 'active',
    createdAt: '2026-10-15'
  },
  {
    id: 'cfg-property-airbnb',
    title: 'Seaside Villa Property Rental',
    slug: 'seaside-villa-rental',
    description: 'Nightly vacation property booking with automated check-in/out windows and turnover cleaning buffer.',
    archetype: 'RENTAL',
    resourceIds: ['res-villa-101'],
    checkInTime: '14:00',
    checkOutTime: '10:00',
    minNights: 2,
    maxNights: 30,
    turnoverBufferDays: 1,
    minNoticeHours: 24,
    maxAdvanceDays: 180,
    requiresPayment: true,
    basePrice: 320,
    currency: 'USD',
    status: 'active',
    createdAt: '2026-10-18'
  },
  {
    id: 'cfg-field-service',
    title: 'On-Site HVAC & Electrical Dispatch',
    slug: 'hvac-electrical-dispatch',
    description: 'Field service dispatching with technician skill matching, arrival windows, and dispatch queues.',
    archetype: 'FIELD_SERVICE',
    resourceIds: ['res-mike-tech'],
    slotDurationMinutes: 90,
    travelBufferMinutes: 30,
    requiresAddress: true,
    minNoticeHours: 2,
    maxAdvanceDays: 30,
    requiresPayment: false,
    workQueueId: 'queue-field-dispatch',
    status: 'active',
    createdAt: '2026-10-20'
  },
  {
    id: 'cfg-class-capacity',
    title: 'Leadership Masterclass',
    slug: 'leadership-masterclass',
    description: 'Interactive group workshop with a strict attendee capacity cap of 15 seats.',
    archetype: 'CAPACITY',
    resourceIds: ['res-boardroom-a'],
    slotDurationMinutes: 120,
    maxCapacity: 15,
    minNoticeHours: 12,
    maxAdvanceDays: 90,
    requiresPayment: true,
    basePrice: 75,
    currency: 'USD',
    status: 'active',
    createdAt: '2026-10-21'
  }
];

const INITIAL_RESOURCES: BookingResource[] = [
  {
    id: 'res-sarah',
    name: 'Sarah Jenkins',
    type: 'STAFF',
    entityType: 'workforce',
    entityId: 'wf-101',
    location: 'Headquarters / Remote',
    capacity: 1,
    skills: ['Executive Advisory', 'Finance'],
    isActive: true,
    color: 'bg-indigo-500'
  },
  {
    id: 'res-alex',
    name: 'Alex Rivera',
    type: 'STAFF',
    entityType: 'workforce',
    entityId: 'wf-102',
    location: 'Headquarters / Remote',
    capacity: 1,
    skills: ['Product Architecture', 'Technical Strategy'],
    isActive: true,
    color: 'bg-emerald-500'
  },
  {
    id: 'res-villa-101',
    name: 'Luxury Oceanfront Villa (Unit 101)',
    type: 'PROPERTY',
    entityType: 'record',
    entityId: 'prop-882',
    location: 'Pacific Heights Coastal Strip',
    capacity: 8,
    isActive: true,
    color: 'bg-amber-500'
  },
  {
    id: 'res-mike-tech',
    name: 'Mike Kowalski (Lead Dispatch Van 4)',
    type: 'STAFF',
    entityType: 'workforce',
    entityId: 'wf-109',
    location: 'Metro North Territory',
    capacity: 1,
    skills: ['HVAC Certified', 'Commercial Electrical', 'Gas Fitting'],
    isActive: true,
    color: 'bg-rose-500'
  },
  {
    id: 'res-boardroom-a',
    name: 'Boardroom Suite A (AV Enabled)',
    type: 'SPACE',
    entityType: 'record',
    entityId: 'space-04',
    location: 'Tower 2, Level 14',
    capacity: 15,
    isActive: true,
    color: 'bg-purple-500'
  }
];

const INITIAL_BLACKOUTS: BlackoutDate[] = [
  {
    id: 'bo-1',
    startDate: '2026-12-24',
    endDate: '2026-12-26',
    reason: 'Public Holiday Closure'
  },
  {
    id: 'bo-2',
    resourceId: 'res-villa-101',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    reason: 'Scheduled Roof & Deck Maintenance'
  }
];

export const SchedulingSettings = () => {
  const { tenant, members, modules } = usePlatform();
  const [activeTab, setActiveTab] = useState('overview');

  // Live tenant-scoped data from schedulingService
  const [configs, setConfigs] = useState<BookingConfig[]>(() => schedulingService.getConfigs(tenant?.id));
  const [resources, setResources] = useState<BookingResource[]>(() => schedulingService.getResources(tenant?.id, members, modules));
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(() => schedulingService.getBlackouts(tenant?.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetypeFilter, setSelectedArchetypeFilter] = useState<string>('ALL');

  // Keep state reactive to cross-window or local updates
  useEffect(() => {
    const refresh = () => {
      setConfigs(schedulingService.getConfigs(tenant?.id));
      setResources(schedulingService.getResources(tenant?.id, members, modules));
      setBlackouts(schedulingService.getBlackouts(tenant?.id));
    };
    refresh();
    return schedulingService.subscribe(refresh);
  }, [tenant?.id, members, modules]);

  // Modal State for new configuration
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArchetype, setNewArchetype] = useState<BookingArchetype>('APPOINTMENT');
  const [newPrice, setNewPrice] = useState('0');
  const [newDuration, setNewDuration] = useState('30');
  const [newMinNights, setNewMinNights] = useState('2');
  const [newTurnoverBuffer, setNewTurnoverBuffer] = useState('1');

  // Register Resource Modal State
  const [isRegisterResourceOpen, setIsRegisterResourceOpen] = useState(false);
  const [resSourceType, setResSourceType] = useState<'workforce' | 'module' | 'custom'>('workforce');
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id || '');
  const [resName, setResName] = useState(members[0]?.name || members[0]?.email || 'New Resource');
  const [resType, setResType] = useState<ResourceType>('STAFF');
  const [resLocation, setResLocation] = useState('');
  const [resCapacity, setResCapacity] = useState(1);
  const [resSkills, setResSkills] = useState('');

  // Add Blackout Modal State
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutResourceId, setBlackoutResourceId] = useState('');
  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');

  // Simulator State
  const [simConfigId, setSimConfigId] = useState<string>(configs[0]?.id || 'cfg-meeting-1on1');
  const [simSelectedDate, setSimSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simSelectedSlot, setSimSelectedSlot] = useState<string>('10:00 AM');
  const [simCheckIn, setSimCheckIn] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simCheckOut, setSimCheckOut] = useState<string>(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [simHoldState, setSimHoldState] = useState<{ active: boolean; expires: number } | null>(null);

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'overview', label: 'Overview & Health', icon: CalendarClock },
    { id: 'configs', label: 'Booking Archetypes', icon: Sliders, badge: configs.length },
    { id: 'resources', label: 'Resource Pools', icon: Users, badge: resources.length },
    { id: 'availability', label: 'Availability & Rules', icon: Clock },
    { id: 'embed', label: 'Builder & Embed Code', icon: Code },
    { id: 'simulator', label: 'Live Test Simulator', icon: Play }
  ];

  const filteredConfigs = useMemo(() => {
    return configs.filter(cfg => {
      const matchSearch = cfg.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cfg.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchArchetype = selectedArchetypeFilter === 'ALL' || cfg.archetype === selectedArchetypeFilter;
      return matchSearch && matchArchetype;
    });
  }, [configs, searchQuery, selectedArchetypeFilter]);

  const handleCreateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please specify a configuration title');
      return;
    }

    const created: BookingConfig = {
      id: `cfg-${Date.now()}`,
      title: newTitle.trim(),
      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `Configured for ${newArchetype.toLowerCase().replace('_', ' ')} operations.`,
      archetype: newArchetype,
      resourceIds: [resources[0]?.id || 'res-default'],
      slotDurationMinutes: Number(newDuration) || 30,
      minNoticeHours: 4,
      maxAdvanceDays: 60,
      minNights: Number(newMinNights) || 1,
      turnoverBufferDays: Number(newTurnoverBuffer) || 0,
      requiresPayment: Number(newPrice) > 0,
      basePrice: Number(newPrice) || 0,
      currency: 'USD',
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    schedulingService.saveConfig(tenant?.id, created);
    setConfigs(schedulingService.getConfigs(tenant?.id));
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewPrice('0');
    toast.success(`Booking configuration "${created.title}" created successfully!`);
  };

  const handleDeleteConfig = (cfgId: string) => {
    schedulingService.deleteConfig(tenant?.id, cfgId);
    setConfigs(schedulingService.getConfigs(tenant?.id));
    toast.success('Booking configuration removed');
  };

  const handleRegisterResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) {
      toast.error('Please provide a resource name');
      return;
    }

    const newRes: BookingResource = {
      id: `res-${Date.now()}`,
      name: resName.trim(),
      type: resType,
      entityId: resSourceType === 'workforce' ? selectedMemberId : undefined,
      entityType: resSourceType,
      location: resLocation.trim() || undefined,
      capacity: Number(resCapacity) || 1,
      skills: resSkills.split(',').map(s => s.trim()).filter(Boolean),
      isActive: true,
      color: 'bg-indigo-500'
    };

    schedulingService.registerResource(tenant?.id, newRes);
    setResources(schedulingService.getResources(tenant?.id, members, modules));
    setIsRegisterResourceOpen(false);
    setResName('');
    setResLocation('');
    setResSkills('');
    toast.success(`Resource "${newRes.name}" registered to pool!`);
  };

  const handleDeleteResource = (resId: string) => {
    schedulingService.deleteResource(tenant?.id, resId);
    setResources(schedulingService.getResources(tenant?.id, members, modules));
    toast.success('Resource removed from pool');
  };

  const handleSaveBlackoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutStart || !blackoutEnd) {
      toast.error('Please specify start and end dates');
      return;
    }

    const newBo: BlackoutDate = {
      id: `bo-${Date.now()}`,
      resourceId: blackoutResourceId || undefined,
      startDate: blackoutStart,
      endDate: blackoutEnd,
      reason: blackoutReason.trim() || 'Scheduled Blackout'
    };

    schedulingService.saveBlackout(tenant?.id, newBo);
    setBlackouts(schedulingService.getBlackouts(tenant?.id));
    setIsBlackoutModalOpen(false);
    setBlackoutReason('');
    toast.success('Blackout date period added');
  };

  const handleDeleteBlackout = (boId: string) => {
    schedulingService.deleteBlackout(tenant?.id, boId);
    setBlackouts(schedulingService.getBlackouts(tenant?.id));
    toast.success('Blackout date period removed');
  };

  const handleSimConfirmBooking = () => {
    const matchedResource = resources.find(r => activeSimConfig.resourceIds?.includes(r.id)) || resources[0];
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      configId: activeSimConfig.id,
      configTitle: activeSimConfig.title,
      resourceId: matchedResource?.id || 'res-1',
      resourceName: matchedResource?.name || 'Selected Resource',
      archetype: activeSimConfig.archetype,
      customerName: 'Simulator Test Client',
      customerEmail: 'test.client@example.com',
      startDateTime: activeSimConfig.archetype === 'RENTAL' ? `${simCheckIn}T14:00:00Z` : `${simSelectedDate}T${simSelectedSlot.split(' ')[0]}:00Z`,
      endDateTime: activeSimConfig.archetype === 'RENTAL' ? `${simCheckOut}T10:00:00Z` : `${simSelectedDate}T17:00:00Z`,
      status: 'CONFIRMED',
      totalPrice: activeSimConfig.basePrice || 0,
      currency: activeSimConfig.currency || 'USD',
      createdAt: new Date().toISOString()
    };
    schedulingService.createBooking(tenant?.id, newBooking);
    toast.success(`Booking #${newBooking.id} created and synchronized across Aurora!`);
  };

  const activeSimConfig = configs.find(c => c.id === simConfigId) || configs[0];

  const handleAcquireHold = () => {
    setSimHoldState({ active: true, expires: 600 });
    toast.success('Temporary atomic hold acquired! Slot locked for 10 minutes.');
  };

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Embed snippet copied to clipboard!');
  };

  return (
    <SettingsSubNavLayout
      title="Bookings & Scheduling"
      description="Central resource availability, appointment booking policies, property rentals, and field service dispatch."
      icon={CalendarClock}
      sectionTitle="Scheduling Engine"
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('simulator')}
            className="text-xs font-bold"
          >
            <Play size={13} className="mr-1 text-emerald-500 fill-emerald-500" />
            Open Simulator
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus size={14} className="mr-1" />
            New Booking Policy
          </Button>
        </div>
      }
    >
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* 1. OVERVIEW & HEALTH TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Active Policies</span>
                <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{configs.length}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500 font-semibold">
                  <Sliders size={13} />
                  <span>Across 4 archetypes</span>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bookable Resources</span>
                <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{resources.length}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                  <Users size={13} />
                  <span>Staff, properties, spaces</span>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Live Active Holds</span>
                <p className="text-2xl font-black text-amber-500 mt-1">3</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock size={13} />
                  <span>10m checkout lock window</span>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Integrations Connected</span>
                <p className="text-2xl font-black text-purple-500 mt-1">4</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  <Sparkles size={13} />
                  <span>Sites, Forms, Finance, Queues</span>
                </div>
              </div>
            </div>

            {/* Supported Archetypes Guide Banner */}
            <div className="p-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-zinc-900/50 border border-indigo-500/20 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400" />
                    Unified Archetype Capability
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
                    Aurora’s scheduling engine abstracts all booking models into a universal resource and availability pipeline.
                    Easily manage everything from simple 30-minute meetings to multi-night property stays and mobile technician dispatch.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                    <Clock size={14} /> Time-Slot Appointments
                  </div>
                  <p className="text-[11px] text-zinc-400">1:1 meetings, consulting, health consultations with buffer intervals.</p>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Building2 size={14} /> Nightly Rentals / Stays
                  </div>
                  <p className="text-[11px] text-zinc-400">Airbnb properties, rooms, car hire with check-in/out and turnover days.</p>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <Wrench size={14} /> Field Service Dispatch
                  </div>
                  <p className="text-[11px] text-zinc-400">Technician travel windows, skills matching, and automatic queue routing.</p>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                    <Users size={14} /> Group Capacity Sessions
                  </div>
                  <p className="text-[11px] text-zinc-400">Workshops, classes, and tours with strict maximum attendee seat limits.</p>
                </div>
              </div>
            </div>

            {/* Quick List of Active Configurations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">Active Booking Policies</h4>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('configs')} className="text-xs font-semibold">
                  View All &rarr;
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configs.slice(0, 4).map(cfg => (
                  <div key={cfg.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
                          cfg.archetype === 'APPOINTMENT' && "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50",
                          cfg.archetype === 'RENTAL' && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50",
                          cfg.archetype === 'FIELD_SERVICE' && "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50",
                          cfg.archetype === 'CAPACITY' && "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50"
                        )}>
                          {cfg.archetype.replace('_', ' ')}
                        </span>
                        {cfg.basePrice ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ${cfg.basePrice} {cfg.currency}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-zinc-400">Free / Custom Quote</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{cfg.title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{cfg.description}</p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                      <span>{cfg.resourceIds.length} Resource(s) assigned</span>
                      <button 
                        onClick={() => { setSimConfigId(cfg.id); setActiveTab('simulator'); }}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        Simulate <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. BOOKING CONFIGURATIONS TAB */}
        {activeTab === 'configs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search booking policies..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {['ALL', 'APPOINTMENT', 'RENTAL', 'FIELD_SERVICE', 'CAPACITY'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedArchetypeFilter(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                      selectedArchetypeFilter === type
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                    )}
                  >
                    {type === 'ALL' ? 'All Types' : type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredConfigs.map(cfg => (
                  <div key={cfg.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                          cfg.archetype === 'APPOINTMENT' && "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50",
                          cfg.archetype === 'RENTAL' && "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50",
                          cfg.archetype === 'FIELD_SERVICE' && "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50",
                          cfg.archetype === 'CAPACITY' && "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50"
                        )}>
                          {cfg.archetype.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{cfg.title}</h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{cfg.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-400 font-medium">
                        {cfg.slotDurationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-zinc-500" />
                            {cfg.slotDurationMinutes} mins duration
                          </span>
                        )}
                        {cfg.minNights && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} className="text-amber-500" />
                            Min {cfg.minNights} nights (Check-in {cfg.checkInTime})
                          </span>
                        )}
                        {cfg.turnoverBufferDays ? (
                          <span className="text-amber-500 font-semibold">
                            +{cfg.turnoverBufferDays} day turnover buffer
                          </span>
                        ) : null}
                        {cfg.basePrice ? (
                          <span className="text-emerald-500 font-bold">
                            ${cfg.basePrice} {cfg.currency}
                          </span>
                        ) : (
                          <span>No upfront fee</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSimConfigId(cfg.id);
                          setActiveTab('simulator');
                        }}
                        className="text-xs font-semibold"
                      >
                        <Play size={12} className="mr-1 text-emerald-500" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab('embed');
                        }}
                        className="text-xs font-semibold"
                      >
                        <Code size={12} className="mr-1 text-indigo-500" />
                        Embed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteConfig(cfg.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. RESOURCE POOLS TAB */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Registered Bookable Entities</h3>
                <p className="text-xs text-zinc-400">Team members, properties, rooms, vehicles, and equipment available for scheduling.</p>
              </div>
              <Button size="sm" onClick={() => setIsRegisterResourceOpen(true)} className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700">
                <Plus size={14} className="mr-1" />
                Register Resource
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map(res => (
                <div key={res.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", res.color || 'bg-indigo-500')} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        {res.type}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      Active
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{res.name}</h4>
                    {res.location && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-zinc-400" />
                        {res.location}
                      </p>
                    )}
                  </div>

                  {res.skills && res.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {res.skills.map(s => (
                        <span key={s} className="text-[10px] font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span className="truncate max-w-[200px]">
                      Capacity: {res.capacity || 1} • <span className="text-indigo-500 font-medium">{res.entityType === 'workforce' ? 'Workforce Member' : res.entityType === 'record' ? 'Module Record' : 'Custom Asset'}</span>
                    </span>
                    <button
                      onClick={() => handleDeleteResource(res.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                      title="Remove resource"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. AVAILABILITY & BLACKOUT RULES TAB */}
        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Tenant Default Working Hours</h3>
              <p className="text-xs text-zinc-400">Applies across all time-slot and field service resources unless customized individually.</p>

              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <div key={day} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 w-28">{day}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 font-mono text-[11px]">09:00 AM</span>
                      <span className="text-zinc-400">to</span>
                      <span className="px-2.5 py-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 font-mono text-[11px]">05:00 PM</span>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">Available</span>
                  </div>
                ))}
                {['Saturday', 'Sunday'].map(day => (
                  <div key={day} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs opacity-60">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 w-28">{day}</span>
                    <span className="text-zinc-400">Closed (Weekend)</span>
                    <span className="text-zinc-400 font-bold text-[11px]">Unavailable</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blackout Dates / Holidays */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Blackout & Holiday Dates</h3>
                  <p className="text-xs text-zinc-400">Dates where booking is blocked for maintenance or tenant holidays.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsBlackoutModalOpen(true)} className="text-xs font-semibold">
                  <Plus size={12} className="mr-1" />
                  Add Blackout Date
                </Button>
              </div>

              <div className="space-y-2">
                {blackouts.map(bo => (
                  <div key={bo.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{bo.reason}</p>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{bo.startDate} to {bo.endDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/40">
                        Blocked
                      </span>
                      <button
                        onClick={() => handleDeleteBlackout(bo.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                        title="Delete blackout date"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. BUILDER & EMBED CODE GENERATOR TAB */}
        {activeTab === 'embed' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Universal Builder Embed Integration</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Use the scheduling capability across all builder surfaces in Aurora. Copy ready-to-use snippets or configure in visual builders.
              </p>
            </div>

            {/* Embedding in Workspace Pages */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">1. Embed in Workspace Pages</h4>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyEmbedCode(`{\n  type: 'booking-calendar',\n  title: 'Operational Schedule',\n  properties: { configId: '${configs[0]?.id}' }\n}`)}
                  className="text-xs font-semibold"
                >
                  <Copy size={12} className="mr-1" /> Copy Widget JSON
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                In the Page Engine, drop the <code>booking-calendar</code> or <code>dispatch-board</code> widget to give staff an operational calendar view.
              </p>
              <pre className="p-3 bg-zinc-900 text-zinc-300 font-mono text-xs rounded-xl overflow-x-auto border border-zinc-800">
{`// UniversalWidgetRenderer widget configuration
{
  type: 'booking-calendar',
  title: 'Consultations & Stays Schedule',
  properties: {
    configId: '${configs[0]?.id}',
    viewMode: 'month', // 'day' | 'week' | 'month' | 'dispatch'
    allowManualBooking: true
  }
}`}
              </pre>
            </div>

            {/* Embedding in Sites & Portals */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-amber-500" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">2. Embed in Sites & Client Portals</h4>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyEmbedCode(`<BookingSlotPicker configId="${configs[0]?.id}" />`)}
                  className="text-xs font-semibold"
                >
                  <Copy size={12} className="mr-1" /> Copy Component Tag
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                In Site Builder (<a href="/workspace/settings/site-builder" className="text-indigo-500 underline">SiteBuilderPage.tsx</a>), add the <code>custom_form</code> or <code>booking-slot-picker</code> widget to let public visitors book instantly.
              </p>
              <pre className="p-3 bg-zinc-900 text-zinc-300 font-mono text-xs rounded-xl overflow-x-auto border border-zinc-800">
{`<!-- Site Builder Public Booking Widget -->
<BookingSlotPicker 
  configId="${configs[1]?.id}" 
  theme="modern"
  showPricingSummary={true}
  autoHoldDurationMinutes={10} 
/>`}
              </pre>
            </div>

            {/* Embedding in Form Builder */}
            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-emerald-500" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">3. Embed in Forms Library</h4>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyEmbedCode(`{ id: 'appointment_slot', type: 'booking_slot', configId: '${configs[0]?.id}' }`)}
                  className="text-xs font-semibold"
                >
                  <Copy size={12} className="mr-1" /> Copy Field Spec
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                In Form Builder, add a field of type <code>booking_slot</code>. It queries available slots and creates an atomic hold during form filling.
              </p>
            </div>
          </div>
        )}

        {/* 6. LIVE TEST SIMULATOR TAB */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Play size={16} className="text-emerald-500 fill-emerald-500" />
                  Interactive Booking Simulator
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Simulate visitor booking flows, slot calculation, temporary atomic holds, and pricing.
                </p>
              </div>

              <select
                value={simConfigId}
                onChange={(e) => setSimConfigId(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.archetype}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulator Interactive Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40">
                    {activeSimConfig.archetype.replace('_', ' ')}
                  </span>
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">{activeSimConfig.title}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeSimConfig.description}</p>
                </div>

                {activeSimConfig.basePrice ? (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Rate</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ${activeSimConfig.basePrice} <span className="text-xs font-normal text-zinc-400">{activeSimConfig.currency}</span>
                    </p>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-zinc-400">Free Inquiry</span>
                )}
              </div>

              {/* Archetype Specific Interactive Selectors */}
              {activeSimConfig.archetype === 'APPOINTMENT' || activeSimConfig.archetype === 'FIELD_SERVICE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">1. Select Date</label>
                    <input
                      type="date"
                      value={simSelectedDate}
                      onChange={(e) => setSimSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                    />
                    <p className="text-[11px] text-zinc-400">Operating hours 09:00 AM – 05:00 PM with {activeSimConfig.bufferBeforeMinutes || 0}m prep buffer.</p>
                  </div>

                  {/* Slot Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">2. Available Slots ({activeSimConfig.slotDurationMinutes} mins)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['09:00 AM', '10:00 AM', '11:30 AM', '01:30 PM', '03:00 PM', '04:15 PM'].map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSimSelectedSlot(slot)}
                          className={cn(
                            "py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center",
                            simSelectedSlot === slot
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                              : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeSimConfig.archetype === 'RENTAL' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date Range Selector for Property */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Check-in Date (From {activeSimConfig.checkInTime || '14:00'})</label>
                    <input
                      type="date"
                      value={simCheckIn}
                      onChange={(e) => setSimCheckIn(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Check-out Date (Until {activeSimConfig.checkOutTime || '10:00'})</label>
                    <input
                      type="date"
                      value={simCheckOut}
                      onChange={(e) => setSimCheckOut(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Capacity Status</p>
                  <p className="text-xs text-zinc-500">
                    Seats booked: <span className="font-bold text-indigo-500">8 / {activeSimConfig.maxCapacity || 15}</span> ({((8 / (activeSimConfig.maxCapacity || 15)) * 100).toFixed(0)}% full)
                  </p>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full w-[53%]" />
                  </div>
                </div>
              )}

              {/* Hold Acquisition & Checkout Simulation */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Concurrency & Hold Engine
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    {simHoldState?.active 
                      ? 'Temporary hold is ACTIVE. Slot is locked from public contention for 10 minutes.' 
                      : 'Slots are locked atomically during checkout to prevent double-booking.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {simHoldState?.active ? (
                    <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center gap-1">
                      <Clock size={13} className="animate-spin" />
                      Locked (9:45 remaining)
                    </span>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleAcquireHold}
                      className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Test Acquire Hold
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSimHoldState(null);
                      toast.info('Hold released back to pool.');
                    }}
                    className="text-xs font-semibold"
                  >
                    Release Hold
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSimConfirmBooking}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check size={13} className="mr-1" />
                    Book & Sync to Ledger
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CREATE NEW POLICY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sliders size={16} className="text-indigo-500" />
                New Booking Policy
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Policy Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 1-on-1 Strategy Session, Beach House Stay"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Booking Archetype</label>
                <select
                  value={newArchetype}
                  onChange={(e) => setNewArchetype(e.target.value as BookingArchetype)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                >
                  <option value="APPOINTMENT">Time-Slot Appointment (1:1 Consultations, meetings)</option>
                  <option value="RENTAL">Nightly Stay / Rental (Airbnb, rooms, equipment)</option>
                  <option value="FIELD_SERVICE">Field Service Dispatch (On-site callouts, van jobs)</option>
                  <option value="CAPACITY">Group Capacity Session (Workshops, tours)</option>
                </select>
              </div>

              {newArchetype === 'APPOINTMENT' || newArchetype === 'FIELD_SERVICE' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Slot Duration (Minutes)</label>
                  <Input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              ) : newArchetype === 'RENTAL' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Min Nights</label>
                    <Input
                      type="number"
                      value={newMinNights}
                      onChange={(e) => setNewMinNights(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Turnover Buffer (Days)</label>
                    <Input
                      type="number"
                      value={newTurnoverBuffer}
                      onChange={(e) => setNewTurnoverBuffer(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Base Price (USD, optional)</label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0 for free"
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* REGISTER RESOURCE MODAL */}
      {isRegisterResourceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                Register Bookable Resource
              </h3>
              <button 
                onClick={() => setIsRegisterResourceOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterResourceSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Resource Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'workforce', label: 'Workforce Member' },
                    { id: 'module', label: 'Module Record' },
                    { id: 'custom', label: 'Custom / Asset' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        const newSource = tab.id as any;
                        setResSourceType(newSource);
                        if (newSource === 'workforce') {
                          setResType('STAFF');
                          const firstMember = members[0];
                          if (firstMember) {
                            setSelectedMemberId(firstMember.id);
                            setResName(firstMember.name || firstMember.email);
                          }
                        } else if (newSource === 'module') {
                          setResType('PROPERTY');
                          const firstMod = modules[0];
                          if (firstMod) {
                            setSelectedModuleId(firstMod.id);
                            setResName(`${firstMod.name} Item`);
                          }
                        }
                      }}
                      className={cn(
                        "py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center",
                        resSourceType === tab.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {resSourceType === 'workforce' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Workforce Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      const m = members.find(mem => mem.id === e.target.value);
                      if (m) setResName(m.name || m.email);
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.role || 'Member'})
                      </option>
                    ))}
                    {members.length === 0 && (
                      <option value="">No tenant members found</option>
                    )}
                  </select>
                </div>
              )}

              {resSourceType === 'module' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Target Module</label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => {
                      setSelectedModuleId(e.target.value);
                      const mod = modules.find(m => m.id === e.target.value);
                      if (mod) setResName(`${mod.name} Resource`);
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                  >
                    {modules.map(mod => (
                      <option key={mod.id} value={mod.id}>
                        {mod.name} ({mod.schedulingRole || 'Standard Module'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Resource Name</label>
                <Input
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="e.g. John Doe, Ocean View Villa 101, Boardroom 4"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Resource Type</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value as ResourceType)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                  >
                    <option value="STAFF">Staff / Specialist</option>
                    <option value="PROPERTY">Property / Unit</option>
                    <option value="EQUIPMENT">Equipment / Vehicle</option>
                    <option value="SPACE">Facility / Space</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Capacity</label>
                  <Input
                    type="number"
                    value={resCapacity}
                    onChange={(e) => setResCapacity(Number(e.target.value))}
                    min={1}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Location / Base Address</label>
                <Input
                  value={resLocation}
                  onChange={(e) => setResLocation(e.target.value)}
                  placeholder="e.g. Headquarters / Remote, Level 3 Suite B"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Skills / Tags (Comma separated)</label>
                <Input
                  value={resSkills}
                  onChange={(e) => setResSkills(e.target.value)}
                  placeholder="e.g. HVAC, Electrical, Advisory"
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsRegisterResourceOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Register to Resource Pool
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BLACKOUT DATE MODAL */}
      {isBlackoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-rose-500" />
                Add Blackout / Maintenance Period
              </h3>
              <button 
                onClick={() => setIsBlackoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlackoutSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Applies To Resource</label>
                <select
                  value={blackoutResourceId}
                  onChange={(e) => setBlackoutResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                >
                  <option value="">All Resources (Global Tenant Blackout)</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Start Date</label>
                  <input
                    type="date"
                    value={blackoutStart}
                    onChange={(e) => setBlackoutStart(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">End Date</label>
                  <input
                    type="date"
                    value={blackoutEnd}
                    onChange={(e) => setBlackoutEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Reason / Description</label>
                <Input
                  value={blackoutReason}
                  onChange={(e) => setBlackoutReason(e.target.value)}
                  placeholder="e.g. Roof maintenance, Public Holiday closure, Deep clean"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsBlackoutModalOpen(false)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Add Blackout Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsSubNavLayout>
  );
};

export default SchedulingSettings;

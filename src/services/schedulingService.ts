import { 
  Booking, 
  BookingConfig, 
  BookingResource, 
  BlackoutDate, 
  BookingStatus,
  ResourceType 
} from '../types/scheduling';
import { TenantMember, Module } from '../types/platform';
import { API_BASE_URL } from '../config';

const SYNC_EVENT = 'aurora_scheduling_sync_event';

// Initial default configuration templates (used only on first run for an empty tenant)
const DEFAULT_CONFIGS: BookingConfig[] = [
  {
    id: 'cfg-meeting-1on1',
    title: '1:1 Client Consultation',
    slug: 'client-consultation',
    description: 'Direct consultation session with automated availability checking and video/meeting coordination.',
    archetype: 'APPOINTMENT',
    resourceIds: ['res-sarah', 'res-alex'],
    slotDurationMinutes: 45,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    minNoticeHours: 2,
    maxAdvanceDays: 60,
    requiresPayment: true,
    basePrice: 150,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cfg-stay-rental',
    title: 'Property / Space Reservation',
    slug: 'property-space-reservation',
    description: 'Multi-night stay or facility rental with check-in/out windows and turnover cleaning buffers.',
    archetype: 'RENTAL',
    resourceIds: ['res-villa-101'],
    checkInTime: '14:00',
    checkOutTime: '10:00',
    minNights: 1,
    maxNights: 30,
    turnoverBufferDays: 1,
    minNoticeHours: 12,
    maxAdvanceDays: 180,
    requiresPayment: true,
    basePrice: 320,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cfg-field-dispatch',
    title: 'On-Site Technician Dispatch',
    slug: 'technician-dispatch',
    description: 'Field service dispatching with arrival windows and technician allocation.',
    archetype: 'FIELD_SERVICE',
    resourceIds: ['res-mike-tech'],
    slotDurationMinutes: 90,
    travelBufferMinutes: 30,
    requiresAddress: true,
    minNoticeHours: 4,
    maxAdvanceDays: 30,
    requiresPayment: false,
    status: 'active',
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_RESOURCES: BookingResource[] = [
  {
    id: 'res-sarah',
    name: 'Sarah Jenkins',
    type: 'STAFF',
    location: 'HQ / Video Meet',
    capacity: 1,
    skills: ['Executive Advisory', 'Strategy'],
    isActive: true,
    color: 'bg-indigo-500'
  },
  {
    id: 'res-alex',
    name: 'Alex Rivera',
    type: 'STAFF',
    location: 'HQ / Remote',
    capacity: 1,
    skills: ['Product Architecture', 'Solutions'],
    isActive: true,
    color: 'bg-emerald-500'
  },
  {
    id: 'res-villa-101',
    name: 'Oceanfront Villa 101',
    type: 'PROPERTY',
    location: 'Pacific Heights Coastal',
    capacity: 8,
    isActive: true,
    color: 'bg-amber-500'
  },
  {
    id: 'res-mike-tech',
    name: 'Mike Kowalski (Van 4)',
    type: 'STAFF',
    location: 'Metro North Territory',
    capacity: 1,
    skills: ['HVAC', 'Electrical', 'Dispatch'],
    isActive: true,
    color: 'bg-rose-500'
  },
  {
    id: 'res-boardroom-a',
    name: 'Boardroom Suite A',
    type: 'SPACE',
    location: 'Tower 2, Level 14',
    capacity: 15,
    isActive: true,
    color: 'bg-purple-500'
  }
];

function buildDefaultBookings(): Booking[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const makeIso = (dayOffset: number, hour: number, minute: number = 0) => {
    const dt = new Date(y, m, d + dayOffset, hour, minute, 0, 0);
    return dt.toISOString();
  };

  return [
    {
      id: 'bk-101',
      configId: 'cfg-meeting-1on1',
      configTitle: '1:1 Client Consultation',
      resourceId: 'res-sarah',
      resourceName: 'Sarah Jenkins',
      archetype: 'APPOINTMENT',
      customerName: 'Elena Rostova',
      customerEmail: 'elena.rostova@techcorp.io',
      customerPhone: '+1 (555) 876-5432',
      startDateTime: makeIso(0, 10, 0),
      endDateTime: makeIso(0, 11, 0),
      status: 'CONFIRMED',
      totalPrice: 150,
      currency: 'USD',
      notes: 'Q4 enterprise architecture review & roadmap sign-off.',
      createdAt: makeIso(-2, 9, 0)
    },
    {
      id: 'bk-102',
      configId: 'cfg-field-dispatch',
      configTitle: 'On-Site Technician Dispatch',
      resourceId: 'res-mike-tech',
      resourceName: 'Mike Kowalski (Van 4)',
      archetype: 'FIELD_SERVICE',
      customerName: 'Apex Logistics Hub',
      customerEmail: 'facilities@apexlogistics.com',
      customerPhone: '+1 (555) 909-1234',
      startDateTime: makeIso(0, 13, 30),
      endDateTime: makeIso(0, 15, 30),
      status: 'HELD',
      notes: 'HVAC Unit 3 rattling on Roof B — bring replacement compressor relay.',
      createdAt: makeIso(-1, 14, 0)
    },
    {
      id: 'bk-103',
      configId: 'cfg-stay-rental',
      configTitle: 'Property / Space Reservation',
      resourceId: 'res-villa-101',
      resourceName: 'Oceanfront Villa 101',
      archetype: 'RENTAL',
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.vance@example.com',
      customerPhone: '+1 (555) 234-5678',
      startDateTime: makeIso(1, 14, 0),
      endDateTime: makeIso(4, 10, 0),
      status: 'CONFIRMED',
      totalPrice: 960,
      currency: 'USD',
      notes: 'VIP corporate retreat stay. Early luggage drop-off requested.',
      createdAt: makeIso(-5, 11, 0)
    },
    {
      id: 'bk-104',
      configId: 'cfg-class-capacity',
      configTitle: 'Leadership Masterclass',
      resourceId: 'res-boardroom-a',
      resourceName: 'Boardroom Suite A',
      archetype: 'CAPACITY',
      customerName: 'David Kim (12 Attendees)',
      customerEmail: 'david.kim@acme.org',
      customerPhone: '+1 (555) 345-6789',
      startDateTime: makeIso(2, 9, 30),
      endDateTime: makeIso(2, 11, 30),
      status: 'CONFIRMED',
      totalPrice: 900,
      currency: 'USD',
      notes: 'AV setup + catering coffee service required 15m prior.',
      createdAt: makeIso(-3, 16, 0)
    },
    {
      id: 'bk-105',
      configId: 'cfg-meeting-1on1',
      configTitle: 'Product Strategy Sync',
      resourceId: 'res-alex',
      resourceName: 'Alex Rivera',
      archetype: 'APPOINTMENT',
      customerName: 'Sora Takahashi',
      customerEmail: 'sora@kirei-ventures.jp',
      startDateTime: makeIso(-1, 15, 0),
      endDateTime: makeIso(-1, 16, 0),
      status: 'COMPLETED',
      totalPrice: 150,
      currency: 'USD',
      notes: 'Completed API integration scoping.',
      createdAt: makeIso(-4, 10, 0)
    }
  ];
}

class SchedulingService {
  private listeners: Set<() => void> = new Set();
  private authToken: string | null = null;
  private cachedModuleRecords: Map<string, Record<string, any[]>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('aurora_scheduling_')) {
          this.notify();
        }
      });
      window.addEventListener(SYNC_EVENT, () => {
        this.notify();
      });
    }
  }

  public setAuthToken(token?: string | null) {
    this.authToken = token || null;
  }

  private getHeaders(tenantId?: string, token?: string): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const effectiveToken = token || this.authToken;
    if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  public async syncFromBackend(tenantId?: string, token?: string): Promise<void> {
    if (!tenantId) return;
    if (token) this.authToken = token;
    const effectiveToken = token || this.authToken;
    if (!effectiveToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/scheduling`, {
        headers: this.getHeaders(tenantId, effectiveToken)
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.moduleRecords && typeof data.moduleRecords === 'object') {
        this.cachedModuleRecords.set(tenantId, data.moduleRecords);
      }

      let updated = false;
      if (Array.isArray(data.configs) && data.configs.length > 0) {
        localStorage.setItem(this.getStorageKey(tenantId, 'configs'), JSON.stringify(data.configs));
        updated = true;
      }
      if (Array.isArray(data.resources) && data.resources.length > 0) {
        localStorage.setItem(this.getStorageKey(tenantId, 'resources'), JSON.stringify(data.resources));
        updated = true;
      }
      if (Array.isArray(data.blackouts) && data.blackouts.length > 0) {
        localStorage.setItem(this.getStorageKey(tenantId, 'blackouts'), JSON.stringify(data.blackouts));
        updated = true;
      }
      if (Array.isArray(data.bookings) && data.bookings.length > 0) {
        localStorage.setItem(this.getStorageKey(tenantId, 'bookings'), JSON.stringify(data.bookings));
        updated = true;
      } else {
        // Seed backend with current local/default state on first run
        void this.pushFullStateToBackend(tenantId);
      }

      if (updated || data.moduleRecords) {
        this.notify();
      }
    } catch (e) {
      console.warn('[SchedulingService] Backend sync skipped:', e);
    }
  }

  private async pushFullStateToBackend(tenantId?: string): Promise<void> {
    if (!tenantId || !this.authToken) return;
    try {
      await fetch(`${API_BASE_URL}/api/scheduling/state`, {
        method: 'PUT',
        headers: this.getHeaders(tenantId),
        body: JSON.stringify({
          configs: this.getConfigs(tenantId),
          resources: this.readCustomResources(tenantId),
          blackouts: this.getBlackouts(tenantId),
          bookings: this.getBookings(tenantId)
        })
      });
    } catch (e) {
      console.warn('[SchedulingService] Failed to push state to backend:', e);
    }
  }

  private readCustomResources(tenantId?: string): BookingResource[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(tenantId, 'resources'));
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('[SchedulingService] Listener error:', e);
      }
    });
  }

  private emitSync() {
    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    }
  }

  private getStorageKey(tenantId: string | undefined, entity: string): string {
    const tid = tenantId || 'default_tenant';
    return `aurora_scheduling_${entity}_${tid}`;
  }

  // ---------------------------------------------------------------------------
  // CONFIGS (Booking Policies & Archetypes)
  // ---------------------------------------------------------------------------
  public getConfigs(tenantId?: string): BookingConfig[] {
    const key = this.getStorageKey(tenantId, 'configs');
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[SchedulingService] Error reading configs:', e);
    }
    // Seed defaults
    this.saveConfigs(tenantId, DEFAULT_CONFIGS);
    return DEFAULT_CONFIGS;
  }

  public saveConfig(tenantId: string | undefined, config: BookingConfig): void {
    const configs = this.getConfigs(tenantId);
    const index = configs.findIndex(c => c.id === config.id);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.unshift(config);
    }
    this.saveConfigs(tenantId, configs);
  }

  public deleteConfig(tenantId: string | undefined, configId: string): void {
    const configs = this.getConfigs(tenantId).filter(c => c.id !== configId);
    this.saveConfigs(tenantId, configs);
  }

  private saveConfigs(tenantId: string | undefined, configs: BookingConfig[]): void {
    const key = this.getStorageKey(tenantId, 'configs');
    try {
      localStorage.setItem(key, JSON.stringify(configs));
      this.emitSync();
    } catch (e) {
      console.error('[SchedulingService] Error saving configs:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // DYNAMIC RESOURCE POOL
  // ---------------------------------------------------------------------------
  /**
   * Retrieves all bookable resources for this tenant:
   * 1. Dynamic Workforce Members (if registered or mapped)
   * 2. Dynamic Module Records (from modules marked as RESOURCE_POOL)
   * 3. Explicitly registered standalone resources in tenant storage
   */
  public getResources(
    tenantId?: string,
    workforceMembers?: TenantMember[],
    modules?: Module[],
    moduleRecords?: Record<string, any[]>
  ): BookingResource[] {
    const key = this.getStorageKey(tenantId, 'resources');
    let customResources: BookingResource[] = [];
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          customResources = parsed;
        }
      }
      if (customResources.length === 0) {
        customResources = DEFAULT_RESOURCES;
        localStorage.setItem(key, JSON.stringify(DEFAULT_RESOURCES));
      }
    } catch (e) {
      console.warn('[SchedulingService] Error reading custom resources:', e);
      customResources = DEFAULT_RESOURCES;
    }

    const dynamicResources: BookingResource[] = [];
    const effectiveModuleRecords =
      moduleRecords || (tenantId ? this.cachedModuleRecords.get(tenantId) : undefined);

    // 1. Auto-discover from Module Records if module is marked as RESOURCE_POOL
    if (modules && effectiveModuleRecords) {
      modules.forEach(mod => {
        if (mod.schedulingRole === 'RESOURCE_POOL') {
          const records = effectiveModuleRecords[mod.id] || [];
          const category = (mod.schedulingConfig?.resourceType as ResourceType) || 'PROPERTY';

          records.forEach(r => {
            const resId = `res_mod_${mod.id}_${r.id}`;
            // Avoid duplicate if already registered with custom overrides
            if (!customResources.some(cr => cr.id === resId || cr.entityId === r.id)) {
              dynamicResources.push({
                id: resId,
                name: r.name || r.title || r.premises_name || r._record_key || `Asset #${r.id}`,
                type: category,
                entityId: r.id,
                entityType: 'record',
                location: r.address || r.location || mod.name,
                capacity: r.capacity ? Number(r.capacity) : 1,
                isActive: r.status !== 'INACTIVE' && r.status !== 'ARCHIVED',
                color: 'bg-emerald-500'
              });
            }
          });
        }
      });
    }

    // 2. Map workforce members if tenant has members
    if (workforceMembers && workforceMembers.length > 0) {
      workforceMembers.forEach(m => {
        const resId = `res_wf_${m.id}`;
        // If workforce member is not in custom list, add them as an available Staff resource
        if (!customResources.some(cr => cr.id === resId || cr.entityId === m.id)) {
          // If we have custom resources registered, only include members who are active
          if (customResources.length === 0 || m.status === 'Active') {
            dynamicResources.push({
              id: resId,
              name: m.name || m.email,
              type: 'STAFF',
              entityId: m.id,
              entityType: 'workforce',
              location: m.team || 'HQ / Workforce',
              capacity: 1,
              skills: m.position ? [m.position] : [],
              isActive: m.status === 'Active',
              color: 'bg-indigo-500',
              avatarUrl: m.avatarUrl
            });
          }
        }
      });
    }

    // Combine custom and dynamic
    const combined = [...customResources, ...dynamicResources];

    // Deduplicate by id
    const unique = Array.from(new Map(combined.map(r => [r.id, r])).values());
    return unique;
  }

  public registerResource(tenantId: string | undefined, resource: BookingResource): void {
    const key = this.getStorageKey(tenantId, 'resources');
    let customResources: BookingResource[] = [];
    try {
      const data = localStorage.getItem(key);
      if (data) customResources = JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }

    const index = customResources.findIndex(r => r.id === resource.id);
    if (index >= 0) {
      customResources[index] = resource;
    } else {
      customResources.unshift(resource);
    }

    localStorage.setItem(key, JSON.stringify(customResources));
    this.emitSync();
  }

  public deleteResource(tenantId: string | undefined, resourceId: string): void {
    const key = this.getStorageKey(tenantId, 'resources');
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const filtered = JSON.parse(data).filter((r: BookingResource) => r.id !== resourceId);
        localStorage.setItem(key, JSON.stringify(filtered));
        this.emitSync();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ---------------------------------------------------------------------------
  // BLACKOUT DATES
  // ---------------------------------------------------------------------------
  public getBlackouts(tenantId?: string): BlackoutDate[] {
    const key = this.getStorageKey(tenantId, 'blackouts');
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const seeded: BlackoutDate[] = [
      {
        id: 'bo-default-1',
        resourceId: 'res-villa-101',
        startDate: `${y}-${m}-18`,
        endDate: `${y}-${m}-19`,
        reason: 'Scheduled Deck & Pool Maintenance'
      },
      {
        id: 'bo-default-2',
        startDate: `${y}-12-25`,
        endDate: `${y}-12-26`,
        reason: 'Public Holiday Closure'
      }
    ];
    try {
      localStorage.setItem(key, JSON.stringify(seeded));
    } catch (e) {
      // ignore
    }
    return seeded;
  }

  public saveBlackout(tenantId: string | undefined, blackout: BlackoutDate): void {
    const blackouts = this.getBlackouts(tenantId);
    const index = blackouts.findIndex(b => b.id === blackout.id);
    if (index >= 0) {
      blackouts[index] = blackout;
    } else {
      blackouts.unshift(blackout);
    }
    const key = this.getStorageKey(tenantId, 'blackouts');
    localStorage.setItem(key, JSON.stringify(blackouts));
    this.emitSync();
  }

  public deleteBlackout(tenantId: string | undefined, blackoutId: string): void {
    const blackouts = this.getBlackouts(tenantId).filter(b => b.id !== blackoutId);
    const key = this.getStorageKey(tenantId, 'blackouts');
    localStorage.setItem(key, JSON.stringify(blackouts));
    this.emitSync();
  }

  // ---------------------------------------------------------------------------
  // CENTRALIZED BOOKINGS LEDGER
  // ---------------------------------------------------------------------------
  public getBookings(tenantId?: string): Booking[] {
    const key = this.getStorageKey(tenantId, 'bookings');
    try {
      // Also check fallback legacy global key for migration
      const legacyKey = 'aurora_bookings';
      const localData = localStorage.getItem(key);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        const parsedLegacy = JSON.parse(legacyData);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          // Migrate to tenant scoped key
          this.saveBookings(tenantId, parsedLegacy);
          return parsedLegacy;
        }
      }
    } catch (e) {
      console.warn('[SchedulingService] Error reading bookings:', e);
    }
    const seeded = buildDefaultBookings();
    this.saveBookings(tenantId, seeded);
    return seeded;
  }

  public checkConflict(
    tenantId: string | undefined,
    resourceId: string,
    startDateTime: string,
    endDateTime: string,
    excludeBookingId?: string
  ): { conflict?: Booking; blackout?: BlackoutDate } {
    const newStart = new Date(startDateTime).getTime();
    const newEnd = new Date(endDateTime).getTime();
    if (isNaN(newStart) || isNaN(newEnd)) return {};

    const bookings = this.getBookings(tenantId);
    const conflict = bookings.find(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.resourceId !== resourceId) return false;
      if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') return false;
      if (b.status === 'HELD' && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() < Date.now()) return false;
      }
      const existingStart = new Date(b.startDateTime).getTime();
      const existingEnd = new Date(b.endDateTime).getTime();
      return newStart < existingEnd && newEnd > existingStart;
    });

    const blackouts = this.getBlackouts(tenantId);
    const blackout = blackouts.find(bo => {
      if (bo.resourceId && bo.resourceId !== resourceId) return false;
      const boStart = new Date(`${bo.startDate}T00:00:00`).getTime();
      const boEnd = new Date(`${bo.endDate}T23:59:59`).getTime();
      return newStart <= boEnd && newEnd >= boStart;
    });

    return { conflict, blackout };
  }

  public createBooking(tenantId: string | undefined, booking: Booking): Booking {
    const bookings = this.getBookings(tenantId);
    const { conflict } = this.checkConflict(
      tenantId,
      booking.resourceId,
      booking.startDateTime,
      booking.endDateTime
    );

    if (conflict && booking.status !== 'HELD') {
      console.warn(`[SchedulingService] Potential conflict detected on resource ${booking.resourceName} with booking ${conflict.id}`);
    }

    const updated = [booking, ...bookings];
    this.saveBookings(tenantId, updated);
    if (tenantId && this.authToken) {
      void fetch(`${API_BASE_URL}/api/scheduling/bookings`, {
        method: 'POST',
        headers: this.getHeaders(tenantId),
        body: JSON.stringify(booking)
      }).catch(e => console.warn('[SchedulingService] POST booking failed:', e));
    }
    return booking;
  }

  public updateBooking(tenantId: string | undefined, updatedBooking: Booking): Booking {
    const bookings = this.getBookings(tenantId);
    const index = bookings.findIndex(b => b.id === updatedBooking.id);
    if (index >= 0) {
      bookings[index] = updatedBooking;
    } else {
      bookings.unshift(updatedBooking);
    }
    this.saveBookings(tenantId, bookings);
    if (tenantId && this.authToken) {
      void fetch(`${API_BASE_URL}/api/scheduling/bookings/${encodeURIComponent(updatedBooking.id)}`, {
        method: 'PATCH',
        headers: this.getHeaders(tenantId),
        body: JSON.stringify(updatedBooking)
      }).catch(e => console.warn('[SchedulingService] PATCH booking failed:', e));
    }
    return updatedBooking;
  }

  public updateBookingStatus(tenantId: string | undefined, bookingId: string, status: BookingStatus): void {
    const bookings = this.getBookings(tenantId);
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index >= 0) {
      bookings[index].status = status;
      this.saveBookings(tenantId, bookings);
      if (tenantId && this.authToken) {
        void fetch(`${API_BASE_URL}/api/scheduling/bookings/${encodeURIComponent(bookingId)}`, {
          method: 'PATCH',
          headers: this.getHeaders(tenantId),
          body: JSON.stringify({ status })
        }).catch(e => console.warn('[SchedulingService] PATCH status failed:', e));
      }
    }
  }

  public deleteBooking(tenantId: string | undefined, bookingId: string): void {
    const bookings = this.getBookings(tenantId).filter(b => b.id !== bookingId);
    this.saveBookings(tenantId, bookings);
    if (tenantId && this.authToken) {
      void fetch(`${API_BASE_URL}/api/scheduling/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'DELETE',
        headers: this.getHeaders(tenantId)
      }).catch(e => console.warn('[SchedulingService] DELETE booking failed:', e));
    }
  }

  private saveBookings(tenantId: string | undefined, bookings: Booking[]): void {
    const key = this.getStorageKey(tenantId, 'bookings');
    try {
      localStorage.setItem(key, JSON.stringify(bookings));
      // Also mirror to global for backwards compatibility with any remaining callers
      localStorage.setItem('aurora_bookings', JSON.stringify(bookings));
      this.emitSync();
    } catch (e) {
      console.error('[SchedulingService] Error saving bookings:', e);
    }
  }
}

export const schedulingService = new SchedulingService();

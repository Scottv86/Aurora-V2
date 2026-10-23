import { 
  Booking, 
  BookingConfig, 
  BookingResource, 
  BlackoutDate, 
  BookingStatus,
  BookingArchetype,
  ResourceType 
} from '../types/scheduling';
import { TenantMember, Module } from '../types/platform';

const SYNC_EVENT = 'aurora_scheduling_sync_event';

// Initial default configuration templates (used only on first run for an empty tenant)
const DEFAULT_CONFIGS: BookingConfig[] = [
  {
    id: 'cfg-meeting-1on1',
    title: '1:1 Client Consultation',
    slug: 'client-consultation',
    description: 'Direct consultation session with automated availability checking and video/meeting coordination.',
    archetype: 'APPOINTMENT',
    resourceIds: [],
    slotDurationMinutes: 45,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    minNoticeHours: 2,
    maxAdvanceDays: 60,
    requiresPayment: false,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cfg-stay-rental',
    title: 'Property / Space Reservation',
    slug: 'property-space-reservation',
    description: 'Multi-night stay or facility rental with check-in/out windows and turnover cleaning buffers.',
    archetype: 'RENTAL',
    resourceIds: [],
    checkInTime: '14:00',
    checkOutTime: '10:00',
    minNights: 1,
    maxNights: 30,
    turnoverBufferDays: 1,
    minNoticeHours: 12,
    maxAdvanceDays: 180,
    requiresPayment: true,
    basePrice: 250,
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
    resourceIds: [],
    slotDurationMinutes: 90,
    travelBufferMinutes: 30,
    requiresAddress: true,
    minNoticeHours: 4,
    maxAdvanceDays: 30,
    requiresPayment: false,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

class SchedulingService {
  private listeners: Set<() => void> = new Set();

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
        customResources = JSON.parse(data);
      }
    } catch (e) {
      console.warn('[SchedulingService] Error reading custom resources:', e);
    }

    const dynamicResources: BookingResource[] = [];

    // 1. Auto-discover from Module Records if module is marked as RESOURCE_POOL
    if (modules && moduleRecords) {
      modules.forEach(mod => {
        if (mod.schedulingRole === 'RESOURCE_POOL') {
          const records = moduleRecords[mod.id] || [];
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
    return [];
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
        if (Array.isArray(parsed)) return parsed;
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
    return [];
  }

  public createBooking(tenantId: string | undefined, booking: Booking): Booking {
    const bookings = this.getBookings(tenantId);
    
    // Check conflicts on resource
    const newStart = new Date(booking.startDateTime).getTime();
    const newEnd = new Date(booking.endDateTime).getTime();

    const conflicting = bookings.find(b => {
      if (b.resourceId !== booking.resourceId) return false;
      if (b.status === 'CANCELLED' || b.status === 'NO_SHOW') return false;
      // If held, check if hold expired
      if (b.status === 'HELD' && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() < Date.now()) return false;
      }
      const existingStart = new Date(b.startDateTime).getTime();
      const existingEnd = new Date(b.endDateTime).getTime();
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (conflicting && booking.status !== 'HELD') {
      console.warn(`[SchedulingService] Potential conflict detected on resource ${booking.resourceName} with booking ${conflicting.id}`);
    }

    const updated = [booking, ...bookings];
    this.saveBookings(tenantId, updated);
    return booking;
  }

  public updateBookingStatus(tenantId: string | undefined, bookingId: string, status: BookingStatus): void {
    const bookings = this.getBookings(tenantId);
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index >= 0) {
      bookings[index].status = status;
      this.saveBookings(tenantId, bookings);
    }
  }

  public deleteBooking(tenantId: string | undefined, bookingId: string): void {
    const bookings = this.getBookings(tenantId).filter(b => b.id !== bookingId);
    this.saveBookings(tenantId, bookings);
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

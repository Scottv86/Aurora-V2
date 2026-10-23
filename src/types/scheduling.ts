export type BookingArchetype = 'APPOINTMENT' | 'RENTAL' | 'CAPACITY' | 'FIELD_SERVICE';

export type ResourceType = 'STAFF' | 'PROPERTY' | 'EQUIPMENT' | 'SPACE';

export type BookingStatus = 'HELD' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface WorkingHourInterval {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // '09:00'
  endTime: string;   // '17:00'
}

export interface BookingResource {
  id: string;
  name: string;
  type: ResourceType;
  entityId?: string;       // ID of workforce member or module record
  entityType?: string;     // 'workforce' | 'record' | 'contact'
  location?: string;
  capacity?: number;
  avatarUrl?: string;
  skills?: string[];       // e.g. for field service technician dispatch
  isActive: boolean;
  color?: string;
}

export interface BlackoutDate {
  id: string;
  resourceId?: string; // empty means tenant-wide
  startDate: string;
  endDate: string;
  reason: string;
}

export interface BookingConfig {
  id: string;
  title: string;
  slug: string;
  description: string;
  archetype: BookingArchetype;
  resourceIds: string[];
  
  // Time-slot appointment settings
  slotDurationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;

  // Rental & stay settings
  checkInTime?: string;     // '14:00'
  checkOutTime?: string;    // '10:00'
  minNights?: number;
  maxNights?: number;
  turnoverBufferDays?: number;

  // Capacity / Group settings
  maxCapacity?: number;

  // Field service settings
  requiresAddress?: boolean;
  travelBufferMinutes?: number;

  // General constraints
  minNoticeHours: number;   // minimum lead time
  maxAdvanceDays: number;   // how far out bookings can be made

  // Commerce & Queue integrations
  requiresPayment: boolean;
  basePrice?: number;
  currency?: string;
  pricingItemId?: string;   // Link to Pricing Catalog
  workQueueId?: string;     // Auto-dispatch into Work Distribution queue

  status: 'active' | 'draft' | 'archived';
  createdAt: string;
}

export interface Booking {
  id: string;
  configId: string;
  configTitle: string;
  resourceId: string;
  resourceName: string;
  archetype: BookingArchetype;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startDateTime: string;
  endDateTime: string;
  status: BookingStatus;
  totalPrice?: number;
  currency?: string;
  holdExpiresAt?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

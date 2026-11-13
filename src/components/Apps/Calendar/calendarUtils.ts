import {
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  isSameDay,
  addMinutes,
  differenceInMinutes,
  format,
  parseISO,
  isValid
} from 'date-fns';
import { Booking, BookingArchetype, BlackoutDate } from '../../../types/scheduling';
import { UniversalReminder } from '../../../types/reminders';

export type CalendarViewMode =
  | 'day'
  | 'week'
  | 'workweek'
  | 'month'
  | 'year'
  | 'dispatch'
  | 'schedule';

export interface CalendarEvent extends Booking {
  resourceColor?: string;
}

export interface CalendarTaskItem {
  id: string;
  title: string;
  description?: string;
  dueAt: string; // ISO string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';
  activityType?: 'call' | 'email' | 'meeting' | 'todo' | 'reminder';
  assignedToName?: string;
  recordTitle?: string;
  isLocalOnly?: boolean;
}

export const ARCHETYPE_STYLES: Record<
  BookingArchetype,
  { bg: string; border: string; text: string; badge: string; dot: string; label: string }
> = {
  APPOINTMENT: {
    bg: 'bg-indigo-50/95 dark:bg-indigo-950/70 hover:bg-indigo-100/95 dark:hover:bg-indigo-900/70',
    border: 'border-indigo-300 dark:border-indigo-700/80 border-l-4 border-l-indigo-600',
    text: 'text-indigo-950 dark:text-indigo-100',
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    label: 'Appointment'
  },
  RENTAL: {
    bg: 'bg-amber-50/95 dark:bg-amber-950/70 hover:bg-amber-100/95 dark:hover:bg-amber-900/70',
    border: 'border-amber-300 dark:border-amber-700/80 border-l-4 border-l-amber-500',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Stay / Rental'
  },
  FIELD_SERVICE: {
    bg: 'bg-rose-50/95 dark:bg-rose-950/70 hover:bg-rose-100/95 dark:hover:bg-rose-900/70',
    border: 'border-rose-300 dark:border-rose-700/80 border-l-4 border-l-rose-500',
    text: 'text-rose-950 dark:text-rose-100',
    badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Field Dispatch'
  },
  CAPACITY: {
    bg: 'bg-purple-50/95 dark:bg-purple-950/70 hover:bg-purple-100/95 dark:hover:bg-purple-900/70',
    border: 'border-purple-300 dark:border-purple-700/80 border-l-4 border-l-purple-500',
    text: 'text-purple-950 dark:text-purple-100',
    badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
    label: 'Group Capacity'
  }
};

export function safeParseDate(value: string | Date): Date {
  if (value instanceof Date) return isValid(value) ? value : new Date();
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : new Date();
}

export function doesEventOverlapDay(event: Booking, targetDay: Date): boolean {
  const start = safeParseDate(event.startDateTime);
  const end = safeParseDate(event.endDateTime);
  const dayStart = startOfDay(targetDay);
  const dayEnd = endOfDay(targetDay);
  return !isAfter(start, dayEnd) && !isBefore(end, dayStart);
}

export function isMultiDayEvent(event: Booking): boolean {
  const start = safeParseDate(event.startDateTime);
  const end = safeParseDate(event.endDateTime);
  return !isSameDay(start, end) || event.archetype === 'RENTAL';
}

export function doesBlackoutOverlapDay(blackout: BlackoutDate, targetDay: Date): boolean {
  const start = startOfDay(safeParseDate(blackout.startDate));
  const end = endOfDay(safeParseDate(blackout.endDate));
  const d = startOfDay(targetDay);
  return !isBefore(d, start) && !isAfter(d, end);
}

export interface PositionedEvent {
  event: CalendarEvent;
  topPercent: number;
  heightPercent: number;
  colIndex: number;
  totalCols: number;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Computes Google Calendar / Outlook style vertical positioning and side-by-side column splitting
 * for overlapping events within a single day column (0..1440 minutes).
 */
export function layoutDayEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const items = events
    .filter(ev => doesEventOverlapDay(ev, day))
    .map(ev => {
      const rawStart = safeParseDate(ev.startDateTime);
      const rawEnd = safeParseDate(ev.endDateTime);
      const clampedStart = isBefore(rawStart, dayStart) ? dayStart : rawStart;
      const clampedEnd = isAfter(rawEnd, dayEnd) ? dayEnd : rawEnd;

      const startMinutes = Math.max(0, differenceInMinutes(clampedStart, dayStart));
      const rawEndMin = differenceInMinutes(clampedEnd, dayStart);
      const endMinutes = Math.min(1440, Math.max(startMinutes + 30, rawEndMin));

      return {
        event: ev,
        startMinutes,
        endMinutes,
        topPercent: (startMinutes / 1440) * 100,
        heightPercent: Math.max(((endMinutes - startMinutes) / 1440) * 100, (28 / 1440) * 100),
        colIndex: 0,
        totalCols: 1
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes));

  // Group into connected overlapping clusters
  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterMaxEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMinutes < clusterMaxEnd) {
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.endMinutes;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const columnsEnd: number[] = [];
    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < columnsEnd.length; c++) {
        if (columnsEnd[c] <= item.startMinutes) {
          placedCol = c;
          columnsEnd[c] = item.endMinutes;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columnsEnd.length;
        columnsEnd.push(item.endMinutes);
      }
      item.colIndex = placedCol;
    }
    const totalCols = Math.max(1, columnsEnd.length);
    for (const item of cluster) {
      item.totalCols = totalCols;
    }
  }

  return items;
}

/**
 * Local storage fallback & seed for Calendar Tasks / Reminders so the layer always works
 * even when offline or before backend reminders are created.
 */
const TASKS_STORAGE_PREFIX = 'aurora_calendar_tasks_';

export function getLocalCalendarTasks(tenantId?: string): CalendarTaskItem[] {
  const key = `${TASKS_STORAGE_PREFIX}${tenantId || 'default'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[CalendarTasks] Failed to read local tasks:', e);
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const seeded: CalendarTaskItem[] = [
    {
      id: 'task-seed-1',
      title: 'Follow up with Marcus Vance on Villa check-in preferences',
      description: 'Confirm gate code delivery and welcome hamper.',
      dueAt: new Date(y, m, d, 11, 30, 0).toISOString(),
      priority: 'HIGH',
      status: 'PENDING',
      activityType: 'call',
      assignedToName: 'Sarah Jenkins',
      recordTitle: 'Oceanfront Villa 101',
      isLocalOnly: true
    },
    {
      id: 'task-seed-2',
      title: 'Inspect HVAC van inventory & spare relays',
      description: 'Pre-dispatch checklist for Metro North territory.',
      dueAt: new Date(y, m, d + 1, 9, 0, 0).toISOString(),
      priority: 'MEDIUM',
      status: 'PENDING',
      activityType: 'todo',
      assignedToName: 'Mike Kowalski',
      recordTitle: 'Fleet Van 4',
      isLocalOnly: true
    },
    {
      id: 'task-seed-3',
      title: 'Send Q4 Executive Consultation slide deck',
      description: 'Share PDF ahead of consultation.',
      dueAt: new Date(y, m, d - 1, 16, 0, 0).toISOString(),
      priority: 'LOW',
      status: 'COMPLETED',
      activityType: 'email',
      assignedToName: 'Alex Rivera',
      recordTitle: 'TechCorp',
      isLocalOnly: true
    }
  ];

  saveLocalCalendarTasks(tenantId, seeded);
  return seeded;
}

export function saveLocalCalendarTasks(tenantId: string | undefined, tasks: CalendarTaskItem[]): void {
  const key = `${TASKS_STORAGE_PREFIX}${tenantId || 'default'}`;
  try {
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch (e) {
    console.error('[CalendarTasks] Failed to save local tasks:', e);
  }
}

export function mapReminderToTaskItem(rem: UniversalReminder): CalendarTaskItem {
  return {
    id: rem.id,
    title: rem.title,
    description: rem.description,
    dueAt: rem.dueAt,
    priority: rem.priority || 'MEDIUM',
    status: rem.status || 'PENDING',
    activityType: 'reminder',
    assignedToName: rem.assignedToName,
    recordTitle: rem.module?.name,
    isLocalOnly: false
  };
}

export function shiftEventToTargetDate(
  event: Booking,
  targetDate: Date,
  targetHour?: number,
  targetMinute: number = 0
): { startDateTime: string; endDateTime: string } {
  const oldStart = safeParseDate(event.startDateTime);
  const oldEnd = safeParseDate(event.endDateTime);
  const durationMins = Math.max(15, differenceInMinutes(oldEnd, oldStart));

  const newStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    targetHour !== undefined ? targetHour : oldStart.getHours(),
    targetHour !== undefined ? targetMinute : oldStart.getMinutes(),
    0,
    0
  );
  const newEnd = addMinutes(newStart, durationMins);

  return {
    startDateTime: newStart.toISOString(),
    endDateTime: newEnd.toISOString()
  };
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const s = safeParseDate(startIso);
  const e = safeParseDate(endIso);
  return `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
}

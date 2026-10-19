export interface OperatingCalendar {
  id?: string;
  name: string;
  timezone: string; // e.g. "Australia/Sydney" or "America/New_York" or "UTC"
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat. Default [1, 2, 3, 4, 5]
  workDayStart: string; // "09:00"
  workDayEnd: string; // "17:00"
  holidays: string[]; // ["2026-12-25", "2026-01-01"]
  pauseStatuses: string[]; // ["Pending Customer", "On Hold", "Awaiting Vendor", "Under Review"]
}

export const DEFAULT_OPERATING_CALENDAR: OperatingCalendar = {
  name: 'Standard Business Hours',
  timezone: 'UTC',
  workingDays: [1, 2, 3, 4, 5], // Mon - Fri
  workDayStart: '09:00',
  workDayEnd: '17:00',
  holidays: [],
  pauseStatuses: ['Pending Customer', 'pending_customer', 'On Hold', 'on_hold', 'Awaiting Vendor', 'awaiting_vendor']
};

export class SlaService {
  /**
   * Computes an accurate business-hours SLA deadline.
   * If a ticket arrives Friday 4:00 PM with an 8-hour SLA and 9-5 hours,
   * 1 hour elapses Friday, and remaining 7 hours expire Monday 4:00 PM.
   */
  public static calculateBusinessDeadline(
    startDate: Date,
    businessHoursNeeded: number,
    calendar: OperatingCalendar = DEFAULT_OPERATING_CALENDAR
  ): Date {
    if (businessHoursNeeded <= 0) return new Date(startDate);

    const [startHour, startMinute] = calendar.workDayStart.split(':').map(Number);
    const [endHour, endMinute] = calendar.workDayEnd.split(':').map(Number);
    const workDayMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    if (workDayMinutes <= 0) {
      // Fallback to simple wall clock if calendar is invalid
      return new Date(startDate.getTime() + businessHoursNeeded * 60 * 60 * 1000);
    }

    let remainingMinutes = Math.round(businessHoursNeeded * 60);
    let current = new Date(startDate);

    // Fast forward current to start of work window if before hours or on non-working day
    while (remainingMinutes > 0) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().slice(0, 10);
      const isWorkingDay = calendar.workingDays.includes(dayOfWeek) && !calendar.holidays.includes(dateStr);

      if (!isWorkingDay) {
        // Advance to next day at workDayStart
        current.setDate(current.getDate() + 1);
        current.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      const currentMinutesInDay = current.getHours() * 60 + current.getMinutes();
      const workStartMinutes = startHour * 60 + startMinute;
      const workEndMinutes = endHour * 60 + endMinute;

      if (currentMinutesInDay < workStartMinutes) {
        current.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      if (currentMinutesInDay >= workEndMinutes) {
        // Advance to next day at workDayStart
        current.setDate(current.getDate() + 1);
        current.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      // Inside working window: calculate minutes left in today's work window
      const minutesLeftInDay = workEndMinutes - currentMinutesInDay;
      if (remainingMinutes <= minutesLeftInDay) {
        current.setMinutes(current.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesLeftInDay;
        current.setDate(current.getDate() + 1);
        current.setHours(startHour, startMinute, 0, 0);
      }
    }

    return current;
  }

  /**
   * Checks whether the given record status indicates that the SLA clock is paused.
   */
  public static isSlaPaused(status: string, calendar: OperatingCalendar = DEFAULT_OPERATING_CALENDAR): boolean {
    if (!status) return false;
    const clean = status.trim().toLowerCase();
    const pausedList = calendar.pauseStatuses.map(s => s.trim().toLowerCase());
    return pausedList.includes(clean);
  }

  /**
   * Evaluates the tiered SLA status of a record.
   * Tiers:
   *  - MET: Normal (< 75% elapsed)
   *  - WARNING: Amber (> 75% elapsed)
   *  - BREACHED: Overdue (> 100% elapsed)
   *  - ESCALATED: Severe breach (> 120% elapsed)
   */
  public static evaluateSla(
    createdAt: Date,
    deadline: Date,
    status: string,
    now: Date = new Date(),
    calendar: OperatingCalendar = DEFAULT_OPERATING_CALENDAR
  ): {
    slaStatus: 'PAUSED' | 'MET' | 'WARNING' | 'BREACHED' | 'ESCALATED';
    percentElapsed: number;
    isPaused: boolean;
    remainingMinutes: number;
  } {
    if (this.isSlaPaused(status, calendar)) {
      return {
        slaStatus: 'PAUSED',
        percentElapsed: 0,
        isPaused: true,
        remainingMinutes: Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 60000))
      };
    }

    const totalDuration = deadline.getTime() - createdAt.getTime();
    if (totalDuration <= 0) {
      return {
        slaStatus: now > deadline ? 'BREACHED' : 'MET',
        percentElapsed: 100,
        isPaused: false,
        remainingMinutes: 0
      };
    }

    const elapsed = now.getTime() - createdAt.getTime();
    const percentElapsed = Math.round((elapsed / totalDuration) * 100);
    const remainingMinutes = Math.round((deadline.getTime() - now.getTime()) / 60000);

    let slaStatus: 'PAUSED' | 'MET' | 'WARNING' | 'BREACHED' | 'ESCALATED' = 'MET';
    if (percentElapsed >= 120) {
      slaStatus = 'ESCALATED';
    } else if (percentElapsed >= 100) {
      slaStatus = 'BREACHED';
    } else if (percentElapsed >= 75) {
      slaStatus = 'WARNING';
    }

    return {
      slaStatus,
      percentElapsed,
      isPaused: false,
      remainingMinutes
    };
  }
}

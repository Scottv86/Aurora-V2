import { Sun, Calendar, StickyNote, Timer, Clock } from 'lucide-react';
import { WidgetDefinition } from './types';
import { WeatherWidget } from './WeatherWidget';
import { MeetingRadarWidget } from './MeetingRadarWidget';
import { ScratchpadWidget } from './ScratchpadWidget';
import { FocusTimerWidget } from './FocusTimerWidget';
import { TimeTrackerWidget } from './TimeTrackerWidget';

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  weather: {
    id: 'weather',
    name: 'Weather & Forecast',
    shortName: 'Weather',
    description: 'Current temperature, sky conditions, humidity, and location radar.',
    category: 'ambient',
    icon: Sun,
    defaultEnabled: true,
    defaultOrder: 0,
    component: WeatherWidget
  },
  'calendar-next': {
    id: 'calendar-next',
    name: 'Meeting Radar',
    shortName: 'Next Up',
    description: 'Countdown to your next scheduled event, meeting link, and daily agenda.',
    category: 'productivity',
    icon: Calendar,
    defaultEnabled: false,
    defaultOrder: 1,
    component: MeetingRadarWidget
  },
  scratchpad: {
    id: 'scratchpad',
    name: 'Quick Scratchpad',
    shortName: 'Scratchpad',
    description: 'Instant floating markdown note pad with autosave for rapid capture.',
    category: 'productivity',
    icon: StickyNote,
    defaultEnabled: false,
    defaultOrder: 2,
    component: ScratchpadWidget
  },
  'focus-timer': {
    id: 'focus-timer',
    name: 'Focus Pulse',
    shortName: 'Focus',
    description: 'Minimalist Pomodoro work sprint timer to maintain deep flow.',
    category: 'productivity',
    icon: Timer,
    defaultEnabled: false,
    defaultOrder: 3,
    component: FocusTimerWidget
  },
  'time-tracker': {
    id: 'time-tracker',
    name: 'Time Tracker & Timesheet',
    shortName: 'Timesheet',
    description: 'Live clock in/out timer and direct hours logger into weekly timesheets.',
    category: 'operations',
    icon: Clock,
    defaultEnabled: false,
    defaultOrder: 4,
    component: TimeTrackerWidget
  }
};

export const ALL_WIDGET_IDS = Object.keys(WIDGET_REGISTRY);

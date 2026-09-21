export interface AppItem {
  id: string;
  label: string;
  iconName: string;
  description: string;
  color: string;
  to: string;
  category?: 'Productivity' | 'Data & Search' | 'Communication' | 'Creation & Tools';
  isCore?: boolean;
  status?: 'active' | 'beta' | 'coming_soon';
}

export const AURORA_APPS: AppItem[] = [
  // Core Platform & Active Workspace Suite
  {
    id: 'inbox',
    label: 'Inbox',
    iconName: 'Inbox',
    description: 'Unified communication and notifications hub',
    color: 'text-blue-500',
    to: '/workspace/apps/inbox',
    category: 'Productivity',
    isCore: true,
    status: 'active'
  },
  {
    id: 'docs',
    label: 'Documents',
    iconName: 'FileText',
    description: 'Collaborative rich-text documents and merge templates',
    color: 'text-indigo-500',
    to: '/workspace/apps/docs',
    category: 'Productivity',
    isCore: true,
    status: 'active'
  },
  {
    id: 'drive',
    label: 'Drive',
    iconName: 'Folder',
    description: 'Personal and tenant shared cloud file storage',
    color: 'text-amber-500',
    to: '/workspace/apps/drive',
    category: 'Productivity',
    isCore: true,
    status: 'active'
  },
  {
    id: 'searches',
    label: 'Searches',
    iconName: 'Search',
    description: 'Cross-module self-service searches with dynamic filtering and bulk exports',
    color: 'text-indigo-500',
    to: '/workspace/searches',
    category: 'Data & Search',
    isCore: true,
    status: 'active'
  },
  {
    id: 'query',
    label: 'Query Explorer',
    iconName: 'Terminal',
    description: 'Database schema viewer, live SQL runner and dataset inspector',
    color: 'text-indigo-500',
    to: '/workspace/apps/query',
    category: 'Data & Search',
    isCore: true,
    status: 'active'
  },
  {
    id: 'query-builder',
    label: 'Query Builder',
    iconName: 'Database',
    description: 'Visual query authoring studio for reusable multi-table datasets',
    color: 'text-purple-500',
    to: '/workspace/settings/platform-modules/queries-library',
    category: 'Data & Search',
    isCore: true,
    status: 'active'
  },
  {
    id: 'kpi-manager',
    label: 'Metrics & KPIs',
    iconName: 'Target',
    description: 'Semantic metrics, formulas, goal tracking and threshold alarms',
    color: 'text-rose-500',
    to: '/workspace/settings/platform-modules/kpi-management',
    category: 'Data & Search',
    isCore: true,
    status: 'active'
  },
  {
    id: 'chat',
    label: 'Chat',
    iconName: 'MessageSquare',
    description: 'Real-time team messaging channels and direct conversations',
    color: 'text-emerald-500',
    to: '/workspace/apps/chat',
    category: 'Communication',
    isCore: true,
    status: 'active'
  },

  // Productivity & Content
  {
    id: 'notes',
    label: 'Notes',
    iconName: 'StickyNote',
    description: 'Quick personal thoughts, ideas and markdown scratchpads',
    color: 'text-yellow-500',
    to: '/workspace/apps/notes',
    category: 'Productivity',
    status: 'coming_soon'
  },
  {
    id: 'reminders',
    label: 'Reminders',
    iconName: 'Bell',
    description: 'Scheduled reminders, tasks and time-sensitive alerts',
    color: 'text-purple-500',
    to: '/workspace/apps/reminders',
    category: 'Productivity',
    status: 'coming_soon'
  },
  {
    id: 'spreadsheet',
    label: 'Spreadsheet',
    iconName: 'Table',
    description: 'Interactive workbook sheets, formulas and financial models',
    color: 'text-emerald-500',
    to: '/workspace/apps/spreadsheet',
    category: 'Productivity',
    status: 'coming_soon'
  },
  {
    id: 'pdf-editor',
    label: 'PDF Editor',
    iconName: 'FileEdit',
    description: 'View, edit, highlight, and annotate PDF documents',
    color: 'text-red-500',
    to: '/workspace/apps/pdf-editor',
    category: 'Productivity',
    status: 'coming_soon'
  },
  {
    id: 'redact',
    label: 'Redact',
    iconName: 'EyeOff',
    description: 'Sanitize and obscure sensitive document information',
    color: 'text-zinc-600',
    to: '/workspace/apps/redact',
    category: 'Productivity',
    status: 'coming_soon'
  },

  // Data & Analytics
  {
    id: 'reports',
    label: 'Reports',
    iconName: 'BarChart3',
    description: 'Cross-platform operational reports and data visualisations',
    color: 'text-cyan-500',
    to: '/workspace/apps/reports',
    category: 'Data & Search',
    status: 'coming_soon'
  },

  // Communication & Scheduling
  {
    id: 'chat',
    label: 'Chat',
    iconName: 'MessageSquare',
    description: 'Real-time team messaging channels and direct conversations',
    color: 'text-emerald-500',
    to: '/workspace/apps/chat',
    category: 'Communication',
    isCore: true,
    status: 'active'
  },
  {
    id: 'meet',
    label: 'Meet',
    iconName: 'Video',
    description: 'HD video conferencing and team screen sharing',
    color: 'text-rose-500',
    to: '/workspace/apps/meet',
    category: 'Communication',
    status: 'coming_soon'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    iconName: 'Calendar',
    description: 'Workspace scheduling, team availability and event booking',
    color: 'text-blue-600',
    to: '/workspace/apps/calendar',
    category: 'Communication',
    status: 'coming_soon'
  },
  {
    id: 'feed',
    label: 'Feed',
    iconName: 'Rss',
    description: 'Activity stream and tenant-wide broadcast announcements',
    color: 'text-red-500',
    to: '/workspace/apps/feed',
    category: 'Communication',
    status: 'active'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    iconName: 'Send',
    description: 'Outbound audience email campaigns and automated delivery',
    color: 'text-blue-500',
    to: '/workspace/apps/campaigns',
    category: 'Communication',
    status: 'coming_soon'
  },

  // Creation & Utilities
  {
    id: 'draw',
    label: 'Draw',
    iconName: 'Palette',
    description: 'Freehand sketching and graphic illustration canvas',
    color: 'text-pink-500',
    to: '/workspace/apps/draw',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    iconName: 'Presentation',
    description: 'Collaborative real-time diagramming and brainstorming space',
    color: 'text-teal-500',
    to: '/workspace/apps/whiteboard',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'flowchart',
    label: 'Flowchart',
    iconName: 'Workflow',
    description: 'Visual process map, decision tree and flowchart designer',
    color: 'text-cyan-600',
    to: '/workspace/apps/flowchart',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'slideshow',
    label: 'Slideshow',
    iconName: 'MonitorPlay',
    description: 'Interactive slide decks and boardroom presentation builder',
    color: 'text-amber-500',
    to: '/workspace/apps/slideshow',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'graphics',
    label: 'Graphics',
    iconName: 'Image',
    description: 'Marketing asset studio and digital banner creator',
    color: 'text-fuchsia-500',
    to: '/workspace/apps/graphics',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'converter',
    label: 'File Converter',
    iconName: 'FileType',
    description: 'Fast conversion between media, document and data formats',
    color: 'text-orange-500',
    to: '/workspace/apps/converter',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'calculator',
    label: 'Calculator',
    iconName: 'Calculator',
    description: 'Scientific, statistical and financial computation tool',
    color: 'text-slate-500',
    to: '/workspace/apps/calculator',
    category: 'Creation & Tools',
    status: 'coming_soon'
  },
  {
    id: 'snipper',
    label: 'Snipping Tool',
    iconName: 'Scissors',
    description: 'Quick screen capture and instant markup utility',
    color: 'text-violet-500',
    to: '/workspace/apps/snipper',
    category: 'Creation & Tools',
    status: 'coming_soon'
  }
];

export const INITIAL_APP_IDS = [
  'inbox', 'docs', 'drive', 'chat', 'meet', 'calendar', 'notes', 'reminders',
  'reports', 'converter', 'feed', 'draw', 'whiteboard', 'calculator', 'snipper', 'flowchart'
];

/**
 * Returns apps enabled for a specific tenant, factoring in tenant-level overrides.
 * Core suite apps and newly introduced platform apps are always visible.
 */
export const getEnabledApps = (tenantEnabledApps?: string[]): AppItem[] => {
  if (!tenantEnabledApps || !Array.isArray(tenantEnabledApps) || tenantEnabledApps.length === 0) {
    return AURORA_APPS;
  }
  return AURORA_APPS.filter(app => 
    app.isCore || 
    tenantEnabledApps.includes(app.id) || 
    !INITIAL_APP_IDS.includes(app.id)
  );
};

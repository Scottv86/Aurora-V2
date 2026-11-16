export type WorkspaceAppDisplayMode = 'bottom_dock' | 'side_dock' | 'in_app' | 'fullscreen';

export interface WorkspaceAppModeCopy {
  title?: string;
  badge?: string;
  description?: string;
}

export interface WorkspaceAppViewConfig {
  id: string;
  label: string;
  subtitle: string;
  iconName: string;
  accentColor: string;
  route: string;
  defaultMode: WorkspaceAppDisplayMode;
  supportedModes: WorkspaceAppDisplayMode[];
  modeCopy?: Partial<Record<WorkspaceAppDisplayMode, WorkspaceAppModeCopy>>;
}

export const WORKSPACE_APP_VIEWS: Record<string, WorkspaceAppViewConfig> = {
  'service-desk': {
    id: 'service-desk',
    label: 'Service Desk',
    subtitle: 'Manage live Site Chats, AI Agent handoffs, and Voice Calls',
    iconName: 'Headset',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/apps/service-desk',
    defaultMode: 'bottom_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Chat Heads',
        badge: 'Bottom Mount',
        description:
          'Docks collapsible customer chat heads and a compact softphone bar along the bottom edge while you work across the workspace.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins a vertical Service Desk panel to the right edge of your screen so you can reply to chats alongside open records.'
      },
      in_app: {
        title: 'In Workspace App',
        badge: 'In App',
        description:
          'Opens the full Service Desk workspace inside Aurora with queues, AI & human assignment, internal notes, and record context.'
      },
      fullscreen: {
        title: 'Full Screen View',
        badge: 'Full Screen',
        description:
          'Launches Service Desk in distraction-free full screen synced live with your main workspace.'
      }
    }
  },
  chat: {
    id: 'chat',
    label: 'Aurora Chat',
    subtitle: 'Team channels, direct messages, threads, and live huddles',
    iconName: 'MessageSquare',
    accentColor: 'bg-emerald-600 text-white',
    route: '/workspace/apps/chat',
    defaultMode: 'bottom_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Chat Heads',
        badge: 'Bottom Mount',
        description:
          'Docks collapsible channel & DM chat heads along the bottom edge so you can message teammates from any screen.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins Aurora Chat to the right side of your workspace so you can collaborate alongside records, pages, and tasks.'
      },
      in_app: {
        title: 'In Workspace App',
        badge: 'In App',
        description:
          'Opens the full Aurora Chat workspace inside the platform shell with sidebar navigation, threads, and channel details.'
      },
      fullscreen: {
        title: 'Full Screen View',
        badge: 'Full Screen',
        description:
          'Launches Aurora Chat in dedicated distraction-free full screen without workspace chrome.'
      }
    }
  },
  'ai-assistant': {
    id: 'ai-assistant',
    label: 'AI Assistant',
    subtitle: 'Conversational copilot, generative workflows, and smart actions',
    iconName: 'Sparkles',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/aurora-vibe',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Copilot Pod',
        badge: 'Bottom Mount',
        description:
          'Keeps a compact collapsible AI Assistant pod pinned at the bottom-right while you browse records and pages.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins the AI Assistant beside your active workspace view so you can ask questions and draft content side-by-side.'
      },
      in_app: {
        title: 'In Workspace App',
        badge: 'In App',
        description:
          'Opens Aurora Vibe AI inside the platform header with conversation history, scheduled tasks, and tools.'
      },
      fullscreen: {
        title: 'Full Screen View',
        badge: 'Full Screen',
        description:
          'Launches Aurora Vibe AI in full screen focus mode for deep research and multi-step generation.'
      }
    }
  },
  notes: {
    id: 'notes',
    label: 'Notes',
    subtitle: 'Quick thoughts, markdown scratchpads, and record-linked notes',
    iconName: 'StickyNote',
    accentColor: 'bg-amber-500 text-white',
    route: '/workspace/apps/notes',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Scratchpad',
        badge: 'Bottom Mount',
        description:
          'Docks a quick-capture scratchpad and note switcher along the bottom edge without leaving your current page.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins your notes beside open records and pages for effortless meeting notes and reference.'
      }
    }
  },
  reminders: {
    id: 'reminders',
    label: 'Reminders',
    subtitle: 'Scheduled tasks, follow-ups, snoozes, and operational alerts',
    iconName: 'Bell',
    accentColor: 'bg-purple-600 text-white',
    route: '/workspace/apps/reminders',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Task Pod',
        badge: 'Bottom Mount',
        description:
          'Docks a collapsible reminders checklist along the bottom edge so you can add, snooze, and complete tasks anywhere.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins your Today & Scheduled reminders next to your workspace so follow-ups stay front and center.'
      }
    }
  },
  inbox: {
    id: 'inbox',
    label: 'Inbox',
    subtitle: 'Unified email threads, AI reply drafts, and record conversion',
    iconName: 'Inbox',
    accentColor: 'bg-blue-600 text-white',
    route: '/workspace/apps/inbox',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    subtitle: 'Workspace scheduling, bookings, availability, and agenda',
    iconName: 'Calendar',
    accentColor: 'bg-blue-600 text-white',
    route: '/workspace/apps/calendar',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  calculator: {
    id: 'calculator',
    label: 'Calculator',
    subtitle: 'Scientific, financial presets, calculation tape, and record math',
    iconName: 'Calculator',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/apps/calculator',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen'],
    modeCopy: {
      bottom_dock: {
        title: 'Bottom Mini Calc',
        badge: 'Bottom Mount',
        description:
          'Docks a compact collapsible calculator along the bottom edge for instant math without disturbing your layout.'
      },
      side_dock: {
        title: 'Dock to Side Pane',
        badge: 'Side Mount',
        description:
          'Pins the calculator to the right side and resizes your page view for crunching numbers alongside records.'
      },
      in_app: {
        title: 'In Workspace App',
        badge: 'In App',
        description:
          'Opens the full calculator suite inside Aurora with multi-sheet tape, financial presets, and record aggregation.'
      },
      fullscreen: {
        title: 'Full Screen View',
        badge: 'Full Screen',
        description:
          'Launches the calculator suite in distraction-free full screen.'
      }
    }
  },
  feed: {
    id: 'feed',
    label: 'Feed',
    subtitle: 'Live tenant-wide activity stream and audit timeline',
    iconName: 'Rss',
    accentColor: 'bg-rose-600 text-white',
    route: '/workspace/apps/feed',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  docs: {
    id: 'docs',
    label: 'Documents',
    subtitle: 'Rich-text documents, templates, and mail-merge authoring',
    iconName: 'FileText',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/apps/docs',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  drive: {
    id: 'drive',
    label: 'Drive',
    subtitle: 'Personal and shared tenant cloud file storage',
    iconName: 'Folder',
    accentColor: 'bg-amber-500 text-white',
    route: '/workspace/apps/drive',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  pos: {
    id: 'pos',
    label: 'Point of Sale',
    subtitle: 'Retail checkout, barcode scanning, split tenders, and returns',
    iconName: 'Store',
    accentColor: 'bg-emerald-600 text-white',
    route: '/workspace/apps/pos',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  triage: {
    id: 'triage',
    label: 'Triage',
    subtitle: 'Assess incoming work, apply routing rules, and distribute queues',
    iconName: 'ListFilter',
    accentColor: 'bg-amber-500 text-white',
    route: '/workspace/apps/triage',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  directory: {
    id: 'directory',
    label: 'Directory',
    subtitle: 'Master directory of people, organisations, and relationships',
    iconName: 'Users',
    accentColor: 'bg-sky-600 text-white',
    route: '/workspace/apps/directory',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  query: {
    id: 'query',
    label: 'Query Explorer',
    subtitle: 'Database schema viewer, live SQL runner, and dataset inspector',
    iconName: 'Terminal',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/apps/query',
    defaultMode: 'in_app',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  approvals: {
    id: 'approvals',
    label: 'Approvals Hub',
    subtitle: 'Decision queue across invoices, leave, RMAs, and AI proposals',
    iconName: 'ShieldCheck',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/approvals',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  },
  searches: {
    id: 'searches',
    label: 'Searches',
    subtitle: 'Cross-module self-service searches with dynamic filtering',
    iconName: 'Search',
    accentColor: 'bg-indigo-600 text-white',
    route: '/workspace/searches',
    defaultMode: 'side_dock',
    supportedModes: ['bottom_dock', 'side_dock', 'in_app', 'fullscreen']
  }
};

export const getWorkspaceAppById = (appId: string): WorkspaceAppViewConfig | undefined => {
  return WORKSPACE_APP_VIEWS[appId];
};

export const getWorkspaceAppByPath = (pathname: string): WorkspaceAppViewConfig | undefined => {
  // Match longest route prefix first so /workspace/apps/docs/123 matches docs, etc.
  const entries = Object.values(WORKSPACE_APP_VIEWS).sort((a, b) => b.route.length - a.route.length);
  return entries.find((app) => pathname === app.route || pathname.startsWith(`${app.route}/`));
};

export const getAppRememberedMode = (appId: string): WorkspaceAppDisplayMode | null => {
  if (appId === 'service-desk') {
    const remember = localStorage.getItem('aurora_service_desk_remember_mode') === 'true';
    const preferred = localStorage.getItem('aurora_service_desk_preferred_mode');
    if (remember && preferred) {
      if (preferred === 'facebook_dock') return 'bottom_dock';
      if (preferred === 'side_dock') return 'side_dock';
      if (preferred === 'full') return 'in_app';
      if (preferred === 'new_tab') return 'fullscreen';
    }
    return null;
  }

  if (appId === 'calculator') {
    const remember = localStorage.getItem('aurora_calculator_remember_mode') === 'true';
    const preferred = localStorage.getItem('aurora_calculator_preferred_mode');
    if (remember && preferred) {
      if (preferred === 'quick' || preferred === 'bottom_dock') return 'bottom_dock';
      if (preferred === 'docked' || preferred === 'side_dock') return 'side_dock';
      if (preferred === 'full' || preferred === 'in_app') return 'in_app';
      if (preferred === 'fullscreen') return 'fullscreen';
    }
    return null;
  }

  const remember = localStorage.getItem(`aurora_app_remember_mode_${appId}`) === 'true';
  const preferred = localStorage.getItem(`aurora_app_preferred_mode_${appId}`) as WorkspaceAppDisplayMode | null;
  if (remember && preferred) return preferred;
  return null;
};

export const setAppRememberedMode = (
  appId: string,
  mode: WorkspaceAppDisplayMode,
  remember: boolean
) => {
  if (appId === 'service-desk') {
    const legacyMap: Record<WorkspaceAppDisplayMode, string> = {
      bottom_dock: 'facebook_dock',
      side_dock: 'side_dock',
      in_app: 'full',
      fullscreen: 'new_tab'
    };
    if (remember) {
      localStorage.setItem('aurora_service_desk_remember_mode', 'true');
      localStorage.setItem('aurora_service_desk_preferred_mode', legacyMap[mode]);
    } else {
      localStorage.removeItem('aurora_service_desk_remember_mode');
    }
    return;
  }

  if (remember) {
    localStorage.setItem(`aurora_app_remember_mode_${appId}`, 'true');
    localStorage.setItem(`aurora_app_preferred_mode_${appId}`, mode);
  } else {
    localStorage.removeItem(`aurora_app_remember_mode_${appId}`);
  }
};

export const getAppSavedPreferredMode = (appId: string): WorkspaceAppDisplayMode => {
  const app = WORKSPACE_APP_VIEWS[appId];
  if (appId === 'service-desk') {
    const saved = localStorage.getItem('aurora_service_desk_preferred_mode');
    if (saved === 'facebook_dock') return 'bottom_dock';
    if (saved === 'side_dock') return 'side_dock';
    if (saved === 'full') return 'in_app';
    if (saved === 'new_tab') return 'fullscreen';
  }
  if (appId === 'calculator') {
    const saved = localStorage.getItem('aurora_calculator_preferred_mode');
    if (saved === 'quick' || saved === 'bottom_dock') return 'bottom_dock';
    if (saved === 'docked' || saved === 'side_dock') return 'side_dock';
    if (saved === 'full' || saved === 'in_app') return 'in_app';
    if (saved === 'fullscreen') return 'fullscreen';
  }
  const saved = localStorage.getItem(`aurora_app_preferred_mode_${appId}`) as WorkspaceAppDisplayMode | null;
  return saved || app?.defaultMode || 'side_dock';
};

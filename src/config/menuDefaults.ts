import { MenuConfig } from '../types/menu';

export const systemDefaultMenuConfig: MenuConfig = {
  sections: [
    {
      id: 'main',
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', to: '/workspace', isVisible: true },
        { id: 'queue', label: 'Queue', iconName: 'ClipboardList', to: '/workspace/queue', isVisible: true }
      ]
    },
    {
      id: 'modules',
      title: 'Modules',
      items: [] // Dynamically populated from active modules
    },
    {
      id: 'platform',
      title: 'Platform',
      items: [
        { id: 'people-orgs', label: 'People & Organisations', iconName: 'Users', to: '/workspace/platform/people-organisations', isVisible: true }
      ]
    },
    {
      id: 'apps',
      title: 'Apps',
      items: [
        { id: 'inbox', label: 'Inbox', iconName: 'Inbox', isVisible: true },
        { id: 'docs', label: 'Docs', iconName: 'FileText', isVisible: true },
        { id: 'drive', label: 'Drive', iconName: 'Folder', isVisible: true },
        { id: 'chat', label: 'Chat', iconName: 'MessageSquare', isVisible: true },
        { id: 'meet', label: 'Meet', iconName: 'Video', isVisible: true },
        { id: 'calendar', label: 'Calendar', iconName: 'Calendar', isVisible: true },
        { id: 'notes', label: 'Notes', iconName: 'StickyNote', isVisible: true },
        { id: 'reminders', label: 'Reminders', iconName: 'Bell', isVisible: true },
        { id: 'reports', label: 'Reports', iconName: 'BarChart3', isVisible: true }
      ]
    }
  ]
};

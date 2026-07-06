import { MenuConfig } from '../types/menu';

export const systemDefaultMenuConfig: MenuConfig = {
  sections: [
    {
      id: 'main',
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', to: '/workspace', isVisible: true },
        { id: 'queue', label: 'My work', iconName: 'ClipboardList', to: '/workspace/my-work', isVisible: true }
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
        { id: 'people-orgs', label: 'People & Organisations', iconName: 'Users', to: '/workspace/platform/people-organisations', isVisible: true },
        { id: 'triage-inbox', label: 'Work Distribution', iconName: 'Inbox', to: '/workspace/platform/intake', isVisible: true },
        { id: 'knowledge-base', label: 'Knowledge Base', iconName: 'BookOpen', to: '/workspace/platform/knowledge-base', isVisible: true }
      ]
    }
  ]
};

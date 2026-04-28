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
    }
  ]
};

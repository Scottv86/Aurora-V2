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
        { id: 'knowledge-base', label: 'Knowledge Base', iconName: 'BookOpen', to: '/workspace/platform/knowledge-base', isVisible: true },
        { id: 'global-lists', label: 'Global Lists', iconName: 'ListTodo', to: '/workspace/platform/global-lists', isVisible: true },
        { id: 'workforce-management', label: 'Workforce Management', iconName: 'Users', to: '/workspace/platform/workforce', isVisible: true },
        { id: 'integration-management', label: 'Integration Management', iconName: 'Plug', to: '/workspace/platform/integrations', isVisible: true },
        { id: 'sites', label: 'Sites', iconName: 'Globe', to: '/workspace/platform/sites', isVisible: true },
        { id: 'automation-management', label: 'Automation Management', iconName: 'Zap', to: '/workspace/platform/automations', isVisible: true },
        { id: 'document-generation', label: 'Document generation', iconName: 'FileText', to: '/workspace/platform/templates', isVisible: true },
        { id: 'report-management', label: 'Report Management', iconName: 'BarChart2', to: '/workspace/platform/reports', isVisible: true },
        { id: 'api-management', label: 'API Management', iconName: 'Key', to: '/workspace/platform/api', isVisible: true },
        { id: 'financial-management', label: 'Financial Management', iconName: 'Banknote', to: '/workspace/platform/finance', isVisible: true }
      ]
    }
  ]
};

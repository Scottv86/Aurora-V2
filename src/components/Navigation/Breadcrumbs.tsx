import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { DriveService } from '../../services/driveService';
import { cn } from '../../lib/utils';

const PATH_MAP: Record<string, string> = {
  workspace: 'Workspace',
  settings: 'Settings',
  admin: 'Administration',
  tenants: 'Tenants',
  users: 'Users',
  organization: 'Organisation',
  'ai-services': 'AI Services',
  branding: 'Branding',
  navigation: 'Menus',
  'roles-access': 'Roles & Permissions',
  subscriptions: 'Subscriptions',
  revenue: 'Revenue Analytics',
  provisioning: 'Cloud Resources',
  'server-loads': 'Server Usage',
  storage: 'Storage Usage',
  health: 'System Health',
  'ai-monitoring': 'AI Usage & Costs',
  'system-monitoring': 'Performance Metrics',
  logs: 'Audit Logs',
  bugs: 'Support Tickets',
  development: 'Platform Updates',
  fleet: 'Infrastructure',
  compute: 'Server Clusters',
  modules: 'Modules',
  appearance: 'Appearance & Navigation',
  workforce: 'Workforce',
  billing: 'Billing & Plans',
  usage: 'Model Usage',
  subscription: 'Subscription',
  'platform-modules': 'Modules',
  pages: 'Pages',
  apps: 'Apps',
  docs: 'Documents',
  drive: 'Drive',
  query: 'Query',
  messaging: 'Messaging',
  database: 'Database',
  lists: 'Lists',
  templates: 'Templates',
  automations: 'Automations',
  logic: 'Logic',
  security: 'Security',
  sites: 'Sites',
  reports: 'Reports',
  knowledge: 'Knowledge Base',
  testing: 'Testing',
  deploy: 'Deployments',
  api: 'API',
  data: 'Data',
  'fees-products': 'Fees & Products',
  finance: 'Finance',
  intake: 'Work Distribution',
  'work-distribution': 'Work Distribution',
  'people-organisations': 'People & Organisations',
  migration: 'Migration',
  connectors: 'Integrations',
  'workforce-management': 'Workforce Management',
  'integration-management': 'Integrations',
  'automation-management': 'Automations',
  'document-generation': 'Templates',
  'report-management': 'Reports',
  'api-management': 'API Management',
  'financial-management': 'Financial Management',
  'global-lists': 'Global Lists',
  'records-management': 'Records Management',
  'forms-library': 'Forms',
  'workflows-library': 'Workflows',
  'validations-library': 'Validations',
  queues: 'Queues',
  'queues-management': 'Queues',
};



export const Breadcrumbs = () => {
  const location = useLocation();
  const { modules, breadcrumbOverrides, menuConfig } = usePlatform();
  
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Custom label resolver
  const getLabel = (segment: string, index: number) => {
    // 1. Check for context-driven overrides first (e.g. from RecordDetailView)
    if (breadcrumbOverrides[segment]) return breadcrumbOverrides[segment];

    // 2. Check DriveService for files/documents or folders
    const driveItem = DriveService.getItemById(segment);
    if (driveItem) return driveItem.name;

    // 3. Check static PATH_MAP mapping next
    if (PATH_MAP[segment]) return PATH_MAP[segment];

    // 4. Check modules or queues
    if (
      pathnames[index - 1] === 'page' ||
      pathnames[index - 1] === 'pages' ||
      pathnames[index - 1] === 'modules' || 
      pathnames[index - 1] === 'builder' || 
      pathnames[index - 1] === 'sub' ||
      pathnames[index - 1] === 'queues'
    ) {
      // Check if it's a queue view (via query parameter or path segment)
      const searchParams = new URLSearchParams(location.search);
      const queueId = segment.startsWith('queue_') 
        ? segment 
        : (searchParams.get('queueId') || searchParams.get('queue'));

      if (queueId && menuConfig) {
        let foundQueueLabel = '';
        const searchQueue = (items: any[]) => {
          for (const item of items) {
            if (item.id === queueId) {
              foundQueueLabel = item.label;
              return;
            }
            if (item.children) {
              searchQueue(item.children);
            }
          }
        };
        for (const sec of menuConfig.sections || []) {
          searchQueue(sec.items || []);
        }
        if (foundQueueLabel) return foundQueueLabel;
      }

      const mod = modules.find(m => m.id === segment);
      if (mod) return mod.name;
    }
    
    // 5. Handle technical IDs that haven't been overridden yet
    const looksLikeId = segment.length > 15 && /^[a-z0-9-]+$/i.test(segment) && !segment.includes(' ');
    if (looksLikeId) return '...';

    // 6. Default to formatted segment
    return segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const isSettings = pathnames.includes('settings');

  let breadcrumbItems = pathnames.map((segment, index) => {
    let to = `/${pathnames.slice(0, index + 1).join('/')}`;
    // If it's a nested module segment following 'sub', link to the standalone module view instead
    if (index > 0 && pathnames[index - 1] === 'sub') {
      to = `/workspace/modules/${segment}`;
    }
    return {
      segment,
      to,
      label: getLabel(segment, index)
    };
  }).filter((item, idx, arr) => {
    if (isSettings && item.segment === 'workspace') return false;
    if (item.segment === 'platform-modules' && idx < arr.length - 1) return false;
    return !['records', 'sub', 'member', 'teams', 'positions', 'page'].includes(item.segment);
  });

  // For /workspace/settings index route, display "Settings > Overview"
  if (isSettings && breadcrumbItems.length === 1 && breadcrumbItems[0].segment === 'settings') {
    breadcrumbItems.push({
      segment: 'overview',
      to: '/workspace/settings',
      label: 'Overview'
    });
  }


  const searchParams = new URLSearchParams(location.search);
  const isReportBuilder = location.pathname.includes('/report-management') && searchParams.get('mode') === 'builder';
  
  if (isReportBuilder) {
    const reportName = breadcrumbOverrides['active-report'] || 'Edit Report';
    breadcrumbItems.push({
      segment: 'active-report',
      to: `${location.pathname}${location.search}`,
      label: reportName
    });
  }

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        // Check if we should use the indigo "active mode" style
        // This is typically for "Workspace", "Admin", "Settings", or anything that isn't the final leaf
        const isMode = (index < breadcrumbItems.length - 1);
        
        return (
          <div key={`${item.to}-${index}`} className="flex items-center gap-1.5 shrink-0">
            {index > 0 && (
              <ChevronRight size={12} className="text-indigo-600 dark:text-indigo-400" />
            )}
            {isLast ? (
              <span className={cn(
                "text-[11px] font-bold",
                isMode 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-zinc-900 dark:text-white"
              )}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className={cn(
                  "text-[11px] transition-colors hover:text-indigo-600 dark:hover:text-indigo-400",
                  isMode 
                    ? "text-indigo-600/80 dark:text-indigo-400/80 font-bold" 
                    : "text-zinc-400 dark:text-zinc-500 font-medium"
                )}
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

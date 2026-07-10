import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';

const PATH_MAP: Record<string, string> = {
  workspace: 'Workspace',
  settings: 'Settings',
  admin: 'Administration',
  modules: 'Modules',
  appearance: 'Appearance & Navigation',
  workforce: 'Workforce',
  billing: 'Billing & Plans',
  usage: 'Model Usage',
  subscription: 'Subscription',
  'platform-modules': 'Platform Modules',
  apps: 'App Catalog',
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
  'integration-management': 'Integration Management',
  'automation-management': 'Automation Management',
  'document-generation': 'Document generation',
  'report-management': 'Report Management',
  'api-management': 'API Management',
  'financial-management': 'Financial Management',
  'global-lists': 'Global Lists'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const { modules, breadcrumbOverrides } = usePlatform();
  
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Custom label resolver
  const getLabel = (segment: string, index: number) => {
    // 1. Check for context-driven overrides first (e.g. from RecordDetailView)
    if (breadcrumbOverrides[segment]) return breadcrumbOverrides[segment];

    // 2. Check static PATH_MAP mapping next
    if (PATH_MAP[segment]) return PATH_MAP[segment];

    // 3. Check modules if it's a module ID (these are loaded globally)
    if (
      pathnames[index - 1] === 'modules' || 
      pathnames[index - 1] === 'builder' || 
      pathnames[index - 1] === 'sub'
    ) {
      const mod = modules.find(m => m.id === segment);
      if (mod) return mod.name;
    }
    
    // 4. Handle technical IDs that haven't been overridden yet
    // Technical IDs are typically long alphanumeric strings without spaces
    const looksLikeId = segment.length > 15 && /^[a-z0-9-]+$/i.test(segment) && !segment.includes(' ');
    if (looksLikeId) return '...';

    // 5. Default to formatted segment
    return segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const breadcrumbItems = pathnames.map((segment, index) => {
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
  }).filter(item => !['records', 'sub', 'member', 'teams', 'positions'].includes(item.segment));

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        // Check if we should use the indigo "active mode" style
        // This is typically for "Workspace", "Admin", "Settings", or anything that isn't the final leaf
        const isMode = (index < breadcrumbItems.length - 1);
        
        return (
          <div key={item.to} className="flex items-center gap-1.5 shrink-0">
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

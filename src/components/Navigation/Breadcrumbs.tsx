import React from 'react';
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
  'platform-modules': 'Platform Modules',
  apps: 'App Catalog',
  messaging: 'Messaging',
  database: 'Database',
  lists: 'Lists',
  templates: 'Templates',
  automations: 'Automations',
  logic: 'Logic',
  security: 'Security',
  audit: 'Audit Logs',
  sites: 'Sites',
  reports: 'Reports',
  knowledge: 'Knowledge Base',
  testing: 'Testing',
  deploy: 'Deployments',
  api: 'API',
  records: 'Records',
  'fees-products': 'Fees & Products',
  finance: 'Finance',
  intake: 'Intake',
  reset: 'Factory Reset',
  migration: 'Migration Tools',
  'data-sources': 'Data Sources'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const { modules } = usePlatform();
  
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Custom label resolver
  const getLabel = (segment: string, index: number) => {
    // Check modules if it's a module ID
    if (pathnames[index - 1] === 'modules') {
      const mod = modules.find(m => m.id === segment);
      if (mod) return mod.name;
    }
    
    return PATH_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {pathnames.map((segment, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        const isMode = (index === 0 && (segment === 'workspace' || segment === 'admin')) || 
                       (segment === 'settings' && pathnames[index-1] === 'workspace');
        
        const label = getLabel(segment, index);

        return (
          <div key={to} className="flex items-center gap-1.5 shrink-0">
            {index > 0 && (
              <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-800" />
            )}
            {isLast ? (
              <span className={cn(
                "text-[11px] font-bold",
                isMode 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-zinc-900 dark:text-white"
              )}>
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className={cn(
                  "text-[11px] transition-colors hover:text-indigo-600 dark:hover:text-indigo-400",
                  isMode 
                    ? "text-indigo-600/80 dark:text-indigo-400/80 font-bold" 
                    : "text-zinc-400 dark:text-zinc-500 font-medium"
                )}
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

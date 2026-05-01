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
  connectors: 'Connectors'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const { modules, breadcrumbOverrides } = usePlatform();
  
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Custom label resolver
  const getLabel = (segment: string, index: number) => {
    // 1. Check for context-driven overrides first (e.g. from RecordDetailView)
    if (breadcrumbOverrides[segment]) return breadcrumbOverrides[segment];

    // 2. Check modules if it's a module ID (these are loaded globally)
    if (pathnames[index - 1] === 'modules') {
      const mod = modules.find(m => m.id === segment);
      if (mod) return mod.name;
    }
    
    // 3. Handle technical IDs that haven't been overridden yet
    // Technical IDs are typically long alphanumeric strings without spaces
    const looksLikeId = segment.length > 15 && /^[a-z0-9-]+$/i.test(segment) && !segment.includes(' ');
    if (looksLikeId) return '...';

    // 4. Default to PATH_MAP or formatted segment
    return PATH_MAP[segment] || segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const breadcrumbItems = pathnames.map((segment, index) => {
    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
    return {
      segment,
      to,
      label: getLabel(segment, index)
    };
  }).filter(item => item.segment !== 'records');

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

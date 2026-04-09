import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  Layers, 
  Zap, 
  FileText, 
  BarChart3, 
  Workflow, 
  Terminal, 
  Settings,
  ShieldCheck,
  Activity,
  Cpu,
  LogOut,
  CloudUpload
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';
import { SidebarItem } from '../Navigation/SidebarItem';
import { Navbar } from '../Navigation/Navbar';
import { Login } from '../Auth/Login';

export const PlatformShell = ({ children, fullBleed }: { children: ReactNode, fullBleed?: boolean }) => {
  const { user, loading: authLoading, logout } = useAuth();
  const { isLoading: platformLoading } = usePlatform();
  const location = useLocation();
  const [isSidebarOpen] = useState(true);
  
  // Modules are currently stubbed as part of the Firebase -> Supabase migration.
  // Full module fetching from Prisma/API to be implemented in follow-up.
  const [enabledModules] = useState<any[]>([]);

  const isAdminPath = location.pathname.startsWith('/admin');

  if (authLoading || platformLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300 overflow-x-hidden">
      <Navbar />
      <div className="flex">
        <aside className={cn(
          "fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl transition-all duration-300 z-40 overflow-y-auto",
          isSidebarOpen ? "w-64" : "w-20"
        )}>
          <div className="p-4 space-y-6">
            {/* System Governance (Admin Mode Only) */}
            {isAdminPath && (
              <div>
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                  System Governance
                </div>
                <nav className="space-y-1">
                  <SidebarItem icon={ShieldCheck} label="Global Registry" to="/admin" active={isActive('/admin')} />
                  <SidebarItem icon={Activity} label="Platform Health" to="/admin/health" active={isActive('/admin/health')} />
                  <SidebarItem icon={Cpu} label="Compute Matrix" to="/admin/compute" active={isActive('/admin/compute')} />
                  <SidebarItem icon={CloudUpload} label="Fleet Deploy" to="/admin/fleet" active={isActive('/admin/fleet')} />
                </nav>
              </div>
            )}

            {!isAdminPath && (
              <>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3">Main</p>
                  <nav className="space-y-1">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/workspace" active={isActive('/workspace')} />
                  </nav>
                </div>

                {enabledModules.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3">Enabled Modules</p>
                    <nav className="space-y-1">
                      {enabledModules.map(mod => (
                        <SidebarItem 
                          key={mod.id} 
                          icon={mod.icon} 
                          label={mod.name} 
                          to={`/workspace/modules/${mod.id}`} 
                          active={isActive(`/workspace/modules/${mod.id}`)} 
                        />
                      ))}
                    </nav>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3">Operations</p>
                  <nav className="space-y-1">
                    <SidebarItem icon={FileText} label="Cases" to="/workspace/queue" active={isActive('/workspace/queue')} />
                    <SidebarItem icon={Users} label="People" to="/workspace/people" active={isActive('/workspace/people')} />
                    <SidebarItem icon={Globe} label="Portals" to="/portal" active={isActive('/portal')} />
                    <SidebarItem icon={BarChart3} label="Analytics" to="/workspace/analytics" active={isActive('/workspace/analytics')} />
                  </nav>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4 px-3">Platform</p>
                  <nav className="space-y-1">
                    <SidebarItem icon={Layers} label="Modules" badge={enabledModules.length > 0 ? enabledModules.length.toString() : undefined} to="/workspace/catalog" active={isActive('/workspace/catalog')} />
                    <SidebarItem icon={Workflow} label="Workflows" to="/workspace/workflows" active={isActive('/workspace/workflows')} />
                    <SidebarItem icon={FileText} label="Document Studio" to="/workspace/documents" active={isActive('/workspace/documents')} />
                    <SidebarItem icon={Zap} label="Automations" to="/workspace/automations" active={isActive('/workspace/automations')} />
                    <SidebarItem icon={Terminal} label="Logic Assets" to="/workspace/logic" active={isActive('/workspace/logic')} />
                    <SidebarItem icon={CloudUpload} label="Deployments" to="/workspace/deployments" active={isActive('/workspace/deployments')} />
                  </nav>
                </div>
              </>
            )}

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
              <SidebarItem icon={Settings} label="Settings" to={isAdminPath ? "/admin/settings" : "/workspace/settings"} active={isActive('/workspace/settings') || isActive('/admin/settings')} />
              <SidebarItem icon={LogOut} label="Log Out" onClick={logout} />
            </div>
          </div>
        </aside>

        <main className={cn(
          "flex-1 transition-all duration-300",
          isSidebarOpen ? "ml-64" : "ml-20",
          fullBleed && "h-[calc(100vh-4rem)] overflow-y-auto"
        )}>
          <div className={cn(
            "mx-auto",
            fullBleed ? "w-full h-full" : "p-8 max-w-7xl"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

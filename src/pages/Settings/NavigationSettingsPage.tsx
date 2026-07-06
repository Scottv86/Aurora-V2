import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Columns,
  Rows,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { NavigationArchitect } from '../../components/Settings/NavigationArchitect';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';

// Types
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
}

type LayoutStyle = 'sidebar' | 'top';

export const NavigationSettingsPage = () => {
  const { tenant, refetchContext } = usePlatform();
  const { session } = useAuth();
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('sidebar');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: '1', label: 'Dashboard', icon: 'LayoutDashboard', path: '/workspace' },
    { 
      id: '2', 
      label: 'Finance', 
      icon: 'FileText', 
      children: [
        { id: '3', label: 'Invoices', icon: 'FileText', path: '/workspace/finance/invoices' },
        { id: '4', label: 'Expenses', icon: 'FileText', path: '/workspace/finance/expenses' },
      ]
    },
    { id: '5', label: 'People', icon: 'Users', path: '/workspace/people' },
  ]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize from tenant config if available
  useEffect(() => {
    if (tenant && !initialized) {
      if (tenant.menuConfig) {
        if (Array.isArray(tenant.menuConfig)) {
          setMenuItems(tenant.menuConfig as MenuItem[]);
        } else if ((tenant.menuConfig as any).sections) {
          const allItems = (tenant.menuConfig as any).sections.flatMap((s: any) => s.items || []);
          setMenuItems(allItems);
        }
      }
      
      if (tenant.branding && tenant.branding.layout_style) {
        setLayoutStyle(tenant.branding.layout_style as LayoutStyle);
      }
      setInitialized(true);
    }
  }, [tenant, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          branding: { 
            ...tenant?.branding, 
            layout_style: layoutStyle
          },
          workspaceSettings: { ...tenant?.workspaceSettings, navigation_manifest: menuItems }
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      // Use the specific config endpoint as requested
      await fetch(`${API_BASE_URL}/api/tenants/${tenant?.id}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ navigation_manifest: menuItems })
      });

      toast.success('Navigation Settings Updated Successfully');
      refetchContext();
    } catch (error) {
      toast.error('Failed to update navigation settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10">
      <PageHeader 
        title="Navigation" 
        description="Configure the platform's visual shell, layout behavior, and global navigation structure."
        actions={
          <Button onClick={handleSave} loading={saving} className="gap-2">
            <Save size={18} />
            Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 mt-6">
        <div className="space-y-10">
          {/* Layout Picker */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Platform Layout</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LayoutOption 
                selected={layoutStyle === 'sidebar'} 
                onClick={() => setLayoutStyle('sidebar')}
                title="Sidebar Navigation"
                description="Traditional vertical menu with collapsible sub-items."
                icon={<Rows size={24} />}
                preview={<SidebarPreview />}
              />
              <LayoutOption 
                selected={layoutStyle === 'top'} 
                onClick={() => setLayoutStyle('top')}
                title="Top Menu"
                description="Sleek horizontal navigation bar with dropdown menus."
                icon={<Columns size={24} />}
                preview={<TopMenuPreview />}
              />
            </div>
          </section>

          {/* Navigation Architect */}
          <NavigationArchitect 
            items={menuItems} 
            onChange={setMenuItems} 
            layout={layoutStyle}
          />
        </div>
      </div>
    </div>
  );
};

const LayoutOption = ({ selected, onClick, title, description, icon, preview }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "relative p-4 rounded-2xl border-2 text-left transition-all duration-300 w-full",
      selected 
        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/5" 
        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
    )}
  >
    <div className="flex items-start gap-4 mb-4">
      <div className={cn(
        "p-2 rounded-xl",
        selected ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <div className="font-bold text-zinc-900 dark:text-white">{title}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</div>
      </div>
    </div>

    <div className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
      {preview}
    </div>

    {selected && (
      <motion.div 
        layoutId="selected-ring"
        className="absolute -inset-[3px] border-2 border-blue-600 rounded-[19px] pointer-events-none"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);

const SidebarPreview = () => (
  <div className="flex h-full">
    <div className="w-10 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 space-y-1">
      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
    </div>
    <div className="flex-1 p-2">
      <div className="w-1/2 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-2" />
      <div className="w-full h-full rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800" />
    </div>
  </div>
);

const TopMenuPreview = () => (
  <div className="flex flex-col h-full">
    <div className="h-4 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center px-2 gap-2">
      <div className="w-4 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      <div className="w-4 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
    </div>
    <div className="flex-1 p-2">
      <div className="w-full h-full rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800" />
    </div>
  </div>
);

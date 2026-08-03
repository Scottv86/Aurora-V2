import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette,
  Save,
  Image,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { BrandingSettings } from '../../components/Settings/Organization/BrandingSettings';
import { API_BASE_URL } from '../../config';

export const BrandingSettingsPage = () => {
  const { tenant, refetchContext } = usePlatform();
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [initialized, setInitialized] = useState(false);

  // Unified Branding State
  const [branding, setBranding] = useState({
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#4f46e5',
    faviconUrl: '',
    aiEnabled: true,
    forceDarkMode: false,
    useTenantBranding: false,
  });

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'branding', label: 'Branding & Identity', icon: Image, description: 'Logo, colors & icons' },
    { id: 'themes', label: 'Themes & Density', icon: Sliders, description: 'Typography & rounding' },
  ];

  // Initialize from tenant config if available
  useEffect(() => {
    if (tenant && !initialized) {
      if (tenant.branding) {
        setBranding({
          logoUrl: tenant.branding.logoUrl || '',
          primaryColor: tenant.branding.primaryColor || '#2563eb',
          accentColor: tenant.branding.accentColor || '#4f46e5',
          faviconUrl: tenant.branding.faviconUrl || '',
          aiEnabled: tenant.branding.aiEnabled ?? true,
          forceDarkMode: tenant.branding.forceDarkMode ?? false,
          useTenantBranding: tenant.branding.useTenantBranding ?? false,
        });
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
            ...branding
          }
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Branding Updated Successfully');
      refetchContext();
    } catch (error) {
      toast.error('Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSubNavLayout
      title="Branding & Themes"
      description="Configure the platform's visual identity, logo, and color theme."
      icon={Palette}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        <Button onClick={handleSave} loading={saving} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20">
          <Save size={18} />
          Save Changes
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-10">
          <AnimatePresence mode="wait">
            {activeTab === 'branding' && (
              <motion.div
                key="branding-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BrandingSettings 
                  tenant={tenant} 
                  branding={branding}
                  setBranding={setBranding}
                />
              </motion.div>
            )}

            {activeTab === 'themes' && (
              <motion.div
                key="themes-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-10"
              >
                <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
                   <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                     <Palette size={32} />
                   </div>
                   <div className="space-y-1">
                     <h4 className="font-bold text-zinc-900 dark:text-white">Theme Customization</h4>
                     <p className="text-sm text-zinc-500 max-w-xs">Advanced typography, component rounding, and layout density settings.</p>
                   </div>
                   <Button variant="secondary" className="text-xs font-semibold">Coming Soon</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SettingsSubNavLayout>
  );
};

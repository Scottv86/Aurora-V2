import { useState, useRef } from 'react';
import { Button, Input } from '../../UI/Primitives';
import { Save, Image as ImageIcon, Palette, Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface BrandingSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const BrandingSettings = ({ tenant, onUpdate }: BrandingSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    logoUrl: tenant?.branding?.logoUrl || '',
    primaryColor: tenant?.branding?.primaryColor || '#2563eb',
    accentColor: tenant?.branding?.accentColor || '#4f46e5',
    faviconUrl: tenant?.branding?.faviconUrl || '',
    aiEnabled: tenant?.branding?.aiEnabled ?? true,
    forceDarkMode: tenant?.branding?.forceDarkMode ?? false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size exceeds 2MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBranding(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setBranding(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        branding: {
          ...branding
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Visual Identity Section */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Visual Identity</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Upload your organization's logo and define your primary brand colors to customize the workspace experience.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-10">
          {/* Logo Upload Mock */}
          <div className="space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workspace Logo</label>
            <div className="flex items-center gap-8 p-8 rounded-3xl border-2 border-dashed border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="h-24 w-24 flex items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 overflow-hidden shadow-inner relative group/logo">
                {branding.logoUrl ? (
                  <>
                    <img src={branding.logoUrl} alt="Logo Preview" className="h-full w-full object-contain p-2" />
                    <button 
                      type="button"
                      onClick={removeLogo}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={32} className="text-zinc-300" />
                )}
              </div>
              <div className="space-y-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoChange} 
                  className="hidden" 
                  accept="image/*" 
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Upload New Logo
                </Button>
                <p className="text-[10px] text-zinc-500 font-medium">Recommended: PNG or SVG, max 2MB. Square or horizontal aspect ratio.</p>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Primary Brand Color</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={branding.primaryColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="h-12 w-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm"
                />
                <Input 
                  value={branding.primaryColor} 
                  onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="font-mono text-xs font-bold uppercase"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Accent Color</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={branding.accentColor}
                  onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="h-12 w-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm"
                />
                <Input 
                  value={branding.accentColor} 
                  onChange={(e) => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="font-mono text-xs font-bold uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Options */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 pt-12 border-t border-zinc-100 dark:border-zinc-800">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Experience</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Control the overall visual feel of the platform for all users.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 space-y-6">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <p className="text-sm font-bold text-zinc-900 dark:text-white">Aesthetic Intelligence (AI)</p>
                   <p className="text-xs text-zinc-500">Allow AI to suggest UI improvements based on user behavior.</p>
                </div>
                <div 
                   onClick={() => setBranding(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                   className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${branding.aiEnabled ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                >
                   <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${branding.aiEnabled ? 'right-1' : 'left-1'}`} />
                </div>
             </div>
             
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <p className="text-sm font-bold text-zinc-900 dark:text-white">System Dark Mode Defaults</p>
                   <p className="text-xs text-zinc-500">Force system theme across all organization devices.</p>
                </div>
                <div 
                   onClick={() => setBranding(prev => ({ ...prev, forceDarkMode: !prev.forceDarkMode }))}
                   className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${branding.forceDarkMode ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                >
                   <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${branding.forceDarkMode ? 'right-1' : 'left-1'}`} />
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          type="submit" 
          variant="primary" 
          loading={loading}
          className="gap-2 px-8 font-bold shadow-lg shadow-blue-500/20"
        >
          <Palette size={18} /> Update Brand Identity
        </Button>
      </div>
    </form>
  );
};

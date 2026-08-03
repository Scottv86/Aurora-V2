import { useRef } from 'react';
import { Button, Input } from '../../UI/Primitives';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface BrandingSettingsProps {
  tenant: any;
  branding: any;
  setBranding: React.Dispatch<React.SetStateAction<any>>;
}

export const BrandingSettings = ({ tenant, branding, setBranding }: BrandingSettingsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size exceeds 2MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBranding((prev: any) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setBranding((prev: any) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-6">
      {/* Visual Identity Section */}
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-8">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">Visual Identity & Brand Colors</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Upload your organization logo and define primary brand and accent colors.</p>
        </div>

        {/* Brand Usage Toggle */}
        <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Use Organization Branding</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">When enabled, the workspace will use {tenant?.name || 'your organization'}'s name and logo instead of defaults.</p>
          </div>
          <div 
            onClick={() => setBranding((prev: any) => ({ ...prev, useTenantBranding: !prev.useTenantBranding }))}
            className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${branding.useTenantBranding ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
          >
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${branding.useTenantBranding ? 'right-1' : 'left-1'}`} />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">Organization Logo</label>
          <div className="flex items-start gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-500/50">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
                )}
              </div>
              {branding.logoUrl && (
                <button 
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 font-bold"
              >
                <Upload size={16} />
                Choose Logo
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                PNG, JPG or WebP. Max 2MB. Recommended size 512x512px.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">Primary Brand Color</label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={branding.primaryColor}
                onChange={(e) => setBranding((prev: any) => ({ ...prev, primaryColor: e.target.value }))}
                className="h-12 w-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm"
              />
              <Input 
                value={branding.primaryColor} 
                onChange={(e: any) => setBranding((prev: any) => ({ ...prev, primaryColor: e.target.value }))}
                className="font-mono text-xs font-bold uppercase"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">Accent Color</label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={branding.accentColor}
                onChange={(e) => setBranding((prev: any) => ({ ...prev, accentColor: e.target.value }))}
                className="h-12 w-12 rounded-xl border-0 p-0 overflow-hidden cursor-pointer shadow-sm"
              />
              <Input 
                value={branding.accentColor} 
                onChange={(e: any) => setBranding((prev: any) => ({ ...prev, accentColor: e.target.value }))}
                className="font-mono text-xs font-bold uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Experience & Theme Panel */}
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">Platform Theme Experience</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Control visual feel, AI layout recommendations, and dark mode enforcement.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5">
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Aesthetic Intelligence (AI)</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Allow AI to suggest UI improvements based on user behavior.</p>
            </div>
            <div 
              onClick={() => setBranding((prev: any) => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
              className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${branding.aiEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${branding.aiEnabled ? 'right-1' : 'left-1'}`} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5">
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Force Dark Mode</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Enforce a high-contrast dark theme for all organization members.</p>
            </div>
            <div 
              onClick={() => setBranding((prev: any) => ({ ...prev, forceDarkMode: !prev.forceDarkMode }))}
              className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors ${branding.forceDarkMode ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-white/10'}`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${branding.forceDarkMode ? 'right-1' : 'left-1'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

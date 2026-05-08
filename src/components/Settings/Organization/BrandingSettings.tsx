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
    <div className="space-y-12">
      <div className="space-y-12">
        {/* Visual Identity Section */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Visual Identity</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Upload your organization's logo and define your primary brand colors to customize the workspace experience.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-10">
            {/* Brand Usage Toggle */}
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 dark:bg-blue-500/5 dark:border-blue-500/20 flex items-center justify-between group/toggle">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Use Organization Branding</p>
                <p className="text-xs text-slate-500 max-w-md">When enabled, the workspace will use {tenant?.name || 'your organization'}'s name and logo instead of Aurora defaults.</p>
              </div>
              <div 
                onClick={() => setBranding((prev: any) => ({ ...prev, useTenantBranding: !prev.useTenantBranding }))}
                className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors shadow-inner ${branding.useTenantBranding ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
              >
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${branding.useTenantBranding ? 'right-1' : 'left-1'}`} />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-500">Organization Logo</label>
              <div className="flex items-start gap-6">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-300 dark:text-zinc-700" />
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
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload size={16} />
                    Choose Logo
                  </Button>
                  <p className="text-xs text-slate-500">
                    PNG, JPG or WebP. Max 2MB. Recommended size 512x512px.
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-500">Primary Brand Color</label>
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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-500">Accent Color</label>
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
        </div>

        {/* Theme Options */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 pt-12 border-t border-slate-200 dark:border-zinc-800">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Experience</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Control the overall visual feel of the platform for all users.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="p-6 rounded-3xl bg-slate-100/60 border border-slate-200 dark:bg-white/5 dark:backdrop-blur-xl dark:border-zinc-800 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Aesthetic Intelligence (AI)</p>
                  <p className="text-xs text-slate-500">Allow AI to suggest UI improvements based on user behavior.</p>
                </div>
                <div 
                  onClick={() => setBranding((prev: any) => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                  className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors shadow-inner ${branding.aiEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${branding.aiEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Force Dark Mode</p>
                  <p className="text-xs text-slate-500">Enforce a high-contrast dark theme for all organization members.</p>
                </div>
                <div 
                  onClick={() => setBranding((prev: any) => ({ ...prev, forceDarkMode: !prev.forceDarkMode }))}
                  className={`h-6 w-11 rounded-full relative cursor-pointer transition-colors shadow-inner ${branding.forceDarkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${branding.forceDarkMode ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

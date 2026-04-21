import { useState } from 'react';
import { Button, Input } from '../../UI/Primitives';
import { Save, Search, Share2, Sparkles } from 'lucide-react';

interface MetadataSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const MetadataSettings = ({ tenant, onUpdate }: MetadataSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState({
    siteTitle: tenant?.metadata?.siteTitle || 'Aurora Workspace',
    metaDescription: tenant?.metadata?.metaDescription || 'The unified platform for human and agent collaboration.',
    socialImage: tenant?.metadata?.socialImage || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate({
        metadata: {
          ...tenant?.metadata,
          siteTitle: metadata.siteTitle,
          metaDescription: metadata.metaDescription,
          socialImage: metadata.socialImage,
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <div className="px-10 space-y-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">SEO & Search</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Control how your organization's workspace and public portals appear in search engines and social media.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Input 
              label="Site Title" 
              placeholder="e.g. Acme Corp Portal" 
              value={metadata.siteTitle}
              onChange={(e) => setMetadata(prev => ({ ...prev, siteTitle: e.target.value }))}
              icon={<Search size={18} />}
            />
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Meta Description</label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 outline-none"
                placeholder="A brief description of your organization..."
                value={metadata.metaDescription}
                onChange={(e) => setMetadata(prev => ({ ...prev, metaDescription: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Social Share Preview</label>
              <div className="p-1 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800/50">
                  <div className="aspect-video rounded-[2.25rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                    <div className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="text-white/20 animate-pulse" size={48} />
                    </div>
                    <div className="p-6 space-y-2">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{metadata.siteTitle}</p>
                        <p className="text-xs text-zinc-500 line-clamp-2">{metadata.metaDescription}</p>
                        <p className="text-[10px] text-zinc-400 font-mono italic">aurora.app/portal</p>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end px-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <Button 
          type="submit" 
          variant="primary" 
          loading={loading}
          className="gap-2 px-8 font-bold shadow-lg shadow-blue-500/20"
        >
          <Share2 size={18} /> Update Metadata
        </Button>
      </div>
    </form>
  );
};

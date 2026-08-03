import { useState } from 'react';
import { Input } from '../../UI/Primitives';
import { Search, Sparkles } from 'lucide-react';

interface MetadataSettingsProps {
  tenant: any;
  onUpdate: (updates: any) => Promise<void>;
}

export const MetadataSettings = ({ tenant, onUpdate }: MetadataSettingsProps) => {
  const [metadata, setMetadata] = useState({
    siteTitle: tenant?.metadata?.siteTitle || 'Aurora Workspace',
    metaDescription: tenant?.metadata?.metaDescription || 'The unified platform for human and agent collaboration.',
    socialImage: tenant?.metadata?.socialImage || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      metadata: {
        ...tenant?.metadata,
        siteTitle: metadata.siteTitle,
        metaDescription: metadata.metaDescription,
        socialImage: metadata.socialImage,
      }
    });
  };

  return (
    <form id="org-settings-form" onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-8">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">SEO & Social Sharing Preview</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Control search engine index titles, meta descriptions, and social media card previews.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
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
                className="flex min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-white/5 dark:backdrop-blur-md dark:text-zinc-100 dark:placeholder:text-zinc-600 outline-none"
                placeholder="A brief description of your organization..."
                value={metadata.metaDescription}
                onChange={(e) => setMetadata(prev => ({ ...prev, metaDescription: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Social Share Card Preview</label>
            <div className="p-1 rounded-3xl bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
              <div className="aspect-video rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                <div className="flex-1 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="text-white/30 animate-pulse" size={48} />
                </div>
                <div className="p-5 space-y-1.5">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{metadata.siteTitle}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2">{metadata.metaDescription}</p>
                  <p className="text-[10px] text-zinc-400 font-mono italic">aurora.app/portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

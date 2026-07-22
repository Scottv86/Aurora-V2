import React from 'react';
import { cn } from '../../lib/utils';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export interface FormManifestProps {
  manifest: {
    title?: string;
    description?: string;
    layout?: {
      id: string;
      columnCount: number;
      columns: {
        id: string;
        fields: {
          id: string;
          name: string;
          label: string;
          type: string;
          required?: boolean;
          placeholder?: string;
        }[];
      }[];
    }[];
  };
  onApply?: () => void;
}

/**
 * Poly-Glassmorphic Dynamic Form Manifest Renderer
 * Renders AI-generated UI manifests in real-time.
 */
export const FormManifestRenderer: React.FC<FormManifestProps> = ({ manifest, onApply }) => {
  if (!manifest || !manifest.layout) return null;

  return (
    <div className="mt-4 p-5 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl text-zinc-100 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{manifest.title || 'Dynamic Form Manifest'}</h4>
            <p className="text-xs text-zinc-400">{manifest.description || 'Poly-Glassmorphic UI Layout'}</p>
          </div>
        </div>
        {onApply && (
          <button
            onClick={onApply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <CheckCircle2 size={13} />
            Apply to Studio
          </button>
        )}
      </div>

      <div className="space-y-4 pt-1">
        {manifest.layout.map((row) => (
          <div
            key={row.id}
            className={cn(
              'grid gap-3 p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/50',
              row.columnCount === 2 ? 'grid-cols-2' : row.columnCount === 3 ? 'grid-cols-3' : 'grid-cols-1'
            )}
          >
            {row.columns.map((col) => (
              <div key={col.id} className="space-y-2">
                {col.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                      <span>{field.label}</span>
                      {field.required && <span className="text-amber-400 text-[10px]">*required</span>}
                    </label>
                    <input
                      disabled
                      type={field.type === 'number' ? 'number' : 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 cursor-not-allowed opacity-80"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

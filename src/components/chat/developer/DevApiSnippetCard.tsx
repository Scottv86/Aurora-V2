import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import { toast } from 'sonner';

export interface DevApiSnippetProps {
  moduleName: string;
  typescriptDef?: string;
  zodSchema?: string;
  curlExample?: string;
  supabaseExample?: string;
}

export const DevApiSnippetCard: React.FC<DevApiSnippetProps> = ({
  moduleName,
  typescriptDef = `export interface ${moduleName.replace(/\s+/g, '')}Record {\n  id: string;\n  name: string;\n  status: 'active' | 'archived';\n  createdAt: string;\n}`,
  zodSchema = `import { z } from 'zod';\n\nexport const ${moduleName.replace(/\s+/g, '')}Schema = z.object({\n  name: z.string().min(1),\n  status: z.enum(['active', 'archived'])\n});`,
  curlExample = `curl -X POST "http://localhost:3001/api/modules/${moduleName.toLowerCase().replace(/\s+/g, '_')}/records" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Sample Item", "status": "active"}'`,
  supabaseExample = `const { data, error } = await supabase\n  .from('${moduleName.toLowerCase().replace(/\s+/g, '_')}')\n  .select('*');`
}) => {
  const [activeTab, setActiveTab] = useState<'ts' | 'zod' | 'curl' | 'supabase'>('ts');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    switch (activeTab) {
      case 'zod': return zodSchema;
      case 'curl': return curlExample;
      case 'supabase': return supabaseExample;
      case 'ts':
      default: return typescriptDef;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-lg backdrop-blur-md">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <FileCode className="h-4 w-4 text-indigo-400 mr-1" />
          <button
            onClick={() => setActiveTab('ts')}
            className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition ${
              activeTab === 'ts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TypeScript
          </button>
          <button
            onClick={() => setActiveTab('zod')}
            className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition ${
              activeTab === 'zod' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Zod Schema
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition ${
              activeTab === 'supabase' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Supabase SDK
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition ${
              activeTab === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            cURL
          </button>
        </div>

        <button
          onClick={copyCode}
          className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Display */}
      <div className="p-3 font-mono text-xs text-indigo-200 bg-slate-950 overflow-x-auto">
        <pre>{getActiveCode()}</pre>
      </div>
    </div>
  );
};

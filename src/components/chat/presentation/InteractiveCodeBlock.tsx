import React, { useState } from 'react';
import { Code, Copy, Check, Play } from 'lucide-react';
import { toast } from 'sonner';

export interface InteractiveCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  onRun?: (code: string, language: string) => void;
}

export const InteractiveCodeBlock: React.FC<InteractiveCodeBlockProps> = ({
  code,
  language = 'typescript',
  filename,
  onRun
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-mono">
          <Code className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">{filename || language}</span>
        </div>

        <div className="flex items-center gap-2">
          {onRun && (
            <button
              onClick={() => onRun(code, language)}
              className="flex items-center gap-1 rounded bg-emerald-600/80 px-2 py-0.5 text-[11px] font-medium text-white transition hover:bg-emerald-500"
              title="Run code in sandbox"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Run</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto p-3 font-mono text-xs text-slate-200 leading-relaxed bg-slate-950">
        <pre>{code}</pre>
      </div>
    </div>
  );
};

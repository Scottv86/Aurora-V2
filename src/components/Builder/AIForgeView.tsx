import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIForgeViewProps {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

export const AIForgeView: React.FC<AIForgeViewProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 relative z-10">
            <BrainCircuit size={40} className="text-white" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full"
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">The AI Forge</h3>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest leading-relaxed">
            Describe the API you want to build. The Shadow Architect will generate the logic, schema, and interface automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200" />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A service that fetches live gold prices and converts them to local currency..."
              className="w-full h-40 bg-transparent px-6 py-6 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
              disabled={isGenerating}
            />
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">L4 Intelligence Active</span>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  prompt.trim() && !isGenerating 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95" 
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Forging...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>Ignite Forge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            "Fetch weather for a city",
            "Generate QR codes for URLs",
            "Translate text via DeepL",
            "Sync data with Airtable"
          ].map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(example)}
              className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-600 transition-all text-left truncate"
            >
              {example}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};

import { useNavigate } from 'react-router-dom';
import { Cpu, Database, ArrowRight } from 'lucide-react';

export const BuilderChoice = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Module Builder</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Choose how you want to build your next module.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => navigate('/workspace/ai-builder')}
          className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm dark:shadow-none"
        >
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
            <Cpu size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Build with AI</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Describe what you want to build in plain English and let our AI generate the data schema, workflows, and automations for you.
          </p>
          <div className="mt-6 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Get Started</span>
            <ArrowRight size={16} />
          </div>
        </button>

        <button
          onClick={() => navigate('/workspace/builder/new')}
          className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 shadow-sm dark:shadow-none"
        >
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <Database size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Drag & Drop Builder</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Take full control and build your module manually. Define fields, set up relationships, and configure workflows step-by-step.
          </p>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Start Building</span>
            <ArrowRight size={16} />
          </div>
        </button>
      </div>
    </div>
  );
};

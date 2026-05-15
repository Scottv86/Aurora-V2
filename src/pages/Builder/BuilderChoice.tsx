import { useNavigate } from 'react-router-dom';
import { Cpu, Database, ArrowRight, LayoutGrid, ArrowLeft } from 'lucide-react';

export const BuilderChoice = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <div className="flex flex-col space-y-4">
        <button 
          onClick={() => navigate('/workspace/settings/modules')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors self-start group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Catalog</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Module Builder</h1>
          <p className="text-zinc-500 text-xs font-medium">Choose how you want to build your next module.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/workspace/settings/builder/new')}
          className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 shadow-sm dark:shadow-none"
        >
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <Database size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Blank Canvas</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Take full control and build your module manually. Define fields, set up relationships, and configure workflows step-by-step.
          </p>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Start Building</span>
            <ArrowRight size={16} />
          </div>
        </button>

        <button
          onClick={() => navigate('/workspace/settings/modules?tab=library')}
          className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-amber-500/50 transition-all hover:shadow-2xl hover:shadow-amber-500/10 shadow-sm dark:shadow-none"
        >
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Start from Template</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Choose from a library of prebuilt industry templates and blueprints. Install and customize them to fit your business needs.
          </p>
          <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Browse Library</span>
            <ArrowRight size={16} />
          </div>
        </button>

        <button
          onClick={() => navigate('/workspace/settings/ai-builder')}
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
      </div>
    </div>
  );
};

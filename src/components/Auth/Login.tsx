import { Sparkles, LogIn } from 'lucide-react';
import { useFirebase } from '../../hooks/useFirebase';

export const Login = () => {
  const { signIn } = useFirebase();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Aurora</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">The AI-Powered Business Operating Platform</p>
        </div>

        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
          <p className="text-sm text-zinc-500">Sign in to access your workspace and AI-powered solutions.</p>
          <button 
            onClick={signIn}
            className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            <span>Sign in with Google</span>
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest font-bold">
          Secure • Enterprise Ready • AI Driven
        </p>
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AuroraSpinner } from '../UI/Primitives';

type AuthMode = 'signin' | 'signup' | 'reset';

export const Login = () => {
  const { signInWithEmail, createWithEmail, resetPassword, user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect once authenticated
  useEffect(() => {
    if (!loading && user) {
      const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
      
      let targetPath: string;
      if (isSuperAdmin) {
        // SuperAdmins are forced to /admin unless they were already trying to reach a specific admin sub-page
        targetPath = fromPath?.startsWith('/admin') ? fromPath : '/admin';
      } else {
        // Standard users go to the redirected 'from' path or the default /workspace
        targetPath = fromPath || '/workspace';
      }
      
      navigate(targetPath, { replace: true });
    }
  }, [user, loading, isSuperAdmin, navigate, location.state]);

  // Show spinner while Auth resolves initial state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <AuroraSpinner size="md" className="text-indigo-500" />
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (mode !== 'reset' && !password)) return;
    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        await createWithEmail(email, password);
        // After signup Supabase might require email confirmation, 
        // but we've added a toast in the context.
      } else {
        await resetPassword(email);
        setMode('signin');
      }
    } catch (err) {
      // Errors handled inside context with toasts
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeConfig = {
    signin: { title: 'Welcome back', subtitle: 'Sign in to your Aurora workspace', cta: 'Sign In', switchText: "Don't have an account?", switchAction: () => setMode('signup'), switchLabel: 'Create one' },
    signup: { title: 'Create account', subtitle: 'Join the Aurora platform today', cta: 'Create Account', switchText: 'Already have an account?', switchAction: () => setMode('signin'), switchLabel: 'Sign in' },
    reset: { title: 'Reset password', subtitle: "We'll send a reset link to your inbox", cta: 'Send Reset Link', switchText: 'Remembered it?', switchAction: () => setMode('signin'), switchLabel: 'Back to sign in' },
  };

  const cfg = modeConfig[mode];

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Aurora</h1>
            <p className="text-zinc-500 text-sm mt-1">The AI-Powered Business Operating Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Mode header */}
          <div>
            <h2 className="text-xl font-semibold text-white">{cfg.title}</h2>
            <p className="text-zinc-500 text-sm mt-0.5">{cfg.subtitle}</p>
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full bg-zinc-800/60 border border-zinc-700/60 text-white placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-sans"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-zinc-800/60 border border-zinc-700/60 text-white placeholder-zinc-600 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <AuroraSpinner />
              ) : mode === 'reset' ? (
                <>
                  <RotateCcw size={15} />
                  {cfg.cta}
                </>
              ) : (
                <>
                  {cfg.cta}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Mode switch */}
          <p className="text-center text-sm text-zinc-500 pt-2">
            {cfg.switchText}{' '}
            <button
              onClick={cfg.switchAction}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {cfg.switchLabel}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
          Secure • Enterprise Ready • AI Driven
        </p>
      </div>
    </div>
  );
};

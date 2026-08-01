import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AuroraSpinner } from '../UI/Primitives';

type AuthMode = 'signin' | 'signup' | 'reset';

/* ─── tiny utility: animated orb ─────────────────────────────────── */
const Orb = ({
  size,
  color,
  style,
}: {
  size: string;
  color: string;
  style?: React.CSSProperties;
}) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: color,
      filter: 'blur(80px)',
      opacity: 0.35,
      ...style,
    }}
  />
);

export const Login = () => {
  const { signInWithEmail, createWithEmail, resetPassword, user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // Subtle mouse-parallax state for the card
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    setTilt({ x: dy * 4, y: -dx * 4 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Redirect once authenticated
  useEffect(() => {
    if (!loading && user) {
      const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
      let targetPath: string;
      if (isSuperAdmin) {
        targetPath = fromPath?.startsWith('/admin') ? fromPath : '/admin';
      } else {
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
      } else {
        await resetPassword(email);
        setMode('signin');
      }
    } catch (_err) {
      // Errors handled inside context with toasts
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeConfig = {
    signin: {
      title: 'Welcome back',
      subtitle: 'Sign in to your Aurora workspace',
      cta: 'Sign In',
      switchText: "Don't have an account?",
      switchAction: () => setMode('signup'),
      switchLabel: 'Create one',
    },
    signup: {
      title: 'Create account',
      subtitle: 'Join the Aurora platform today',
      cta: 'Create Account',
      switchText: 'Already have an account?',
      switchAction: () => setMode('signin'),
      switchLabel: 'Sign in',
    },
    reset: {
      title: 'Reset password',
      subtitle: "We'll send a reset link to your inbox",
      cta: 'Send Reset Link',
      switchText: 'Remembered it?',
      switchAction: () => setMode('signin'),
      switchLabel: 'Back to sign in',
    },
  };

  const cfg = modeConfig[mode];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d0d1a 0%, #090910 60%, #050508 100%)' }}
    >
      {/* ── Animated ambient orbs ── */}
      <Orb
        size="700px"
        color="radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)"
        style={{ top: '-15%', left: '50%', transform: 'translateX(-50%)', animation: 'orbFloat1 12s ease-in-out infinite' }}
      />
      <Orb
        size="500px"
        color="radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)"
        style={{ bottom: '-10%', right: '-5%', animation: 'orbFloat2 15s ease-in-out infinite' }}
      />
      <Orb
        size="400px"
        color="radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)"
        style={{ bottom: '10%', left: '-8%', animation: 'orbFloat3 18s ease-in-out infinite' }}
      />

      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Noise texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      <div className="max-w-md w-full space-y-8 relative z-10">

        {/* ── Logo mark ── */}
        <div className="text-center space-y-4" style={{ animation: 'fadeSlideUp 0.6s ease both' }}>
          {/* Icon */}
          <div className="relative mx-auto w-fit">
            {/* Glow ring behind icon */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                filter: 'blur(18px)',
                opacity: 0.6,
                transform: 'scale(1.3)',
              }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.15) inset, 0 20px 40px -10px rgba(99,102,241,0.5)',
              }}
            >
              <Sparkles size={30} className="text-white" />
            </div>
          </div>

          <div>
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 70%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Aurora
            </h1>
            <p className="text-zinc-500 text-sm mt-1.5 tracking-wide">
              The AI-Powered Business Operating Platform
            </p>
          </div>
        </div>

        {/* ── Glass card ── */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative"
          style={{
            animation: 'fadeSlideUp 0.7s ease 0.1s both',
            transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Gradient border glow */}
          <div
            className="absolute -inset-[1px] rounded-[24px] pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.3) 50%, rgba(59,130,246,0.2) 100%)',
              zIndex: 0,
            }}
          />

          {/* Frosted glass panel */}
          <div
            className="relative rounded-[23px] p-8 space-y-6"
            style={{
              background: 'rgba(14, 14, 26, 0.75)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.06) inset,
                0 1px 0 0 rgba(255,255,255,0.1) inset,
                0 40px 80px -20px rgba(0,0,0,0.8),
                0 20px 40px -10px rgba(99,102,241,0.15)
              `,
              zIndex: 1,
            }}
          >
            {/* Mode header */}
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">{cfg.title}</h2>
              <p className="text-zinc-500 text-sm mt-0.5">{cfg.subtitle}</p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">

              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Email
                </label>
                <div
                  className="relative rounded-xl transition-all duration-300"
                  style={{
                    boxShadow: focusedField === 'email'
                      ? '0 0 0 1px rgba(99,102,241,0.6), 0 0 20px -4px rgba(99,102,241,0.25)'
                      : '0 0 0 1px rgba(255,255,255,0.07)',
                  }}
                >
                  <Mail
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: focusedField === 'email' ? '#818cf8' : '#52525b' }}
                  />
                  <input
                    type="email"
                    id="aurora-login-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@company.com"
                    required
                    className="w-full text-white placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all font-sans"
                    style={{
                      background: focusedField === 'email'
                        ? 'rgba(99,102,241,0.06)'
                        : 'rgba(255,255,255,0.04)',
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              {mode !== 'reset' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                    Password
                  </label>
                  <div
                    className="relative rounded-xl transition-all duration-300"
                    style={{
                      boxShadow: focusedField === 'password'
                        ? '0 0 0 1px rgba(99,102,241,0.6), 0 0 20px -4px rgba(99,102,241,0.25)'
                        : '0 0 0 1px rgba(255,255,255,0.07)',
                    }}
                  >
                    <Lock
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: focusedField === 'password' ? '#818cf8' : '#52525b' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="aurora-login-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full text-white placeholder-zinc-600 rounded-xl pl-10 pr-10 py-3 text-sm outline-none transition-all font-sans"
                      style={{
                        background: focusedField === 'password'
                          ? 'rgba(99,102,241,0.06)'
                          : 'rgba(255,255,255,0.04)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password */}
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

              {/* Submit CTA */}
              <button
                type="submit"
                id="aurora-login-submit"
                disabled={isSubmitting}
                className="w-full relative py-3 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%)',
                  boxShadow: '0 4px 24px -4px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
                }}
              >
                {/* Hover sheen */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
                  }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <AuroraSpinner />
                  ) : mode === 'reset' ? (
                    <>
                      <RotateCcw size={14} />
                      {cfg.cta}
                    </>
                  ) : (
                    <>
                      {cfg.cta}
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-[11px] text-zinc-600 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Mode switch */}
            <p className="text-center text-sm text-zinc-500">
              {cfg.switchText}{' '}
              <button
                onClick={cfg.switchAction}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline underline-offset-2 decoration-indigo-400/40"
              >
                {cfg.switchLabel}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p
          className="text-center text-[10px] text-zinc-700 uppercase tracking-[0.2em] font-bold"
          style={{ animation: 'fadeSlideUp 0.8s ease 0.2s both' }}
        >
          Secure&nbsp;&bull;&nbsp;Enterprise Ready&nbsp;&bull;&nbsp;AI Driven
        </p>
      </div>

      {/* ── Keyframe animations injected inline ── */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translateX(-50%) translateY(0px) scale(1); }
          33%       { transform: translateX(-48%) translateY(-30px) scale(1.05); }
          66%       { transform: translateX(-52%) translateY(20px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-40px) scale(1.08); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(30px) scale(0.95); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

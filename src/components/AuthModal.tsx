import { ArrowRight, KeyRound, Mail, ShieldCheck, User, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { UserStatePayload } from '../types/codequest';

interface AuthModalProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  onClose: () => void;
  onAuthenticated: (token: string, state: UserStatePayload) => void;
}

export function AuthModal({
  initialMode = 'signup',
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/auth/google-status')
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setGoogleConfigured(Boolean(d.configured)))
      .catch(() => setGoogleConfigured(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sign up failed.');
        onAuthenticated(data.token, data.state);
      } else if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');
        onAuthenticated(data.token, data.state);
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset request failed.');
        setInfoMessage(
          data.demoResetCode
            ? `${data.message} Verification code: ${data.demoResetCode}`
            : data.message
        );
        if (data.demoResetCode) {
          setResetCode(String(data.demoResetCode));
        }
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, resetCode, newPassword: password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password reset failed.');
        setInfoMessage(data.message);
        setPassword('');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed.');
      onAuthenticated(data.token, data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-[#0D1424] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-semibold text-cyan-300">CodeQuest Account</p>
        <h2 id="auth-modal-title" className="mt-1 font-display text-2xl font-bold text-white">
          {mode === 'signup'
            ? 'Start Your Quest'
            : mode === 'login'
              ? 'Welcome Back'
              : mode === 'forgot'
                ? 'Recover Password'
                : 'Enter Reset Code'}
        </h2>

        {/* Mode Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === 'signup' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === 'login' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === 'forgot' || mode === 'reset'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300">
                  Full Name
                </label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sneha Ghosh"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-username" className="block text-xs font-medium text-slate-300">
                  Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sneha_dev"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
              Email Address
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === 'reset' && (
            <div>
              <label htmlFor="auth-reset-code" className="block text-xs font-medium text-slate-300">
                Reset Code
              </label>
              <input
                id="auth-reset-code"
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="6-digit code"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create Account'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'forgot'
                    ? 'Send Reset Code'
                    : 'Update Password'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500/60 hover:text-white"
          >
            Continue as Demo Explorer (nova_coder)
          </button>

          <button
            type="button"
            onClick={() => {
              if (!googleConfigured) {
                setInfoMessage(
                  'Google OAuth activates once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are added to environment secrets. Use Email/Password or Demo Explorer right now.'
                );
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-300 hover:border-slate-700"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            {googleConfigured ? 'Continue with Google' : 'Google Sign-In (Configure OAuth Secrets)'}
          </button>
        </div>
      </div>
    </div>
  );
}

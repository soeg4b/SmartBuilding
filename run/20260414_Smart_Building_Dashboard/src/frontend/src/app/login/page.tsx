'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function LoginForm() {
  const { login, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (isAuthenticated) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50">INTEGRA</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 mt-1">Total Building Resource Dashboard</p>
          <p className="text-sm text-slate-400 mt-2">Sign in to your workspace</p>
        </div>

        {/* Form card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 card">
          <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-3">Demo Accounts · click to autofill</p>

          <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">Admin (All Buildings)</p>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            {DEMO_ACCOUNTS.filter(a => a.group === 'admin').map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="text-left bg-slate-700/40 hover:bg-slate-700 rounded-lg p-2 transition"
              >
                <p className="text-slate-100 font-semibold">{a.label}</p>
                <p className="text-slate-400 truncate">{a.email}</p>
              </button>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-wider text-blue-400 mb-1.5">🏢 Data Center (3 buildings)</p>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            {DEMO_ACCOUNTS.filter(a => a.group === 'dc').map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="text-left bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-lg p-2 transition"
              >
                <p className="text-slate-100 font-semibold">{a.label}</p>
                <p className="text-slate-400 truncate">{a.email}</p>
              </button>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-wider text-emerald-400 mb-1.5">🏬 Office (3 buildings)</p>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            {DEMO_ACCOUNTS.filter(a => a.group === 'office').map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="text-left bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-lg p-2 transition"
              >
                <p className="text-slate-100 font-semibold">{a.label}</p>
                <p className="text-slate-400 truncate">{a.email}</p>
              </button>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-wider text-amber-400 mb-1.5">🏨 Hospitality (3 buildings)</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.filter(a => a.group === 'hotel').map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="text-left bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-lg p-2 transition"
              >
                <p className="text-slate-100 font-semibold">{a.label}</p>
                <p className="text-slate-400 truncate">{a.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  // Admin — sees all 3 buildings
  { label: 'Sys Admin',         email: 'admin@integra.com',       password: 'admin123',    group: 'admin' },
  { label: 'CFO / Executive',   email: 'cfo@integra.com',         password: 'cfo123',      group: 'admin' },
  // Data Center (b1)
  { label: 'Tech DC - Mike',    email: 'tech@integra.com',        password: 'tech123',     group: 'dc' },
  { label: 'Building Manager',  email: 'manager@integra.com',     password: 'manager123',  group: 'dc' },
  { label: 'Security Officer',  email: 'security@integra.com',    password: 'security123', group: 'dc' },
  // Office (b2)
  { label: 'Tech Office - Andi',email: 'tech-office@integra.com', password: 'tech123',     group: 'office' },
  { label: 'Tenant (Acme)',     email: 'tenant@integra.com',      password: 'tenant123',   group: 'office' },
  // Hospitality (b3)
  { label: 'Tech Hotel - Dewi', email: 'tech-hotel@integra.com',  password: 'tech123',     group: 'hotel' },
  { label: 'Hotel Guest',       email: 'guest@integra.com',       password: 'guest123',    group: 'hotel' },
];

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

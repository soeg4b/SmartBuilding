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
          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password); }}
                className="text-left bg-slate-700/40 hover:bg-slate-700 rounded-lg p-2 transition"
              >
                <p className="text-slate-100 font-semibold">{a.label}</p>
                <p className="text-slate-400 truncate">{a.email}</p>
                <p className="text-slate-500">pw: {a.password}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { label: 'Sys Admin',         email: 'admin@integra.com',    password: 'admin123' },
  { label: 'CFO / Executive',   email: 'cfo@integra.com',      password: 'cfo123' },
  { label: 'Technician',        email: 'tech@integra.com',     password: 'tech123' },
  { label: 'Building Manager',  email: 'manager@integra.com',  password: 'manager123' },
  { label: 'Security Officer',  email: 'security@integra.com', password: 'security123' },
  { label: 'Tenant',            email: 'tenant@integra.com',   password: 'tenant123' },
  { label: 'Hotel Guest',       email: 'guest@integra.com',    password: 'guest123' },
];

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

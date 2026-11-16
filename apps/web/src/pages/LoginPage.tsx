import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login, backendError, retryAuth } = useAuth();
  const [meterOrEmail, setMeterOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(meterOrEmail, password);
      const adminUrl = (import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5174').replace(/\/+$/, '');
      if (res?.role === 'SUPERVISOR') {
        window.location.href = `${adminUrl}/supervisor`;
        return;
      }
      if (res?.role === 'SUPER_ADMIN') {
        window.location.href = `${adminUrl}/analytics`;
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials. Please check your meter number and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-colors duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">CITIZEN PORTAL</span>
          <h1 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
            Login to GreenPay
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
            Enter your electricity meter number and password to access your Green Score and waste receipts.
          </p>
        </div>

        {(error || backendError) && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span>{error || backendError}</span>
              {backendError && !error && (
                <button
                  type="button"
                  onClick={() => retryAuth()}
                  className="text-emerald-700 dark:text-[#D7FF35] hover:underline text-[11px] font-bold ml-2 shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label htmlFor="login-meter" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
              Electricity Meter Number
            </label>
            <input
              id="login-meter"
              type="text"
              required
              value={meterOrEmail}
              onChange={(e) => setMeterOrEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              placeholder="e.g. BESCOM-IND-XXXXXX"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="login-pwd" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] text-emerald-700 dark:text-[#D7FF35] hover:underline focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-pwd"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] disabled:opacity-50 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 mt-2 shadow-sm dark:shadow-glow-lime"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Citizen Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center text-xs text-slate-600 dark:text-[#A7B9A8] pt-2 border-t border-slate-200 dark:border-white/10">
          New household?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-emerald-700 dark:text-[#D7FF35] hover:underline font-medium"
          >
            Register your electricity meter
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, KeyRound, AlertCircle, CheckCircle, FlaskConical, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login, demoLogin } = useAuth();
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

  const handleOneClickDemo = async (role: string = 'CITIZEN', demoId?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await demoLogin(role, demoId);
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
      setError(err.message || 'Demo authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCitizen = (meter: string) => {
    setMeterOrEmail(meter);
    setPassword('••••••••••••');
    handleOneClickDemo('CITIZEN', meter.includes('3091') ? 'citizen_jayanagar' : 'citizen_koramangala');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-[#0D4935] border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="micro-label text-[#D7FF35]">CITIZEN PORTAL</span>
          <h1 className="text-2xl font-light text-white tracking-tight">
            Login to GreenPay
          </h1>
          <p className="text-xs text-[#A7B9A8]">
            Enter your electricity meter number and password to access your Green Score and waste receipts.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label htmlFor="login-meter" className="block text-[#A7B9A8] font-medium">
              Electricity Meter Number
            </label>
            <input
              id="login-meter"
              type="text"
              required
              value={meterOrEmail}
              onChange={(e) => setMeterOrEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
              placeholder="e.g. BESCOM-IND-104928"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="login-pwd" className="block text-[#A7B9A8] font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] text-[#D7FF35] hover:underline focus:outline-none"
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] disabled:opacity-50 text-[#041B15] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 mt-2 shadow-glow-lime"
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

        {/* Demo Credentials Quick-Fill & 1-Click Access */}
        <div className="p-4 rounded-xl bg-[#062B20] border border-amber-500/20 space-y-3 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="micro-label text-amber-300 font-semibold flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              Demonstration Mode (Evaluator Access)
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">1-Click Launch</span>
          </div>
          <p className="text-[10px] text-[#A7B9A8] leading-tight">
            Instant evaluation sessions with pre-seeded demo collection receipts and isolated metrics. Real citizen records remain untouched.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('CITIZEN', 'citizen_koramangala')}
              className="w-full p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[#A7B9A8] hover:text-white flex items-center justify-between transition border border-white/5"
            >
              <div>
                <span className="font-medium text-white block">Aarav Sharma</span>
                <span className="text-[10px] text-[#A7B9A8]">Koramangala Ward · 78.5 Green Score · Active Receipts</span>
              </div>
              <span className="font-mono text-[#D7FF35] text-xs font-bold shrink-0">Enter &rarr;</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOneClickDemo('CITIZEN', 'citizen_jayanagar')}
              className="w-full p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[#A7B9A8] hover:text-white flex items-center justify-between transition border border-white/5"
            >
              <div>
                <span className="font-medium text-white block">Rohan Verma</span>
                <span className="text-[10px] text-[#A7B9A8]">Jayanagar Ward · 62.0 Green Score · Secondary Household</span>
              </div>
              <span className="font-mono text-amber-400 text-xs font-bold shrink-0">Enter &rarr;</span>
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center text-xs text-[#A7B9A8] pt-2 border-t border-white/10">
          New household?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[#D7FF35] hover:underline font-medium"
          >
            Register your electricity meter
          </button>
        </div>
      </div>
    </div>
  );
};
};

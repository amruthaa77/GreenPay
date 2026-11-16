import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ShieldCheck, Lock, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

interface AcceptInvitePageProps {
  navigate: (path: string) => void;
}

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ navigate }) => {
  const { acceptInvite } = useAdminAuth();
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Missing or invalid supervisor invitation token.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await acceptInvite({
        invite_token: token,
        name: name.trim(),
        password,
        phone_number: phone.trim() || undefined,
      });
      navigate('/supervisor');
    } catch (err: any) {
      setError(err.message || 'Failed to activate supervisor invitation. The token may be expired or already used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0] relative transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-[#D7FF35]/15 border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center justify-center mx-auto text-emerald-800 dark:text-[#D7FF35]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">MUNICIPAL SUPERVISOR ONBOARDING</span>
          <h1 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
            Activate Supervisor Account
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
            You have received an official municipal supervisor invite. Set your credentials to begin doorstep collections.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-[#A7B9A8]" htmlFor="supervisor-name">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-3" />
              <input
                id="supervisor-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Gowda"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-[#A7B9A8]" htmlFor="supervisor-phone">
              Official Mobile Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-3" />
              <input
                id="supervisor-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-[#A7B9A8]" htmlFor="supervisor-pass">
              Create Password (min 8 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-3" />
              <input
                id="supervisor-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-[#A7B9A8]" htmlFor="supervisor-pass-confirm">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-3" />
              <input
                id="supervisor-pass-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-sm dark:shadow-glow-lime"
          >
            {loading ? 'Activating Account...' : 'Complete Onboarding & Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

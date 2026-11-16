import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, Lock, Info } from 'lucide-react';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    meter_number: '',
    name: '',
    ward_name: 'Koramangala',
    password: '',
    email: '',
    phone_number: '',
    is_adult_declared: true,
    terms_privacy_consent: false,
    marketing_consent: false,
  });

  const [minorBlocked, setMinorBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAgeChange = (isAdult: boolean) => {
    setFormData({ ...formData, is_adult_declared: isAdult });
    if (!isAdult) {
      setMinorBlocked(true);
    } else {
      setMinorBlocked(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Enforce 18+ declaration per DPDP Section 9
    if (!formData.is_adult_declared) {
      setMinorBlocked(true);
      return;
    }

    if (!formData.terms_privacy_consent) {
      setError('You must accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setLoading(true);

    try {
      await register({
        meter_number: formData.meter_number.trim(),
        password: formData.password,
        name: formData.name.trim(),
        ward_name: formData.ward_name,
        is_adult_declared: true,
        terms_privacy_consent: true,
        marketing_consent: formData.marketing_consent,
        email: formData.email ? formData.email.trim() : undefined,
        phone_number: formData.phone_number ? formData.phone_number.trim() : undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 p-8 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-colors duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">CITIZEN ENROLLMENT</span>
          <h1 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
            Register Electricity Meter
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8]">
            Anchor your household waste collection to physical premises. New accounts are verified at first doorstep collection.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* DPDP Section 9 Minor Block Alert */}
        {minorBlocked ? (
          <div
            role="alert"
            className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs text-slate-700 dark:text-[#A7B9A8]"
          >
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Registration Blocked: Minor Age Protection</span>
            </div>
            <p className="leading-relaxed">
              In strict accordance with <strong>Section 9 of the Digital Personal Data Protection (DPDP) Act 2023</strong>, processing of personal data for individuals under 18 years of age requires verifiable parental or lawful guardian consent.
            </p>
            <p className="text-slate-600 dark:text-[#A7B9A8]/80">
              Because GreenPay does not collect biometric or parental identification documents, online registration must be completed by an adult head of household (18+). No data has been saved for this attempt.
            </p>
            <button
              type="button"
              onClick={() => handleAgeChange(true)}
              className="text-xs font-mono text-emerald-700 dark:text-[#D7FF35] hover:underline"
            >
              &larr; Return to adult registration
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Meter Number */}
            <div className="space-y-1">
              <label htmlFor="reg-meter" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
                Electricity Meter Number <span className="text-emerald-700 dark:text-[#D7FF35]">*</span>
              </label>
              <input
                id="reg-meter"
                type="text"
                required
                value={formData.meter_number}
                onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                placeholder="e.g. BESCOM-IND-XXXXXX"
              />
              <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70 block">
                Symmetrically encrypted at rest. Displayed masked (e.g. BESCOM-***-4928).
              </span>
            </div>

            {/* Resident Name */}
            <div className="space-y-1">
              <label htmlFor="reg-name" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
                Full Name / Household Name <span className="text-emerald-700 dark:text-[#D7FF35]">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                placeholder="e.g. Aarav Sharma"
              />
            </div>

            {/* Ward Selection (Names Only) */}
            <div className="space-y-1">
              <label htmlFor="reg-ward" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
                Bengaluru Ward <span className="text-emerald-700 dark:text-[#D7FF35]">*</span>
              </label>
              <select
                id="reg-ward"
                value={formData.ward_name}
                onChange={(e) => setFormData({ ...formData, ward_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              >
                <option value="Koramangala">Koramangala Ward</option>
                <option value="Indiranagar">Indiranagar Ward</option>
                <option value="Jayanagar">Jayanagar Ward</option>
                <option value="Whitefield">Whitefield Ward</option>
              </select>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="reg-pwd" className="block text-slate-700 dark:text-[#A7B9A8] font-medium">
                Create Password (min. 8 characters) <span className="text-emerald-700 dark:text-[#D7FF35]">*</span>
              </label>
              <input
                id="reg-pwd"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                placeholder="••••••••"
              />
            </div>

            {/* Optional Contact Details (Data Minimisation) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#062B20] border border-slate-200 dark:border-white/5 space-y-3">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-[#F4F7F0] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Optional Contact Details (Data Minimisation)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  placeholder="Email (optional)"
                />
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  placeholder="Phone (optional)"
                />
              </div>
            </div>

            {/* DPDP Consents (Separated & Unticked by Default) */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10 text-[11px]">
              
              {/* Age 18+ Declaration */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-age"
                  checked={formData.is_adult_declared}
                  onChange={(e) => handleAgeChange(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-500 dark:focus:ring-[#D7FF35] bg-white dark:bg-[#041B15] border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <label htmlFor="chk-age" className="text-slate-600 dark:text-[#A7B9A8] leading-normal cursor-pointer">
                  I declare that I am <strong>18 years of age or older</strong> and authorized to register for this household (DPDP Act s.9).
                </label>
              </div>

              {/* Required Terms / Privacy Consent */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-terms"
                  required
                  checked={formData.terms_privacy_consent}
                  onChange={(e) => setFormData({ ...formData, terms_privacy_consent: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-500 dark:focus:ring-[#D7FF35] bg-white dark:bg-[#041B15] border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <label htmlFor="chk-terms" className="text-slate-600 dark:text-[#A7B9A8] leading-normal cursor-pointer">
                  I agree to the <button type="button" onClick={() => navigate('/terms')} className="text-emerald-700 dark:text-[#D7FF35] underline">Terms of Service</button> and <button type="button" onClick={() => navigate('/privacy')} className="text-emerald-700 dark:text-[#D7FF35] underline">Privacy Policy</button>. <span className="text-emerald-700 dark:text-[#D7FF35]">*</span>
                </label>
              </div>

              {/* Optional Marketing Consent */}
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-marketing"
                  checked={formData.marketing_consent}
                  onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-500 dark:focus:ring-[#D7FF35] bg-white dark:bg-[#041B15] border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <label htmlFor="chk-marketing" className="text-slate-600 dark:text-[#A7B9A8] leading-normal cursor-pointer">
                  Send periodic monthly civic waste digests and notifications (optional, one-click unsubscribe anytime).
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] disabled:opacity-50 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 mt-4 shadow-sm dark:shadow-glow-lime"
            >
              {loading ? (
                <span>Registering Household...</span>
              ) : (
                <>
                  <span>Create Account & Get QR Card</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        <div className="text-center text-xs text-slate-600 dark:text-[#A7B9A8] pt-2 border-t border-slate-200 dark:border-white/10">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-emerald-700 dark:text-[#D7FF35] hover:underline font-medium"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};

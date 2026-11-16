import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiClient } from '../services/api';

interface ForgotPasswordPageProps {
  navigate?: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ navigate }) => {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await apiClient.post('/auth/forgot-password', {
        identifier: identifier.trim(),
        portal: 'citizen',
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          t('auth.forgot_error') ||
          'Unable to process password reset request. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl">
        <button
          type="button"
          onClick={() => navigate?.('/login')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('auth.back_to_login') || 'Back to Login'}</span>
        </button>

        {submitted ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 border border-emerald-300 dark:border-[#D7FF35]/30 text-emerald-800 dark:text-[#D7FF35] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('auth.reset_link_dispatched') || 'Reset Instructions Dispatched'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
              {t('auth.reset_link_desc') ||
                'If an account matches that identifier, password reset instructions have been dispatched to your registered contact. The link remains valid for 30 minutes.'}
            </p>
            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => navigate?.('/login')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white border border-slate-200 dark:border-white/10 font-semibold text-xs uppercase tracking-wider transition"
              >
                {t('auth.return_to_login') || 'Return to Login'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-[#D7FF35]/15 border border-emerald-300 dark:border-[#D7FF35]/30 text-emerald-800 dark:text-[#D7FF35] flex items-center justify-center mb-3">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('auth.forgot_password_title') || 'Reset Your Password'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
                {t('auth.forgot_password_sub') ||
                  'Enter your BESCOM electricity meter number or registered email address to receive recovery instructions.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-xs font-medium text-slate-700 dark:text-[#A7B9A8] mb-1.5">
                {t('auth.meter_or_email') || 'BESCOM Meter Number or Registered Email'}
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. BESCOM-IND-XXXXXX or name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-[#A7B9A8]/40 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none transition shadow-sm dark:shadow-glow-lime flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white dark:border-[#041B15] border-t-transparent rounded-full animate-spin" />
                  <span>{t('action.processing') || 'Dispatching...'}</span>
                </>
              ) : (
                <span>{t('auth.send_reset_link') || 'Send Reset Link'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

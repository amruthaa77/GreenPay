import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiClient } from '../services/api';

interface ResetPasswordPageProps {
  navigate?: (path: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ navigate }) => {
  const { t } = useLanguage();
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage(t('auth.missing_token') || 'Password reset token is missing from URL.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(t('auth.pwd_length_err') || 'Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.pwd_mismatch') || 'Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          t('auth.reset_err') ||
          'Failed to reset password. The link may have expired or was already consumed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0D4935] border border-white/10 shadow-2xl">
        <button
          type="button"
          onClick={() => navigate?.('/login')}
          className="flex items-center gap-1.5 text-xs text-[#A7B9A8] hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('auth.back_to_login') || 'Back to Login'}</span>
        </button>

        {success ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t('auth.password_reset_success') || 'Password Updated'}
            </h2>
            <p className="text-xs text-[#A7B9A8] leading-relaxed">
              {t('auth.password_reset_success_desc') ||
                'Your GreenPay account password has been successfully updated. All active sessions have been terminated for security.'}
            </p>
            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate?.('/login')}
                className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs uppercase tracking-wider transition shadow-glow-lime"
              >
                {t('auth.proceed_to_login') || 'Proceed to Login'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">
                {t('auth.create_new_password') || 'Create New Password'}
              </h1>
              <p className="text-xs text-[#A7B9A8] mt-1">
                {t('auth.create_new_password_sub') ||
                  'Enter a strong new password with at least 8 characters.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-[#A7B9A8] mb-1.5">
                {t('auth.new_password') || 'New Password (min 8 characters)'}
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-[#D7FF35] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#A7B9A8] hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-[#A7B9A8] mb-1.5">
                {t('auth.confirm_password') || 'Confirm New Password'}
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D7FF35] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none transition shadow-glow-lime flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#041B15] border-t-transparent rounded-full animate-spin" />
                  <span>{t('action.saving') || 'Updating Password...'}</span>
                </>
              ) : (
                <span>{t('auth.update_password_btn') || 'Update Password'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

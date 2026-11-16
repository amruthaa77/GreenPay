import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Shield, KeyRound, Mail, AlertCircle, ArrowRight, Smartphone, RefreshCw, ArrowLeft } from 'lucide-react';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { login, challenge2FA, backendError, retryAuth } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA Challenge state
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [tempToken, setTempToken] = useState<string>('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requires_2fa && result.temp_token) {
        setTempToken(result.temp_token);
        setIs2FAPending(true);
      } else if (result.user) {
        if (result.user.role === 'SUPER_ADMIN') {
          navigate('/analytics');
        } else {
          navigate('/supervisor');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid administrator or supervisor credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await challenge2FA(
        tempToken,
        useRecoveryCode ? undefined : totpCode.trim(),
        useRecoveryCode ? recoveryCode.trim() : undefined
      );
      if (user.role === 'SUPER_ADMIN') {
        navigate('/analytics');
      } else {
        navigate('/supervisor');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code. Please check your authenticator clock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#041B15]">
      <div className="max-w-md w-full space-y-8 p-8 rounded-3xl bg-[#0D4935] border border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#D7FF35]/15 border border-[#D7FF35]/30 flex items-center justify-center mx-auto text-[#D7FF35]">
            {is2FAPending ? <Smartphone className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <span className="micro-label text-[#D7FF35]">MUNICIPAL OPERATIONS</span>
          <h1 className="text-2xl font-light text-white tracking-tight">
            {is2FAPending ? 'Two-Factor Authentication' : 'Admin & Supervisor Portal'}
          </h1>
          <p className="text-xs text-[#A7B9A8]">
            {is2FAPending
              ? 'Enter the 6-digit code from your authenticator app or use a recovery code.'
              : 'Secure access for authorized municipal field supervisors and platform administrators.'}
          </p>
        </div>

        {(error || backendError) && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span>{error || backendError}</span>
              {backendError && !error && (
                <button
                  type="button"
                  onClick={() => retryAuth()}
                  className="text-[#D7FF35] hover:underline text-[11px] font-bold ml-2 shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {is2FAPending ? (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            {!useRecoveryCode ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A7B9A8]" htmlFor="totp-input">
                  Authenticator 6-Digit Code
                </label>
                <input
                  id="totp-input"
                  type="text"
                  required
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-3 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-[#D7FF35]"
                  autoComplete="one-time-code"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A7B9A8]" htmlFor="recovery-input">
                  Single-Use Recovery Code
                </label>
                <input
                  id="recovery-input"
                  type="text"
                  required
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 4A8B-9C1D"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono text-center tracking-wider text-sm focus:outline-none focus:border-[#D7FF35]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!useRecoveryCode && totpCode.length < 6) || (useRecoveryCode && !recoveryCode.trim())}
              className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-glow-lime"
            >
              {loading ? <span>Verifying...</span> : <span>Verify & Authenticate</span>}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                className="text-[#D7FF35] hover:underline"
              >
                {useRecoveryCode ? 'Use Authenticator Code' : 'Use a Recovery Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIs2FAPending(false);
                  setTempToken('');
                  setTotpCode('');
                  setRecoveryCode('');
                  setError(null);
                }}
                className="text-[#A7B9A8] hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A7B9A8]" htmlFor="admin-email">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A7B9A8] absolute left-3 top-3" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="official@greenpay.blr"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A7B9A8]" htmlFor="admin-pass">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[11px] text-[#D7FF35] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A7B9A8] absolute left-3 top-3" />
                <input
                  id="admin-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-xs text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 mt-2 shadow-glow-lime"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Ops Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & Cookie Note */}
        <p className="text-[10px] text-[#A7B9A8]/70 text-center leading-relaxed">
          Admin portal sessions use isolated cookies (<code className="text-[#A7B9A8]">gp_admin_access</code>) and
          double-submit CSRF headers. Tokens are invalid on citizen endpoints.
        </p>
      </div>
    </div>
  );
};

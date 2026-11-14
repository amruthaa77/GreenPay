import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  ShieldCheck,
  Smartphone,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  LogOut,
  RefreshCw,
  Key
} from 'lucide-react';

interface TwoFAStatus {
  is_enabled: boolean;
  enrolled_at: string | null;
  recovery_codes_remaining?: number;
}

interface SessionItem {
  id?: string;
  session_id?: string;
  device_browser?: string;
  user_agent?: string;
  ip_address?: string;
  last_active_at?: string;
  is_current?: boolean;
}

export const AdminSettingsPage: React.FC = () => {
  const [twoFAStatus, setTwoFAStatus] = useState<TwoFAStatus | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading2FA, setLoading2FA] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Enrolment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrolSecret, setEnrolSecret] = useState('');
  const [enrolUri, setEnrolUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error2FA, setError2FA] = useState<string | null>(null);

  // Session revoking
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    load2FAStatus();
    loadSessions();
  }, []);

  const load2FAStatus = async () => {
    try {
      const data = await adminApi.admin.get2FAStatus();
      setTwoFAStatus(data);
    } catch (e: any) {
      console.error('Failed to load 2FA status:', e);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await adminApi.admin.getSessions();
      setSessions(data || []);
    } catch (e: any) {
      console.error('Failed to load sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleStartEnrol = async () => {
    setError2FA(null);
    setLoading2FA(true);
    try {
      const res = await adminApi.admin.enrol2FA();
      setEnrolSecret(res.secret);
      setEnrolUri(res.otpauth_url);
      setEnrolling(true);
    } catch (e: any) {
      setError2FA(e.message || 'Failed to start 2FA enrolment');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirmEnrol = async (e: React.FormEvent) => {
    e.preventDefault();
    setError2FA(null);
    setLoading2FA(true);
    try {
      const res = await adminApi.admin.verify2FA(verifyCode.trim());
      setRecoveryCodes(res.recovery_codes || []);
      setEnrolling(false);
      setVerifyCode('');
      await load2FAStatus();
    } catch (e: any) {
      setError2FA(e.message || 'Invalid 6-digit TOTP code');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Disable two-factor authentication?')) return;

    setError2FA(null);
    setLoading2FA(true);
    try {
      await adminApi.admin.disable2FA();
      await load2FAStatus();
      setRecoveryCodes(null);
    } catch (e: any) {
      setError2FA(e.message || 'Failed to disable 2FA');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await adminApi.admin.revokeSession(sessionId);
      await loadSessions();
    } catch (e: any) {
      console.error('Revoke session failed:', e);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('Revoke all other active supervisor & admin sessions?')) return;
    setRevokingAll(true);
    try {
      await adminApi.admin.revokeAllSessions();
      await loadSessions();
    } catch (e: any) {
      console.error('Revoke all failed:', e);
    } finally {
      setRevokingAll(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      alert('10 recovery codes copied to clipboard. Store in a secure vault.');
    }
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const blob = new Blob(
      [
        'GREENPAY MUNICIPAL OPERATIONS — 2FA BACKUP CODES\n',
        'Generated at: ' + new Date().toISOString() + '\n\n',
        recoveryCodes.join('\n'),
        '\n\nKeep these codes strictly private. Each code is single-use.',
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenpay_admin_2fa_recovery_codes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <span className="micro-label text-[#D7FF35]">OPERATIONS SECURITY CONTROLS</span>
        <h1 className="text-2xl font-light text-white tracking-tight">Admin & Supervisor Security</h1>
        <p className="text-xs text-[#A7B9A8] mt-1">
          Manage hardware-backed 2FA TOTP authentication, recovery codes, and active device sessions.
        </p>
      </div>

      {/* 2FA Enrolment Card */}
      <div className="p-6 rounded-3xl bg-[#0D4935] border border-white/10 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D7FF35]/15 border border-[#D7FF35]/30 flex items-center justify-center text-[#D7FF35]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Two-Factor Authentication (TOTP)</h2>
              <p className="text-xs text-[#A7B9A8]">
                Protect administrative operations with Google Authenticator, Authy, or compatible TOTP apps.
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
              twoFAStatus?.is_enabled
                ? 'bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30'
                : 'bg-white/10 text-[#A7B9A8] border border-white/10'
            }`}
          >
            {twoFAStatus?.is_enabled ? 'Active' : 'Disabled'}
          </span>
        </div>

        {error2FA && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error2FA}</span>
          </div>
        )}

        {/* Display Recovery Codes if freshly generated */}
        {recoveryCodes && (
          <div className="p-5 rounded-2xl bg-[#062B20] border border-[#D7FF35]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#D7FF35] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Save Your 10 Recovery Codes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyRecoveryCodes}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white flex items-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  type="button"
                  onClick={downloadRecoveryCodes}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white flex items-center gap-1 transition"
                >
                  <Download className="w-3 h-3" /> Download .txt
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#A7B9A8]">
              Each recovery code can only be used once. If you lose your authenticator device, these codes are the only way to regain access.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="p-2 rounded bg-[#041B15] border border-white/10 text-center text-white">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}

        {enrolling ? (
          <form onSubmit={handleConfirmEnrol} className="space-y-4 max-w-md bg-[#062B20] p-5 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs font-semibold text-white block mb-1">Step 1: Scan Key in Authenticator</span>
              <p className="text-[11px] text-[#A7B9A8] mb-2">
                Add this account in your Authenticator app using this base32 secret key:
              </p>
              <div className="p-2.5 rounded-xl bg-[#041B15] border border-white/10 font-mono text-center text-xs text-[#D7FF35] select-all">
                {enrolSecret}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-white block mb-1">Step 2: Enter Verification Code</span>
              <input
                type="text"
                required
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/15 text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-[#D7FF35]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading2FA || verifyCode.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition shadow-glow-lime"
              >
                {loading2FA ? 'Verifying...' : 'Enable 2FA'}
              </button>
              <button
                type="button"
                onClick={() => setEnrolling(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#A7B9A8] text-xs transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#A7B9A8]">
              {twoFAStatus?.is_enabled
                ? `Active since ${new Date(twoFAStatus.enrolled_at || Date.now()).toLocaleDateString()}`
                : 'Enrol now to enforce TOTP verification upon every login.'}
            </p>

            {twoFAStatus?.is_enabled ? (
              <button
                type="button"
                onClick={handleDisable2FA}
                disabled={loading2FA}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartEnrol}
                disabled={loading2FA}
                className="px-4 py-2.5 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs uppercase tracking-wider transition shadow-glow-lime"
              >
                Set Up Two-Factor Authentication
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Sessions Manager */}
      <div className="p-6 rounded-3xl bg-[#0D4935] border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D7FF35]/15 border border-[#D7FF35]/30 flex items-center justify-center text-[#D7FF35]">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Active Administrator Sessions</h2>
              <p className="text-xs text-[#A7B9A8]">
                View all active browser sessions with authorized municipal tokens.
              </p>
            </div>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
            >
              {revokingAll ? 'Revoking...' : 'Revoke All Other Sessions'}
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#A7B9A8]/70">No active sessions found.</div>
          ) : (
            sessions.map((s, idx) => {
              const sid = s.session_id || s.id || String(idx);
              return (
                <div
                  key={sid}
                  className="p-3.5 rounded-2xl bg-[#062B20] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#041B15] flex items-center justify-center text-[#A7B9A8]">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-white font-medium block">
                        {s.device_browser || s.user_agent || 'Admin Console Session'}
                        {(s.is_current || idx === 0) && (
                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30">
                            Current Session
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-[#A7B9A8] font-mono">
                        IP: {s.ip_address || 'Localhost'} • Last active:{' '}
                        {s.last_active_at ? new Date(s.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sid)}
                    disabled={revokingId === sid}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#A7B9A8] hover:text-rose-300 border border-white/10 text-xs transition disabled:opacity-40"
                  >
                    {revokingId === sid ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

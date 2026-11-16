import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {
  Shield,
  Mail,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  FileText,
  Phone,
  Bell,
  Laptop,
  Check,
  X,
  Clock,
  Info
} from 'lucide-react';

interface CitizenSettingsPageProps {
  navigate: (path: string) => void;
}

export const CitizenSettingsPage: React.FC<CitizenSettingsPageProps> = ({ navigate }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsConsent, setSmsConsent] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Notification Preferences state
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { in_app: boolean; email: boolean; sms: boolean }>>({});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Active Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Email Marketing state
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  // Export Data state
  const [exporting, setExporting] = useState(false);

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const loadData = async () => {
    try {
      const prof = await api.citizen.getProfile();
      setProfile(prof);
      setMarketingEmail(prof.email_marketing_opt_in ?? false);
      if (prof.phone_number) {
        setPhoneNumber(prof.phone_number);
      }
    } catch {}

    try {
      const prefsRes = await api.citizen.getNotificationPreferences();
      if (prefsRes?.preferences) {
        setNotifPrefs(prefsRes.preferences);
      }
    } catch {}

    try {
      const sessRes = await api.citizen.getSessions();
      if (Array.isArray(sessRes)) {
        setSessions(sessRes);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber.trim()) return;

    setSendingOtp(true);
    setPhoneError(null);
    setPhoneMessage(null);
    try {
      const res = await api.citizen.sendPhoneOtp(phoneNumber.trim(), smsConsent);
      setOtpSent(true);
      setCooldown(60);
      setPhoneMessage(res.message || 'Verification code sent to your phone.');
    } catch (err: any) {
      setPhoneError(err.message || 'Failed to send OTP. Please check the phone number.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setVerifyingOtp(true);
    setPhoneError(null);
    try {
      const res = await api.citizen.verifyPhoneOtp(otp.trim());
      setPhoneMessage(res.message);
      setOtpSent(false);
      setOtp('');
      await loadData();
    } catch (err: any) {
      setPhoneError(err.message || 'Incorrect verification code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleUpdatePreferences = async (newVal: boolean) => {
    setSavingEmail(true);
    setEmailSaved(false);
    try {
      await api.citizen.updateEmailPreferences(newVal);
      setMarketingEmail(newVal);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update email preferences');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTogglePref = (category: string, channel: 'in_app' | 'email' | 'sms') => {
    setNotifPrefs((prev) => {
      const current = prev[category] || { in_app: true, email: true, sms: false };
      return {
        ...prev,
        [category]: {
          ...current,
          [channel]: !current[channel],
        },
      };
    });
  };

  const handleSaveNotifPrefs = async () => {
    setSavingPrefs(true);
    setPrefsSaved(false);
    try {
      await api.citizen.updateNotificationPreferences(notifPrefs);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to save notification preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      await api.citizen.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch (e: any) {
      alert(e.message || 'Failed to revoke session');
    } finally {
      setRevokingSession(null);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await api.citizen.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenpay_export_${user?.greenpay_id || 'citizen'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Failed to export citizen data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type DELETE MY ACCOUNT exactly as shown.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.citizen.deleteAccount(deleteConfirmText);
      await logout();
      navigate('/login');
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const categories = [
    { key: 'COLLECTION_LOGGED', label: t('notif_cat.collection') || 'Collection Logged Receipts' },
    { key: 'CREDITS_MODIFIED', label: t('notif_cat.credits') || 'Green Credits Ledger Updates' },
    { key: 'TICKET_UPDATE', label: t('notif_cat.disputes') || 'Grievance & Dispute Updates' },
    { key: 'SCHEDULE_CHANGE', label: t('notif_cat.schedules') || 'Ward Pickup Schedule Alerts' },
    { key: 'REMINDER', label: t('notif_cat.reminders') || 'Segregation & Collection Reminders' },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 text-slate-900 dark:text-[#F4F7F0]">
      {/* Page Title */}
      <div>
        <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">DPDP ACT 2023 COMPLIANCE & CONTROLS</span>
        <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
          Citizen Privacy & Security Settings
        </h1>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
          Manage your verified contact channels, notification preferences, active sessions, and privacy controls.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-slate-900 dark:text-white">{profile?.name || user?.name}</h2>
              <p className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">ID: {user?.greenpay_id}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              profile?.status === 'ACTIVE' || user?.status === 'ACTIVE'
                ? 'bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
            }`}
          >
            {profile?.status || user?.status || 'PENDING'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <span className="text-slate-500 dark:text-[#A7B9A8] block mb-0.5">Assigned Ward</span>
            <span className="font-medium text-slate-900 dark:text-white">{profile?.ward_name || user?.ward_name || 'Koramangala'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-[#A7B9A8] block mb-0.5">Electricity Meter</span>
            <span className="font-mono text-slate-900 dark:text-white">{profile?.masked_meter || user?.masked_meter || 'BES-••••-4921'}</span>
            <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70 block">AES-256 encrypted in storage</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-[#A7B9A8] block mb-0.5">Account Status</span>
            <span className="font-medium text-emerald-700 dark:text-[#D7FF35] flex items-center gap-1 font-mono">
              <UserCheck className="w-3.5 h-3.5" />
              {profile?.status === 'ACTIVE' || user?.status === 'ACTIVE'
                ? 'Active (Doorstep/Phone Verified)'
                : 'Pending Verification'}
            </span>
          </div>
        </div>
      </div>

      {/* Phone OTP Verification Card (Phase A - Identity & Alternative Pending Activation) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Verified Mobile Contact & Identity Binding</h2>
          </div>
          {profile?.phone_number && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Verified
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          In accordance with identity binding regulations, new accounts are pending until confirmed either at first doorstep collection
          or via cryptographic Phone OTP. Verified phone numbers also enable transactional SMS notices.
        </p>

        {phoneMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-[#D7FF35]/15 border border-emerald-300 dark:border-[#D7FF35]/30 text-emerald-900 dark:text-[#D7FF35] text-xs flex items-center gap-2 font-mono">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{phoneMessage}</span>
          </div>
        )}

        {phoneError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{phoneError}</span>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="phone-input" className="block text-xs font-medium text-slate-700 dark:text-[#A7B9A8] mb-1.5">
                Indian Mobile Number (+91)
              </label>
              <div className="flex gap-2">
                <input
                  id="phone-input"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-[#F4F7F0] text-xs placeholder:text-slate-400 dark:placeholder:text-[#A7B9A8]/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                />
                <button
                  type="submit"
                  disabled={sendingOtp || cooldown > 0 || !phoneNumber.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none transition shadow-sm dark:shadow-glow-lime"
                >
                  {sendingOtp ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : 'Send OTP'}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#041B15] text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
              />
              <span className="text-[11px] text-slate-600 dark:text-[#A7B9A8] leading-tight">
                I explicitly consent to receive transactional SMS notices for doorstep collections, weighment confirmations, and security codes.
              </span>
            </label>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-md bg-slate-50 dark:bg-[#062B20]/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <label htmlFor="otp-input" className="block text-xs font-medium text-slate-900 dark:text-[#F4F7F0] mb-1.5">
                Enter 6-digit verification code sent to {phoneNumber}
              </label>
              <input
                id="otp-input"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-[#F4F7F0] font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={verifyingOtp || otp.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition shadow-sm dark:shadow-glow-lime"
              >
                {verifyingOtp ? 'Verifying...' : 'Confirm & Activate'}
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || sendingOtp}
                onClick={() => handleSendOtp()}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-[#A7B9A8] border border-slate-200 dark:border-white/10 text-xs disabled:opacity-40 transition"
              >
                {cooldown > 0 ? `${cooldown}s` : 'Resend'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Multi-Channel Notification Preferences Matrix (Phase A) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-5 shadow-sm dark:shadow-card-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
            <h2 className="text-base font-medium text-slate-900 dark:text-[#F4F7F0]">Notification Preferences Matrix</h2>
          </div>
          {prefsSaved && (
            <span className="text-xs text-emerald-700 dark:text-[#D7FF35] flex items-center gap-1 animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          Configure which channels you wish to receive notifications through. Security notices are always dispatched in-app and by email for safety.
        </p>

        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-white/5">
          <div className="grid grid-cols-12 bg-slate-100 dark:bg-[#062B20]/60 px-4 py-2.5 text-[11px] font-mono text-slate-700 dark:text-[#A7B9A8] uppercase tracking-wider">
            <div className="col-span-6 sm:col-span-7">Category</div>
            <div className="col-span-2 text-center">In-App</div>
            <div className="col-span-2 text-center">Email</div>
            <div className="col-span-2 sm:col-span-1 text-center">SMS</div>
          </div>

          {categories.map((cat) => {
            const p = notifPrefs[cat.key] || { in_app: true, email: true, sms: false };
            return (
              <div key={cat.key} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] text-xs">
                <div className="col-span-6 sm:col-span-7 pr-2">
                  <span className="text-slate-900 dark:text-white font-medium block">{cat.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8] font-mono">{cat.key}</span>
                </div>
                <div className="col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={p.in_app}
                    onChange={() => handleTogglePref(cat.key, 'in_app')}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#041B15] text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={p.email}
                    onChange={() => handleTogglePref(cat.key, 'email')}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#041B15] text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-600 dark:focus:ring-[#D7FF35]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={p.sms}
                    disabled={!profile?.phone_number}
                    onChange={() => handleTogglePref(cat.key, 'sms')}
                    title={!profile?.phone_number ? 'Verify phone number first to enable SMS' : ''}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-[#041B15] text-emerald-600 dark:text-[#D7FF35] focus:ring-emerald-600 dark:focus:ring-[#D7FF35] disabled:opacity-30"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">
            SMS notices require an active verified phone number.
          </span>
          <button
            type="button"
            onClick={handleSaveNotifPrefs}
            disabled={savingPrefs}
            className="px-4 py-2 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs disabled:opacity-50 transition shadow-sm dark:shadow-glow-lime"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Active Sessions Manager (Phase A) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-4 shadow-sm dark:shadow-card-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
            <h2 className="text-base font-medium text-slate-900 dark:text-[#F4F7F0]">Active Sessions & Devices</h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">
            {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          Manage your active GreenPay web sessions. If you suspect unauthorized access or lost a device, revoke that session immediately.
        </p>

        <div className="space-y-2.5 pt-2">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-[#A7B9A8]">No active remote sessions detected.</div>
          ) : (
            sessions.map((s, idx) => (
              <div
                key={s.session_id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-[#041B15] flex items-center justify-center text-slate-700 dark:text-[#A7B9A8]">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium block">
                      {s.device_browser || 'Web Browser'}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-200 dark:border-[#D7FF35]/30">
                          Current Device
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#A7B9A8] font-mono">
                      IP: {s.ip_address || 'Localhost'} • Last active: {new Date(s.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevokeSession(s.session_id)}
                  disabled={revokingSession === s.session_id}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/20 text-slate-600 dark:text-[#A7B9A8] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 text-xs transition disabled:opacity-40"
                >
                  {revokingSession === s.session_id ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Marketing Opt-In */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-5 shadow-sm dark:shadow-card-dark">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
          <h2 className="text-base font-medium text-slate-900 dark:text-[#F4F7F0]">Email Preference Centre</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          In compliance with the Digital Personal Data Protection Act 2023, you have full control over non-essential communications.
          Essential transactional notices (such as doorstep waste receipts and account security notices) cannot be disabled.
        </p>

        <div className="space-y-4 pt-2">
          {/* Essential Notices (Locked ON) */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-900 dark:text-[#F4F7F0] flex items-center gap-1.5">
                <span>Transactional Notices & Collection Receipts</span>
                <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-[#A7B9A8]" />
              </span>
              <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">
                Doorstep collection weighment logs, password resets, and identity activation receipts.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 dark:text-[#A7B9A8] uppercase px-2.5 py-1 rounded bg-slate-200 dark:bg-black/40">
              Required
            </span>
          </div>

          {/* Marketing / Tips Opt-In */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-900 dark:text-[#F4F7F0]">
                Monthly Sustainability Digests & Ward Benchmarks
              </span>
              <p className="text-[11px] text-slate-500 dark:text-[#A7B9A8]">
                Monthly segregation summaries, seasonal zero-waste tips, and neighbourhood benchmark updates.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={marketingEmail}
              disabled={savingEmail}
              onClick={() => handleUpdatePreferences(!marketingEmail)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-[#D7FF35] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0D4935] ${
                marketingEmail ? 'bg-emerald-600 dark:bg-[#D7FF35]' : 'bg-slate-300 dark:bg-[#062B20]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  marketingEmail ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {emailSaved && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-[#D7FF35] bg-emerald-50 dark:bg-[#D7FF35]/10 p-3 rounded-xl border border-emerald-300 dark:border-[#D7FF35]/30">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8] flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5">
          <span>Local mail catcher active in development environment.</span>
          <span className="font-mono">Unsubscribe tokens generated per DPDP Sec 6</span>
        </div>
      </div>

      {/* Data Portability (DPDP Section 11) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 space-y-4 shadow-sm dark:shadow-card-dark">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
          <h2 className="text-base font-medium text-slate-900 dark:text-[#F4F7F0]">Right to Data Portability (DPDP Act Sec. 11)</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          You are legally entitled to download a machine-readable copy of all personal data, consent logs,
          collection history, and credit records held by GreenPay.
        </p>
        <div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-white/10 transition"
          >
            <Download className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
            <span>{exporting ? 'Generating JSON...' : 'Export All My Data (JSON)'}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Account Deletion (Amendment #2) */}
      <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-red-950/20 border border-rose-300 dark:border-red-500/30 space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-semibold">Danger Zone: Account Deletion & Erasure</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
          Pursuant to DPDP Act Section 12, requesting account deletion will permanently scrub and anonymize your
          Personally Identifiable Information (name, electricity meter number, email, and phone).
        </p>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#062B20]/80 border border-rose-200 dark:border-red-500/20 text-slate-600 dark:text-[#A7B9A8] text-xs space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Pseudonymisation Retention Notice (Amendment #2)</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            In accordance with municipal audit requirements and database immutability triggers, past verified collection
            records and civic credit ledger rows are strictly preserved under a random pseudonym (<code className="font-mono text-slate-900 dark:text-white">ANON-UUID</code>).
            No person, including municipal auditors, can link those historical rows back to your real identity once deleted.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-red-600/20 dark:hover:bg-red-600/30 dark:text-red-300 border border-rose-300 dark:border-red-500/40 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Request Account Deletion & Anonymisation</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#062B20] border border-rose-300 dark:border-red-500/40 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-700 dark:text-red-400 border-b border-slate-200 dark:border-white/10 pb-4">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-light text-slate-900 dark:text-white">Confirm Account Erasure</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
              This action cannot be undone. All your personal profile information will be wiped immediately.
              To confirm, type <strong className="font-mono text-slate-900 dark:text-white">DELETE MY ACCOUNT</strong> in the field below:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/20 text-xs text-slate-900 dark:text-[#F4F7F0] placeholder-slate-400 dark:placeholder-[#A7B9A8]/50 focus:outline-none focus:border-rose-500 font-mono"
              />
              {deleteError && (
                <p className="text-xs text-rose-600 dark:text-red-400">{deleteError}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-[#A7B9A8] text-xs font-medium border border-slate-200 dark:border-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition"
              >
                {deleting ? 'Erasing...' : 'Erase My Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { Mail, Plus, Copy, Check, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export const SupervisorInvitesPage: React.FC = () => {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [wardName, setWardName] = useState('Koramangala');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Newly created invite link
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const list = await adminApi.admin.getInvites();
      setInvites(list);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await adminApi.admin.createInvite({
        assigned_ward_name: wardName,
        name: name.trim(),
        email: email.trim(),
      });
      setNewInviteUrl(res.invite_url);
      setName('');
      setEmail('');
      loadInvites();
    } catch (err: any) {
      setError(err.message || 'Failed to create supervisor invitation.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (newInviteUrl) {
      navigator.clipboard.writeText(newInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">SUPERVISOR GOVERNANCE</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Municipal Supervisor Invitations
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            Issue cryptographically secure, single-use invitation tokens with a strict 48-hour expiration.
            Static invitation codes are strictly prohibited.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateModalOpen(true);
            setNewInviteUrl(null);
            setError(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition shadow-sm dark:shadow-glow-lime"
        >
          <Plus className="w-4 h-4" />
          <span>Invite New Supervisor</span>
        </button>
      </div>

      {/* Table of Issued Invites */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-700 dark:text-[#A7B9A8]">
            Active & Historical Supervisor Invitations
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]/70">SHA-256 Hashed Tokens</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-600 dark:text-[#A7B9A8]">
            <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono">Loading invitation audit list...</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="p-16 text-center text-slate-600 dark:text-[#A7B9A8]">
            <p className="text-sm font-medium text-slate-900 dark:text-white">No supervisor invites issued yet</p>
            <p className="text-xs mt-1">Click "Invite New Supervisor" to generate a single-use token.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 dark:text-[#F4F7F0]">
              <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Supervisor Name</th>
                  <th scope="col" className="px-6 py-3.5">Email</th>
                  <th scope="col" className="px-6 py-3.5">Assigned Ward</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{inv.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-800 dark:text-[#F4F7F0]">{inv.email}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-[#A7B9A8]">{inv.assigned_ward_name}</td>
                    <td className="px-6 py-4">
                      {inv.used ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-[#062B20] text-slate-600 dark:text-[#A7B9A8] border border-slate-200 dark:border-white/10">
                          USED / ACTIVATED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30">
                          ACTIVE / PENDING
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-[#A7B9A8] text-[11px]">
                      {new Date(inv.expires_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invite Modal */}
      {createModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/15 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" />
                <h3 className="text-lg font-light text-slate-900 dark:text-white">Generate Supervisor Invite</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white text-xs font-mono"
              >
                &times; Close
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!newInviteUrl ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-[#F4F7F0]" htmlFor="inv-name">
                    Supervisor Full Name
                  </label>
                  <input
                    id="inv-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Suresh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-[#F4F7F0]" htmlFor="inv-email">
                    Official Email Address
                  </label>
                  <input
                    id="inv-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="suresh.supervisor@greenpay.blr"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-[#F4F7F0]" htmlFor="inv-ward">
                    Assigned Bengaluru Ward
                  </label>
                  <select
                    id="inv-ward"
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                  >
                    <option value="Koramangala">Koramangala</option>
                    <option value="Indiranagar">Indiranagar</option>
                    <option value="Jayanagar">Jayanagar</option>
                    <option value="Whitefield">Whitefield</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs tracking-wider uppercase transition mt-2 shadow-sm dark:shadow-glow-lime"
                >
                  {creating ? 'Generating Token...' : 'Generate 48h Single-Use Invite Token'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#D7FF35]/10 border border-emerald-300 dark:border-[#D7FF35]/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-[#D7FF35] font-semibold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Single-Use Invitation Generated!</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-[#F4F7F0] leading-relaxed">
                    Copy and send this unique onboarding link to the supervisor. It expires in 48 hours and can only be used once.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8] uppercase">Onboarding Link</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newInviteUrl}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setNewInviteUrl(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-medium transition"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

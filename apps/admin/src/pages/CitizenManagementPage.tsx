import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Lock,
  Scale,
  ShoppingBag,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  UserCheck,
  UserX,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';

interface CitizenItem {
  id: string;
  greenpay_id: string | null;
  name: string;
  email: string | null;
  phone_number: string | null;
  masked_meter: string;
  ward_id: string | null;
  ward_name: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  available_balance: number;
  total_earned: number;
  total_redeemed: number;
  collections_count: number;
  redemptions_count: number;
  registered_at: string | null;
}

export const CitizenManagementPage: React.FC = () => {
  const [citizens, setCitizens] = useState<CitizenItem[]>([]);
  const [total, setTotal] = useState(0);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dossier Modal
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Status Action
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCitizens = async () => {
    try {
      setLoading(true);
      const res = await adminApi.admin.getCitizens({
        search: searchQuery || undefined,
        ward_id: wardFilter !== 'ALL' ? wardFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 100,
      });
      setCitizens(res.citizens);
      setTotal(res.total);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to load citizens.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminApi.admin.getWards().then(setWards).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCitizens();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, wardFilter, statusFilter]);

  const handleOpenDossier = async (citizenId: string) => {
    try {
      setSelectedCitizenId(citizenId);
      setDossierLoading(true);
      const data = await adminApi.admin.getCitizenDetail(citizenId);
      setDossier(data);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to load citizen dossier.' });
      setSelectedCitizenId(null);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleToggleStatus = async (citizen: CitizenItem) => {
    const targetStatus = citizen.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmText = targetStatus === 'SUSPENDED'
      ? `Suspend citizen account for ${citizen.name}? They will not be able to log in or earn points.`
      : `Reactivate citizen account for ${citizen.name}?`;

    if (!window.confirm(confirmText)) return;

    try {
      setActionLoading(true);
      await adminApi.admin.updateCitizenStatus(citizen.id, {
        status: targetStatus,
        reason: targetStatus === 'SUSPENDED' ? 'Administrative suspension' : 'Account reactivated by Super Admin',
      });
      setToastMessage({
        type: 'success',
        text: `Citizen ${citizen.name} status updated to ${targetStatus}.`,
      });
      await fetchCitizens();
      if (selectedCitizenId === citizen.id) {
        const refreshed = await adminApi.admin.getCitizenDetail(citizen.id);
        setDossier(refreshed);
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to update citizen status.' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const totalPointsInCirculation = citizens.reduce((acc, c) => acc + c.available_balance, 0);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border ${
            toastMessage.type === 'success'
              ? 'bg-[#0D4935] border-[#D7FF35]/40 text-[#D7FF35]'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-xs font-mono">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="micro-label text-[#D7FF35]">GOVERNANCE & HOUSEHOLD OVERSIGHT</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
              IMMUTABLE LEDGER VERIFIED
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-white tracking-tight mt-1">
            Citizen & Household Management
          </h1>
          <p className="text-xs text-[#A7B9A8] mt-1">
            Authoritative citizen registries, masked BESCOM meters, ward bindings, and read-only Green Points balances.
          </p>
        </div>

        <button
          onClick={fetchCitizens}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-neutral-300 text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D7FF35]' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0D4935]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#A7B9A8] tracking-wider">Registered Citizens</span>
          <div className="text-2xl font-light text-white flex items-baseline gap-2">
            <span>{total.toLocaleString()}</span>
            <span className="text-xs font-mono text-emerald-400">households</span>
          </div>
          <p className="text-[11px] text-[#A7B9A8]">Across {wards.length} pilot Bengaluru wards</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D4935]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#A7B9A8] tracking-wider">Active Status</span>
          <div className="text-2xl font-light text-white flex items-baseline gap-2">
            <span>{citizens.filter(c => c.status === 'ACTIVE').length}</span>
            <span className="text-xs font-mono text-[#D7FF35]">verified KYC</span>
          </div>
          <p className="text-[11px] text-[#A7B9A8]">Authorized to earn and redeem</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D4935]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#A7B9A8] tracking-wider">Pending Activation</span>
          <div className="text-2xl font-light text-white flex items-baseline gap-2">
            <span>{citizens.filter(c => c.status === 'PENDING').length}</span>
            <span className="text-xs font-mono text-amber-400">pending phone OTP</span>
          </div>
          <p className="text-[11px] text-[#A7B9A8]">Requires doorstep verification</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D4935]/80 border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#A7B9A8] tracking-wider">Total GP Held in Balance</span>
          <div className="text-2xl font-light text-white flex items-baseline gap-2">
            <span>{Math.round(totalPointsInCirculation).toLocaleString()}</span>
            <span className="text-xs font-mono text-[#D7FF35]">GP</span>
          </div>
          <p className="text-[11px] text-[#A7B9A8]">Strictly ledger-backed liability</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#062B20] border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A7B9A8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search citizen name, GP-ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#D7FF35]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Ward filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] text-[#A7B9A8] font-mono shrink-0">Ward:</span>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D7FF35]"
            >
              <option value="ALL">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] text-[#A7B9A8] font-mono shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D7FF35]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Citizen Table */}
      <div className="rounded-3xl bg-[#0D4935]/40 border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-[10px] font-mono uppercase tracking-wider text-[#A7B9A8]">
                <th className="py-3.5 px-4">Citizen / QR ID</th>
                <th className="py-3.5 px-4">Resident & Meter</th>
                <th className="py-3.5 px-4">Ward</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Authentic GP Balance</th>
                <th className="py-3.5 px-4 text-center">Collections</th>
                <th className="py-3.5 px-4 text-center">Redemptions</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-neutral-300">
              {citizens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 font-mono text-xs">
                    {loading ? 'Querying verified citizen ledger...' : 'No citizens found matching current criteria.'}
                  </td>
                </tr>
              ) : (
                citizens.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#D7FF35] bg-[#D7FF35]/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-[#D7FF35]/20">
                          {c.greenpay_id || 'GP-PENDING'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="font-mono text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-neutral-500">Meter:</span>
                        <span>{c.masked_meter}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-neutral-300">
                        {c.ward_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : c.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#D7FF35]">
                        <span title="Read-only: ledger verified">
                          <Lock className="w-3 h-3 text-[#A7B9A8]" />
                        </span>
                        <span>{c.available_balance.toFixed(1)} GP</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        +{c.total_earned.toFixed(0)} earned • -{c.total_redeemed.toFixed(0)} spent
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-white font-medium">{c.collections_count}</span>
                      <span className="text-neutral-500 text-[10px] ml-1">logged</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-white font-medium">{c.redemptions_count}</span>
                      <span className="text-neutral-500 text-[10px] ml-1">orders</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDossier(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-mono transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-[#D7FF35]" />
                          <span>Dossier</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          disabled={actionLoading}
                          title={c.status === 'ACTIVE' ? 'Suspend Citizen' : 'Activate Citizen'}
                          className={`p-1 rounded-lg border transition ${
                            c.status === 'ACTIVE'
                              ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Citizen Dossier Modal */}
      {selectedCitizenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#062B20] border border-white/20 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setSelectedCitizenId(null); setDossier(null); }}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {dossierLoading || !dossier ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-[#D7FF35] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-[#A7B9A8]">Compiling authentic citizen dossier...</span>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="micro-label text-[#D7FF35]">MUNICIPAL RESIDENT DOSSIER</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-white">
                      {dossier.greenpay_id || 'GP-PENDING'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-light text-white">{dossier.name}</h2>
                  <p className="text-xs text-[#A7B9A8] font-mono">
                    Ward: {dossier.ward_name} &bull; Meter: {dossier.masked_meter} &bull; Status: {dossier.status}
                  </p>
                </div>

                {/* Ledger Protection Notice */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-[#D7FF35]/30 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#D7FF35] shrink-0 mt-0.5" />
                  <div className="text-[11px] font-mono text-[#A7B9A8] space-y-0.5">
                    <span className="text-white font-semibold">Ledger Protection Enforcement</span>
                    <p>{dossier.balance.verification_note}</p>
                  </div>
                </div>

                {/* Verified Balance Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-[#A7B9A8]">Current Balance</span>
                    <div className="text-xl font-bold font-mono text-[#D7FF35] mt-1">
                      {dossier.balance.current_balance.toFixed(1)} GP
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-[#A7B9A8]">Lifetime Earned</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      +{dossier.balance.total_earned.toFixed(1)} GP
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-[#A7B9A8]">Lifetime Redeemed</span>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                      -{dossier.balance.total_redeemed.toFixed(1)} GP
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-[10px] font-mono uppercase text-[#A7B9A8]">Total Dry Waste</span>
                    <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {dossier.balance.total_weight_kg.toFixed(1)} kg
                    </div>
                  </div>
                </div>

                {/* Recent Collections */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-[#D7FF35]" />
                      Verified Dry-Waste Collections ({dossier.recent_collections.length})
                    </span>
                  </div>
                  {dossier.recent_collections.length === 0 ? (
                    <p className="text-xs font-mono text-neutral-500 py-4 text-center bg-black/20 rounded-xl">
                      No collections recorded for this citizen yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {dossier.recent_collections.map((col: any) => (
                        <div key={col.id} className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[#D7FF35] font-semibold">{col.transaction_id}</span>
                            <span className="text-[11px] text-neutral-400 ml-2">{col.collection_date}</span>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              Supervisor: {col.supervisor_name} &bull; Total: {col.total_weight_kg.toFixed(2)} kg
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {col.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Grocery Redemptions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#D7FF35]" />
                      Grocery Redemptions ({dossier.recent_redemptions.length})
                    </span>
                  </div>
                  {dossier.recent_redemptions.length === 0 ? (
                    <p className="text-xs font-mono text-neutral-500 py-4 text-center bg-black/20 rounded-xl">
                      No grocery redemptions placed yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {dossier.recent_redemptions.map((red: any) => (
                        <div key={red.id} className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono text-white font-semibold">{red.item_title}</span>
                            <span className="text-[11px] text-neutral-400 ml-2">Qty: {red.item_quantity}</span>
                            <div className="font-mono text-[10px] text-[#A7B9A8] mt-0.5">
                              Ref: {red.redemption_reference} &bull; {red.created_at}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-amber-400 font-semibold">-{red.credits_spent} GP</span>
                            <div className="text-[10px] font-mono text-emerald-400">{red.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

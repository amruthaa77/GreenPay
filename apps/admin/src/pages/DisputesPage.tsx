import React, { useEffect, useState } from 'react';
import { adminApi, api } from '../services/api';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Camera,
  Scale,
  RefreshCw,
  X,
  Send,
  AlertCircle
} from 'lucide-react';

interface DisputeItem {
  id: string;
  ticket_number: string;
  category: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'RESOLVED_UPHELD' | 'RESOLVED_REJECTED';
  points_adjustment: number;
  resolution_notes?: string;
  has_photo: boolean;
  retention_until: string;
  citizen_response?: string;
  created_at: string;
  updated_at: string;
  weighment?: {
    id: string;
    transaction_id: string;
    total_weight_kg: number;
    wet_kg: number;
    dry_kg: number;
    collection_date: string;
  };
}

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);

  // Resolution drawer state
  const [actionDecision, setActionDecision] = useState<'UPHOLD' | 'REJECT' | 'REQUEST_INFO'>('UPHOLD');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoConfirming, setAutoConfirming] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const data = await adminApi.admin.getDisputes();
      setDisputes(data);
    } catch (err) {
      console.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    try {
      setSubmitting(true);
      await adminApi.admin.resolveDispute(
        selectedDispute.id,
        actionDecision,
        resolutionNotes.trim(),
        actionDecision === 'UPHOLD' ? pointsAdjustment : 0
      );

      setToastMessage(`Dispute ${selectedDispute.ticket_number} resolved: ${actionDecision}`);
      setSelectedDispute(null);
      setResolutionNotes('');
      setPointsAdjustment(0);
      await fetchDisputes();
    } catch (err: any) {
      alert(err.message || 'Failed to submit resolution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAutoConfirm = async () => {
    try {
      setAutoConfirming(true);
      const res = await adminApi.admin.autoConfirmWeighments();
      setToastMessage(res.message || `Auto-confirmed ${res.auto_confirmed_count || 0} weighments.`);
      await fetchDisputes();
    } catch (err: any) {
      alert(err.message || 'Failed to run auto-confirm');
    } finally {
      setAutoConfirming(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    const matchesFilter = statusFilter === 'ALL' || d.status === statusFilter;
    if (!matchesFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.ticket_number.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      (d.weighment?.transaction_id && d.weighment.transaction_id.toLowerCase().includes(q))
    );
  });

  const counts = {
    open: disputes.filter((d) => d.status === 'OPEN').length,
    underReview: disputes.filter((d) => d.status === 'UNDER_REVIEW').length,
    infoRequested: disputes.filter((d) => d.status === 'INFO_REQUESTED').length,
    resolvedUpheld: disputes.filter((d) => d.status === 'RESOLVED_UPHELD').length,
    resolvedRejected: disputes.filter((d) => d.status === 'RESOLVED_REJECTED').length,
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[#D7FF35] text-[#041B15] font-bold text-xs shadow-glow-lime flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="micro-label text-amber-400">MUNICIPAL GOVERNANCE</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Dispute Review & Resolution Queue
              </h1>
            </div>
          </div>
          <p className="text-xs text-[#A7B9A8] mt-1">
            Review citizen weighment appeals, investigate scale discrepancies, and issue append-only ledger adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTriggerAutoConfirm}
            disabled={autoConfirming}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#F4F7F0] hover:text-white transition font-medium"
            title="Runs automatic confirmation for weighments past the 7-day dispute window"
          >
            <Clock className={`w-3.5 h-3.5 ${autoConfirming ? 'animate-spin' : ''}`} />
            <span>{autoConfirming ? 'Confirming...' : 'Run 7-Day Auto-Confirm'}</span>
          </button>
          <button
            type="button"
            onClick={fetchDisputes}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F4F7F0] hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0D4935] border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#A7B9A8]">Open Tickets</span>
          <p className="text-2xl font-bold text-amber-400">{counts.open}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D4935] border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#A7B9A8]">Under Review</span>
          <p className="text-2xl font-bold text-blue-400">{counts.underReview}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D4935] border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#A7B9A8]">Info Requested</span>
          <p className="text-2xl font-bold text-rose-400">{counts.infoRequested}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#0D4935] border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#A7B9A8]">Resolved Upheld</span>
          <p className="text-2xl font-bold text-[#D7FF35]">{counts.resolvedUpheld}</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'OPEN', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RESOLVED_UPHELD', 'RESOLVED_REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                statusFilter === st
                  ? 'bg-[#D7FF35] text-[#041B15] font-bold shadow-glow-lime'
                  : 'bg-[#041B15] text-[#A7B9A8] hover:text-white border border-white/10'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#A7B9A8]/60 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket # or notes..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#041B15] border border-white/10 text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35]"
          />
        </div>
      </div>

      {/* Disputes Table */}
      <div className="rounded-3xl bg-[#0D4935] border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-[#A7B9A8]">
            Loading municipal dispute queue...
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#A7B9A8]/50 mx-auto" />
            <p className="text-xs text-[#A7B9A8] font-mono">No disputes match current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#062B20] border-b border-white/10 text-[#A7B9A8] text-[11px] uppercase">
                <tr>
                  <th className="p-4">Ticket Number</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Weighment Ref</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Evidence</th>
                  <th className="p-4">Logged At</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y border-white/5 text-[#F4F7F0]">
                {filteredDisputes.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => {
                      setSelectedDispute(d);
                      setActionDecision('UPHOLD');
                      setResolutionNotes(d.resolution_notes || '');
                      setPointsAdjustment(d.points_adjustment || 0);
                    }}
                    className="hover:bg-white/5 cursor-pointer transition"
                  >
                    <td className="p-4 font-bold text-white">{d.ticket_number}</td>
                    <td className="p-4 text-amber-300 font-medium">
                      {d.category.replace(/_/g, ' ')}
                    </td>
                    <td className="p-4 font-mono text-[#A7B9A8]">
                      {d.weighment?.transaction_id || 'General Missed Pickup'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                          d.status === 'OPEN'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            : d.status === 'UNDER_REVIEW'
                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                            : d.status === 'INFO_REQUESTED'
                            ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                            : d.status === 'RESOLVED_UPHELD'
                            ? 'bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35]'
                            : 'bg-white/10 text-[#A7B9A8]'
                        }`}
                      >
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      {d.has_photo ? (
                        <span className="flex items-center gap-1 text-[#D7FF35] text-[11px]">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </span>
                      ) : (
                        <span className="text-[#A7B9A8]/60 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="p-4 text-[#A7B9A8] text-[11px]">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispute Dossier & Decision Drawer */}
      {selectedDispute && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-[#0D4935] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="micro-label text-amber-400">DISPUTE DOSSIER</span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedDispute.ticket_number}</span>
                  <span className="text-xs font-normal text-[#A7B9A8]">
                    • {selectedDispute.category.replace(/_/g, ' ')}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="p-1.5 rounded-lg text-[#A7B9A8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Citizen Statement */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#A7B9A8]">
                Citizen Statement & Allegation
              </span>
              <p className="p-4 rounded-2xl bg-[#041B15] border border-white/10 text-xs text-[#F4F7F0] leading-relaxed">
                {selectedDispute.description}
              </p>
            </div>

            {/* Linked Weighment Receipt */}
            {selectedDispute.weighment && (
              <div className="p-4 rounded-2xl bg-[#041B15] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#A7B9A8]">
                  <span>Weighment Ref: {selectedDispute.weighment.transaction_id}</span>
                  <span>{new Date(selectedDispute.weighment.collection_date).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-[#062B20] text-center">
                    <span className="text-[10px] text-[#A7B9A8] block font-mono">Total Net Weight</span>
                    <span className="font-bold text-white text-sm">
                      {selectedDispute.weighment.total_weight_kg.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#062B20] text-center">
                    <span className="text-[10px] text-[#A7B9A8] block font-mono">Dry Recyclable</span>
                    <span className="font-bold text-blue-400 text-sm">
                      {selectedDispute.weighment.dry_kg.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#062B20] text-center">
                    <span className="text-[10px] text-[#A7B9A8] block font-mono">Wet Organic</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {selectedDispute.weighment.wet_kg.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Attached Photo Evidence */}
            {selectedDispute.has_photo && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-[#A7B9A8]">
                  Sanitized Photo Evidence (EXIF Stripped)
                </span>
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50 p-3">
                  <img
                    src={api.admin.getDisputePhotoUrl(selectedDispute.id)}
                    alt="Sanitized evidence photo"
                    className="max-h-64 rounded-xl mx-auto object-contain"
                  />
                  <p className="text-[10px] font-mono text-center text-[#A7B9A8]/70 mt-2">
                    Retained until: {new Date(selectedDispute.retention_until).toLocaleDateString()} per DPDP Section 6
                  </p>
                </div>
              </div>
            )}

            {/* Citizen Response to Clarification */}
            {selectedDispute.citizen_response && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
                  Citizen Clarification Response
                </span>
                <p className="text-[#F4F7F0]">{selectedDispute.citizen_response}</p>
              </div>
            )}

            {/* Municipal Decision Form */}
            <form onSubmit={handleResolve} className="space-y-4 pt-2 border-t border-white/10 text-xs">
              <div>
                <label className="block text-[#F4F7F0] font-semibold mb-2">
                  Adjudication Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionDecision('UPHOLD')}
                    className={`p-3 rounded-xl border text-center font-semibold transition ${
                      actionDecision === 'UPHOLD'
                        ? 'bg-[#D7FF35]/15 border-[#D7FF35] text-[#D7FF35]'
                        : 'bg-[#041B15] border-white/10 text-[#A7B9A8] hover:text-white'
                    }`}
                  >
                    Uphold Dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDecision('REJECT')}
                    className={`p-3 rounded-xl border text-center font-semibold transition ${
                      actionDecision === 'REJECT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-[#041B15] border-white/10 text-[#A7B9A8] hover:text-white'
                    }`}
                  >
                    Reject Dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDecision('REQUEST_INFO')}
                    className={`p-3 rounded-xl border text-center font-semibold transition ${
                      actionDecision === 'REQUEST_INFO'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#041B15] border-white/10 text-[#A7B9A8] hover:text-white'
                    }`}
                  >
                    Request Info
                  </button>
                </div>
              </div>

              {/* Points Adjustment when UPHOLD */}
              {actionDecision === 'UPHOLD' && (
                <div className="p-4 rounded-2xl bg-[#062B20] border border-white/10 space-y-2">
                  <label htmlFor="points-adj" className="block text-[#D7FF35] font-semibold">
                    Compensatory Points Adjustment (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="points-adj"
                      type="number"
                      step="1"
                      value={pointsAdjustment}
                      onChange={(e) => setPointsAdjustment(parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 rounded-xl bg-[#041B15] border border-white/10 text-white font-mono"
                    />
                    <span className="text-[11px] text-[#A7B9A8]">
                      Credits (Appends immutable reversal row to ledger)
                    </span>
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label htmlFor="res-notes" className="block text-[#F4F7F0] font-semibold mb-1.5">
                  Official Decision Notes (Visible to Citizen & Audit Trail)
                </label>
                <textarea
                  id="res-notes"
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain findings, scale calibration check, or reasons for decision..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/10 text-white placeholder-[#A7B9A8]/40 focus:outline-none focus:border-[#D7FF35] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-[#F4F7F0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold uppercase tracking-wider disabled:opacity-50 transition shadow-glow-lime flex items-center gap-2"
                >
                  {submitting ? 'Committing...' : `Commit Decision (${actionDecision})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { AlertTriangle, ShieldCheck, CheckCircle2, XCircle, Info, Filter, ArrowRight } from 'lucide-react';

export const AnomalyReviewPage: React.FC = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review modal
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [decision, setDecision] = useState<'VERIFIED_LEGITIMATE' | 'DISMISSED'>('VERIFIED_LEGITIMATE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnomalies();
  }, [statusFilter]);

  const loadAnomalies = async () => {
    try {
      const filter = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await adminApi.admin.getAnomalies(filter);
      setAnomalies(data);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    if (!reviewNotes.trim()) {
      setError('Please provide supervisor audit review notes.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminApi.admin.reviewAnomaly(selectedAnomaly.id, {
        status: decision,
        review_notes: reviewNotes.trim(),
      });
      setSelectedAnomaly(null);
      setReviewNotes('');
      loadAnomalies();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 text-slate-900 dark:text-[#F4F7F0]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-amber-600 dark:text-amber-400">STATISTICAL AUDITING QUEUE</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Weighment Anomaly Reviews
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-2xl">
            Statistical rolling z-score flags (minimum sample N &ge; 5 with ward baseline fallback).
            Anomalies never penalize citizens automatically; human supervisor verification is strictly required.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 text-xs">
          {['ALL', 'PENDING_REVIEW', 'VERIFIED_LEGITIMATE', 'DISMISSED'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === f ? 'bg-[#0D4935] text-white dark:bg-[#D7FF35] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime' : 'text-slate-600 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-700 dark:text-[#A7B9A8]">
            Detected Anomaly Incidents
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]/70">Rolling Z-Score Model</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-500 dark:text-[#A7B9A8]">
            <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono">Loading anomaly flags...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-[#A7B9A8]">
            <p className="text-sm font-medium text-slate-900 dark:text-white">No anomalies matching filter</p>
            <p className="text-xs mt-1">All doorstep collections conform to expected household distribution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 dark:text-[#F4F7F0]">
              <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Time / Ward</th>
                  <th scope="col" className="px-6 py-3.5">Citizen</th>
                  <th scope="col" className="px-6 py-3.5">Type & Description</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Z-Score</th>
                  <th scope="col" className="px-6 py-3.5">Severity</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {anomalies.map((ano) => (
                  <tr key={ano.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-slate-900 dark:text-white text-xs">{new Date(ano.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono">{ano.ward_name}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{ano.citizen_name}</div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]">ID: {ano.user_id.slice(0, 8)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-[#F4F7F0] block w-fit mb-1 border border-slate-200 dark:border-white/5">
                        {ano.anomaly_type}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8]">{ano.description}</p>
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <div className="text-amber-600 dark:text-amber-400 font-bold">
                        {ano.z_score_household !== null ? `z=${ano.z_score_household.toFixed(2)}` : 'N<5 (Ward)'}
                      </div>
                      {ano.z_score_ward !== null && (
                        <div className="text-[10px] text-slate-500 dark:text-[#A7B9A8]/70">ward z={ano.z_score_ward.toFixed(2)}</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          ano.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                            : ano.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                            : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                        }`}
                      >
                        {ano.severity}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ano.status === 'PENDING_REVIEW'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 animate-pulse'
                            : ano.status === 'VERIFIED_LEGITIMATE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#062B20] dark:text-[#A7B9A8] dark:border-white/10'
                        }`}
                      >
                        {ano.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnomaly(ano);
                          setDecision(ano.status === 'PENDING_REVIEW' ? 'VERIFIED_LEGITIMATE' : ano.status);
                          setReviewNotes(ano.review_notes || '');
                          setError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#F4F7F0] font-medium text-xs transition border border-slate-200 dark:border-white/10"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedAnomaly && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/15 p-6 space-y-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-lg font-light text-slate-900 dark:text-white">Review Anomaly Flag</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white text-xs font-mono"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Citizen:</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedAnomaly.citizen_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Ward:</span>
                <span className="text-slate-800 dark:text-[#F4F7F0] font-mono">{selectedAnomaly.ward_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#A7B9A8]">Anomaly Type:</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono">{selectedAnomaly.anomaly_type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-[#A7B9A8] block mb-1">Observation:</span>
                <p className="text-slate-800 dark:text-[#F4F7F0]">{selectedAnomaly.description}</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-900 dark:text-white block">Audit Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('VERIFIED_LEGITIMATE')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      decision === 'VERIFIED_LEGITIMATE'
                        ? 'bg-emerald-50 dark:bg-[#D7FF35]/15 border-emerald-500 dark:border-[#D7FF35] text-emerald-800 dark:text-[#D7FF35]'
                        : 'bg-slate-100 dark:bg-[#041B15] border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Legitimate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('DISMISSED')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      decision === 'DISMISSED'
                        ? 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-[#041B15] border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Dismiss Incident</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-900 dark:text-[#F4F7F0]" htmlFor="review-notes">
                  Audit Notes & Supervisor Finding
                </label>
                <textarea
                  id="review-notes"
                  rows={3}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified with citizen: Festival packaging and cardboard boxes cleared from garage."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#A7B9A8]/40 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs tracking-wider uppercase transition shadow-sm dark:shadow-glow-lime"
              >
                {submitting ? 'Recording Audit...' : 'Submit Audit Decision'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

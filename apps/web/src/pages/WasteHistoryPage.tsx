import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { History, Search, Filter, Layers, Clock, X, CheckCircle, ArrowRight, ShieldAlert, Scale, ChevronRight } from 'lucide-react';
import { DisputeModal } from '../components/DisputeModal';

export const WasteHistoryPage: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [disputeEntry, setDisputeEntry] = useState<any | null>(null);
  const [isGeneralDisputeOpen, setIsGeneralDisputeOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    api.citizen.getCollections(50, 0)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setEntries(res);
          setLoading(false);
        } else {
          return api.citizen.getWasteHistory(50, 0).then((wh) => {
            setEntries(Array.isArray(wh) ? wh : []);
            setLoading(false);
          });
        }
      })
      .catch(() => {
        api.citizen.getWasteHistory(50, 0)
          .then((wh) => {
            setEntries(Array.isArray(wh) ? wh : []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.transaction_id && e.transaction_id.toLowerCase().includes(q)) ||
      (e.ward_name && e.ward_name.toLowerCase().includes(q)) ||
      (e.supervisor_name && e.supervisor_name.toLowerCase().includes(q)) ||
      (e.journey_stage && e.journey_stage.toLowerCase().includes(q)) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">VERIFIED CIVIC TRANSACTIONS</span>
          <h1 className="text-2xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight">
            Dry-Waste Collection History
          </h1>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
            Every doorstep dry recyclable weighment verified by municipal supervisors. Click any collection to inspect itemized material categories and rates.
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsGeneralDisputeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition shrink-0"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#A7B9A8] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-[#F4F7F0] placeholder-slate-400 dark:placeholder-[#A7B9A8]/50 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35]"
              placeholder="Search reference, ward, stage..."
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">
            Loading verified collection records...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">
            <Clock className="w-8 h-8 text-slate-400 dark:text-[#A7B9A8]/50 mx-auto" />
            <div className="text-slate-900 dark:text-white font-semibold">No matching collection records found.</div>
            <div className="text-[11px] text-slate-500 dark:text-[#A7B9A8]/70">Collections appear here once doorstep weighments are completed.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-900 dark:text-[#F4F7F0]">
              <thead className="bg-slate-100 dark:bg-[#062B20] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8] text-[11px] uppercase">
                <tr>
                  <th scope="col" className="p-4">Collection Reference</th>
                  <th scope="col" className="p-4">Date & Time</th>
                  <th scope="col" className="p-4">Assigned Ward</th>
                  <th scope="col" className="p-4">Verified Supervisor</th>
                  <th scope="col" className="p-4">Measured Weight</th>
                  <th scope="col" className="p-4">Verification Status</th>
                  <th scope="col" className="p-4">Points Awarded</th>
                  <th scope="col" className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredEntries.map((e) => {
                  const weight = Number(e.total_weight_kg || e.dry_kg || 0);
                  const points = Number(e.total_points_earned ?? e.credits_earned ?? 0);
                  const status = e.verification_status || e.dispute_status || 'VERIFIED';
                  const supName = e.supervisor_name || 'Municipal Supervisor';

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEntry(e)}
                      className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{e.transaction_id}</td>
                      <td className="p-4 text-slate-600 dark:text-[#A7B9A8]">
                        {new Date(e.collection_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-neutral-300">
                        {e.ward_name || 'Bengaluru Ward'}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-neutral-300">
                        {supName}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {weight.toFixed(1)} kg
                      </td>
                      <td className="p-4">
                        {status === 'DISPUTED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px]">
                            Disputed
                          </span>
                        ) : status === 'RESOLVED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-emerald-800 dark:text-[#10B981] text-[10px]">
                            Resolved
                          </span>
                        ) : status === 'CONFIRMED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#041B15] border border-emerald-300 dark:border-white/10 text-emerald-800 dark:text-[#D7FF35] text-[10px]">
                            Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px]">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-emerald-700 dark:text-[#D7FF35] font-bold">
                        +{points.toFixed(1)} GP
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-[10px] text-emerald-700 dark:text-[#D7FF35] hover:underline flex items-center justify-end gap-1 font-semibold">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collection Details Dossier Modal */}
      {selectedEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedEntry(null);
          }}
        >
          <div className="bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-left text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">VERIFIED COLLECTION DOSSIER</span>
                <h3 id="journey-modal-title" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  Collection: {selectedEntry.transaction_id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#A7B9A8] dark:hover:text-white"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collection Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Date & Time</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {new Date(selectedEntry.collection_date).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Ward</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {selectedEntry.ward_name || 'Koramangala'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Supervisor</span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {selectedEntry.supervisor_name || 'Municipal Supervisor'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-[#A7B9A8] block text-[10px] uppercase">Status</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedEntry.verification_status || selectedEntry.dispute_status || 'VERIFIED'}
                </span>
              </div>
            </div>

            {/* Itemized Categories Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A7B9A8]">
                Category-Wise Material Breakdown & Tariff
              </h4>

              {selectedEntry.items && selectedEntry.items.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-[#041B15] text-slate-700 dark:text-[#A7B9A8] text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Dry-Waste Category</th>
                        <th className="p-3">Measured Weight</th>
                        <th className="p-3">Applied Tariff</th>
                        <th className="p-3 text-right">Points Awarded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-slate-50 dark:bg-[#0D4935]/50">
                      {selectedEntry.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {it.category_name || it.category_code}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-neutral-200">
                            {Number(it.weight_kg).toFixed(2)} kg
                          </td>
                          <td className="p-3 text-slate-600 dark:text-[#A7B9A8]">
                            {Number(it.rate_per_kg).toFixed(1)} GP/kg
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 dark:text-[#D7FF35]">
                            +{Number(it.points_earned).toFixed(1)} GP
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-200 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-[#A7B9A8] space-y-1">
                  <div className="text-slate-900 dark:text-white font-semibold">Weighment Summary</div>
                  <div>Formula: {selectedEntry.calculation_formula || 'Calculated via municipal dry-waste tariff schedule'}</div>
                  <div>Measured Weight: {Number(selectedEntry.total_weight_kg || selectedEntry.dry_kg || 0).toFixed(2)} kg</div>
                </div>
              )}
            </div>

            {/* Total Award Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041B15] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#A7B9A8] block">Total Verified Green Points</span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-[#D7FF35]">
                  +{Number(selectedEntry.total_points_earned ?? selectedEntry.credits_earned ?? 0).toFixed(1)} GP
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 text-xs font-semibold font-mono border border-emerald-300 dark:border-emerald-500/30">
                100% Verified
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
              {selectedEntry.can_dispute && selectedEntry.dispute_status !== 'DISPUTED' && selectedEntry.dispute_status !== 'RESOLVED' ? (
                <button
                  type="button"
                  onClick={() => {
                    setDisputeEntry(selectedEntry);
                    setSelectedEntry(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Dispute this weighment</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold dark:text-white transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal for specific weighment */}
      <DisputeModal
        isOpen={!!disputeEntry}
        weighmentId={disputeEntry?.id}
        weighmentTransactionId={disputeEntry?.transaction_id}
        weighmentDate={disputeEntry?.collection_date}
        onClose={() => setDisputeEntry(null)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* General Dispute / Missed collection Modal */}
      <DisputeModal
        isOpen={isGeneralDisputeOpen}
        onClose={() => setIsGeneralDisputeOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};

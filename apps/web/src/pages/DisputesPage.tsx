import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Camera,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { DisputeModal } from '../components/DisputeModal';

interface DisputesPageProps {
  navigate?: (path: string) => void;
}

export const DisputesPage: React.FC<DisputesPageProps> = ({ navigate }) => {
  const { t } = useLanguage();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [respondingLoading, setRespondingLoading] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState<string | null>(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.citizen.getDisputes();
      setDisputes(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load dispute tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleSendResponse = async (disputeId: string) => {
    if (!responseText.trim()) return;
    try {
      setRespondingLoading(true);
      await api.citizen.respondToDispute(disputeId, responseText.trim());
      setResponseSuccess(disputeId);
      setRespondingId(null);
      setResponseText('');
      fetchDisputes();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response.');
    } finally {
      setRespondingLoading(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return ['OPEN', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(d.status);
    if (filter === 'RESOLVED') return ['RESOLVED_UPHELD', 'RESOLVED_REJECTED'].includes(d.status);
    return d.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
            {t('disputes.status_open') || 'Under Review'}
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-blue-500/10 border border-blue-500/30 text-blue-400">
            {t('disputes.status_investigating') || 'Investigating'}
          </span>
        );
      case 'INFO_REQUESTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-rose-500/15 border border-rose-500/40 text-rose-300 animate-pulse">
            {t('disputes.status_info_requested') || 'Clarification Needed'}
          </span>
        );
      case 'RESOLVED_UPHELD':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
            {t('disputes.status_upheld') || 'Dispute Upheld'}
          </span>
        );
      case 'RESOLVED_REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-slate-600 dark:text-[#A7B9A8]">
            {t('disputes.status_rejected') || 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-[#041B15] text-slate-600 dark:text-[#A7B9A8]">
            {status}
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'WRONG_WEIGHT':
        return t('disputes.cat_wrong_weight') || 'Scale / Weight Mismatch';
      case 'CATEGORY_MISMATCH':
        return t('disputes.cat_category_mismatch') || 'Category Misclassified';
      case 'MISSED_COLLECTION':
        return t('disputes.cat_missed_collection') || 'Missed Doorstep Collection';
      case 'SUPERVISOR_BEHAVIOUR':
        return t('disputes.cat_supervisor_behaviour') || 'Supervisor Conduct Issue';
      default:
        return t('disputes.cat_other') || 'Other Inconvenience';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-slate-900 dark:text-[#F4F7F0]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('disputes.title') || 'Disputes & Problem Reporting'}
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1 max-w-xl">
            {t('disputes.subtitle') ||
              'File and track weighment disputes or missed doorstep collections. All inquiries receive municipal supervisor review within 48 hours.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDisputes}
            aria-label={t('action.refresh') || 'Refresh'}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#062B20] dark:text-[#A7B9A8] dark:hover:text-white dark:hover:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs uppercase tracking-wider transition shadow-sm dark:shadow-glow-lime"
          >
            <Plus className="w-4 h-4" />
            <span>{t('disputes.btn_report_problem') || 'Report an Issue'}</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDisputes}
            className="text-xs underline hover:text-slate-900 dark:hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'ACTIVE', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition ${
              filter === tab
                ? 'bg-[#0D4935] text-white dark:bg-[#D7FF35] dark:text-[#041B15] font-bold shadow-sm dark:shadow-glow-lime'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#062B20] dark:text-[#A7B9A8] dark:hover:text-white border border-slate-200 dark:border-white/10'
            }`}
          >
            {tab === 'ALL'
              ? t('disputes.filter_all') || 'All Tickets'
              : tab === 'ACTIVE'
              ? t('disputes.filter_active') || 'In Progress'
              : t('disputes.filter_resolved') || 'Resolved'}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-600 dark:border-[#D7FF35] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-[#A7B9A8] font-mono">
            {t('common.loading') || 'Loading dispute tickets...'}
          </p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#062B20] text-slate-500 dark:text-[#A7B9A8] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-[#D7FF35]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('disputes.empty_title') || 'No Disputes Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A7B9A8] mt-1 max-w-sm mx-auto">
              {t('disputes.empty_sub') ||
                'You have no active disputes. Weighments are automatically confirmed 7 days after doorstep collection.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] text-xs font-bold transition shadow-sm dark:shadow-glow-lime"
          >
            {t('disputes.btn_report_problem') || 'Report an Issue'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => (
            <div
              key={dispute.id}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D4935] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition space-y-4 shadow-sm dark:shadow-md"
            >
              {/* Header: Ticket number, Category, Status */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                    {dispute.ticket_number}
                  </span>
                  <span className="text-slate-300 dark:text-[#A7B9A8]/40 text-xs">•</span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300/90">
                    {getCategoryLabel(dispute.category)}
                  </span>
                </div>
                <div>{getStatusBadge(dispute.status)}</div>
              </div>

              {/* Citizen statement */}
              <p className="text-xs text-slate-700 dark:text-[#A7B9A8] leading-relaxed bg-slate-50 dark:bg-[#041B15] p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
                {dispute.description}
              </p>

              {/* Linked weighment summary if available */}
              {dispute.weighment && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#A7B9A8]">
                    <span>Disputed Weighment: {dispute.weighment.transaction_id}</span>
                    <span>{new Date(dispute.weighment.collection_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-900 dark:text-white flex items-center gap-4 text-xs font-semibold pt-1">
                    <span>Net Weight: {dispute.weighment.total_weight_kg.toFixed(2)} kg</span>
                    <span className="text-slate-500 dark:text-[#A7B9A8]">
                      (Dry: {dispute.weighment.dry_kg.toFixed(2)} kg, Wet: {dispute.weighment.wet_kg.toFixed(2)} kg)
                    </span>
                  </div>
                </div>
              )}

              {/* Evidence photo thumbnail if attached */}
              {dispute.has_photo && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#A7B9A8]">
                  <Camera className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                  <span>{dispute.photo_filename || 'Evidence Photo Attached'}</span>
                  <span className="text-[10px] text-slate-400 dark:text-[#A7B9A8]/60">(EXIF stripped for privacy)</span>
                </div>
              )}

              {/* Action Needed: INFO_REQUESTED section */}
              {dispute.status === 'INFO_REQUESTED' && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 space-y-3">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                        {t('disputes.info_needed_title') || 'Supervisor Requested Clarification'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
                        {dispute.resolution_notes || 'Please provide additional details regarding your collection.'}
                      </p>
                    </div>
                  </div>

                  {dispute.citizen_response ? (
                    <div className="p-3 rounded-xl bg-white dark:bg-[#041B15] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-[#A7B9A8]">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-[#A7B9A8]/60 block">Your Submitted Response:</span>
                      {dispute.citizen_response}
                    </div>
                  ) : respondingId === dispute.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Provide details to help supervisor resolve this..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-[#F4F7F0] placeholder:text-slate-400 dark:placeholder-[#A7B9A8]/50 focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35] resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRespondingId(null);
                            setResponseText('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#062B20] text-slate-700 dark:text-[#A7B9A8] text-xs dark:hover:bg-[#062B20]/80"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={respondingLoading || !responseText.trim()}
                          onClick={() => handleSendResponse(dispute.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-bold text-xs disabled:opacity-50 shadow-sm dark:shadow-glow-lime"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{respondingLoading ? 'Submitting...' : 'Send Clarification'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRespondingId(dispute.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 font-semibold text-xs transition"
                    >
                      {t('disputes.btn_reply_now') || 'Reply to Clarification Request'}
                    </button>
                  )}
                </div>
              )}

              {/* Resolution Notes (if resolved) */}
              {(dispute.status === 'RESOLVED_UPHELD' || dispute.status === 'RESOLVED_REJECTED') && (
                <div
                  className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                    dispute.status === 'RESOLVED_UPHELD'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-[#10B981]/15 dark:border-[#10B981]/25 dark:text-[#10B981]'
                      : 'bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#A7B9A8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>
                      {dispute.status === 'RESOLVED_UPHELD'
                        ? t('disputes.resolution_upheld') || 'Dispute Upheld by Municipal Admin'
                        : t('disputes.resolution_rejected') || 'Dispute Closed / Not Upheld'}
                    </span>
                    {dispute.resolved_at && (
                      <span className="font-mono text-[10px] text-slate-500 dark:text-[#A7B9A8]">
                        {new Date(dispute.resolved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {dispute.resolution_notes && <p className="text-xs pt-1">{dispute.resolution_notes}</p>}
                  {dispute.points_adjustment !== 0 && dispute.points_adjustment && (
                    <p className="text-xs font-semibold text-emerald-800 dark:text-[#D7FF35] pt-1">
                      Ledger Adjustment: {dispute.points_adjustment > 0 ? '+' : ''}
                      {dispute.points_adjustment} Green Credits
                    </p>
                  )}
                </div>
              )}

              {/* Footer: Timestamps & 90-day retention metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    {t('disputes.filed_on') || 'Filed on'} {new Date(dispute.created_at).toLocaleString()}
                  </span>
                </div>
                <span>
                  {t('disputes.retained_until') || 'DPDP retention until'}:{' '}
                  {new Date(dispute.retention_until).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchDisputes();
        }}
      />
    </div>
  );
};

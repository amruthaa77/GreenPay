import React, { useState } from 'react';
import { X, AlertCircle, Camera, CheckCircle2, ShieldAlert, UploadCloud, Info } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  weighmentId?: string | null;
  weighmentTransactionId?: string | null;
  weighmentDate?: string | null;
  onSuccess?: (ticketNumber: string) => void;
}

const CATEGORIES = [
  { value: 'WRONG_WEIGHT', labelKey: 'disputes.cat_wrong_weight', defaultLabel: 'Scale / Weight Mismatch' },
  { value: 'CATEGORY_MISMATCH', labelKey: 'disputes.cat_category_mismatch', defaultLabel: 'Waste Category Misclassified' },
  { value: 'MISSED_COLLECTION', labelKey: 'disputes.cat_missed_collection', defaultLabel: 'Missed Doorstep Collection' },
  { value: 'SUPERVISOR_BEHAVIOUR', labelKey: 'disputes.cat_supervisor_behaviour', defaultLabel: 'Supervisor Conduct Issue' },
  { value: 'OTHER', labelKey: 'disputes.cat_other', defaultLabel: 'Other Civic Inconvenience' },
];

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  weighmentId,
  weighmentTransactionId,
  weighmentDate,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [category, setCategory] = useState(weighmentId ? 'WRONG_WEIGHT' : 'MISSED_COLLECTION');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('disputes.err_photo_size') || 'Photo exceeds the 5MB size limit.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(t('disputes.err_photo_type') || 'Only JPEG, PNG, or WebP images are supported.');
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 10) {
      setError(t('disputes.err_desc_length') || 'Please provide at least 10 characters describing the issue.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description.trim());
      if (weighmentId) {
        formData.append('weighment_id', weighmentId);
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.citizen.createDispute(formData);
      setCreatedTicket(res.ticket_number);
      if (onSuccess) onSuccess(res.ticket_number);
    } catch (err: any) {
      setError(err.message || t('disputes.err_submit') || 'Failed to submit dispute ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setCategory(weighmentId ? 'WRONG_WEIGHT' : 'MISSED_COLLECTION');
    setDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    setCreatedTicket(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dispute-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {weighmentId
                  ? t('disputes.modal_title_weighment') || 'Dispute Weighment Receipt'
                  : t('disputes.modal_title_general') || 'Report Collection Problem'}
              </h2>
              {weighmentTransactionId && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-[#A7B9A8]">
                  Ref: {weighmentTransactionId} {weighmentDate ? `• ${new Date(weighmentDate).toLocaleDateString()}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('action.close') || 'Close'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdTicket ? (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 border border-emerald-300 dark:border-[#D7FF35]/30 text-emerald-700 dark:text-[#D7FF35] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('disputes.success_title') || 'Dispute Ticket Lodged'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#A7B9A8] mt-1">
                {t('disputes.success_sub') || 'Your ticket has been assigned to municipal review.'}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-[#0D4935]/80 border border-emerald-200 dark:border-white/10 inline-block font-mono text-emerald-800 dark:text-[#D7FF35] font-bold text-sm tracking-wider">
              {createdTicket}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#A7B9A8] max-w-sm mx-auto leading-relaxed">
              {t('disputes.success_sla') ||
                'Municipal ward supervisors verify discrepancies within 48 hours. If upheld, compensatory ledger credits will be appended directly.'}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-mono font-bold text-xs uppercase tracking-wider transition shadow-sm dark:shadow-glow-lime"
            >
              {t('action.done') || 'Done'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Category Select */}
            <div>
              <label htmlFor="dispute-category" className="block text-slate-700 dark:text-[#A7B9A8] font-medium mb-1.5">
                {t('disputes.field_category') || 'Reason for Dispute / Issue Category'}
              </label>
              <select
                id="dispute-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35] transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {t(cat.labelKey) || cat.defaultLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Textarea */}
            <div>
              <label htmlFor="dispute-description" className="block text-slate-700 dark:text-[#A7B9A8] font-medium mb-1.5">
                {t('disputes.field_description') || 'Detailed Explanation'}
              </label>
              <textarea
                id="dispute-description"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  t('disputes.desc_placeholder') ||
                  'Explain what occurred (e.g. digital scale weight reading, driver skipped door, packaging intact)...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#041B15] border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-[#A7B9A8] focus:outline-none focus:border-emerald-600 dark:focus:border-[#D7FF35] transition resize-none"
              />
            </div>

            {/* Photo Attachment (DPDP compliant EXIF strip) */}
            <div>
              <label className="block text-slate-700 dark:text-[#A7B9A8] font-medium mb-1.5">
                {t('disputes.field_photo') || 'Supporting Evidence Photo (Optional)'}
              </label>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/20 bg-slate-100 dark:bg-black/40 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Dispute evidence preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-white/10"
                    />
                    <div>
                      <p className="text-slate-900 dark:text-white text-xs font-medium truncate max-w-[200px]">
                        {photoFile?.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-[#A7B9A8]">
                        {photoFile ? `${(photoFile.size / 1024).toFixed(0)} KB` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/20 text-slate-600 hover:text-rose-600 dark:text-[#A7B9A8] dark:hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/20 hover:border-emerald-500 dark:hover:border-[#D7FF35]/50 bg-slate-50 dark:bg-[#041B15]/50 hover:bg-slate-100 dark:hover:bg-[#041B15] cursor-pointer transition">
                  <UploadCloud className="w-6 h-6 text-slate-500 dark:text-[#A7B9A8] mb-1" />
                  <span className="text-slate-600 dark:text-[#A7B9A8] font-medium text-xs">
                    {t('disputes.upload_photo_prompt') || 'Attach digital scale or waste bag photo'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-[#A7B9A8]/60 mt-0.5">JPEG, PNG, WebP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}

              {/* DPDP Privacy Alert */}
              <div className="mt-2 p-2.5 rounded-xl bg-slate-100 dark:bg-[#0D4935]/40 border border-slate-200 dark:border-white/10 text-[10px] text-slate-600 dark:text-[#A7B9A8] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700 dark:text-[#D7FF35]" />
                <span>
                  {t('disputes.dpdp_photo_notice') ||
                    'DPDP Minimisation: Embedded camera metadata and GPS coordinates are stripped before storage. Evidence is retained for 90 days.'}
                </span>
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-mono text-xs uppercase tracking-wider border border-slate-200 dark:border-white/10 transition"
              >
                {t('action.cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition shadow-sm dark:shadow-glow-lime flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-[#041B15] border-t-transparent rounded-full animate-spin" />
                    <span>{t('action.submitting') || 'Submitting...'}</span>
                  </>
                ) : (
                  <span>{t('disputes.btn_submit_ticket') || 'Submit Dispute'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

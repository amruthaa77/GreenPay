import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Building,
  Award,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface PublicCertificateVerifyPageProps {
  initialCode?: string;
  navigate?: (path: string) => void;
}

export const PublicCertificateVerifyPage: React.FC<PublicCertificateVerifyPageProps> = ({
  initialCode = '',
  navigate,
}) => {
  const { t } = useLanguage();
  const [certInput, setCertInput] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // If initialCode provided, automatically verify
  useEffect(() => {
    if (initialCode) {
      setCertInput(initialCode);
      verifyCode(initialCode);
    }
  }, [initialCode]);

  const verifyCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await api.public.verifyCertificate(cleanCode);
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({ is_valid: false });
      setError(err.message || 'Certificate verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(certInput);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Top Back Nav */}
        {navigate && (
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to GreenPay
          </button>
        )}

        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7FF35]/15 border border-[#D7FF35]/30 text-[#D7FF35] text-xs font-mono font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            Public Civic Registry
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight sm:text-4xl">
            {t('verify_cert.title') || 'BBMP / GreenPay Civic Certificate Verification'}
          </h1>
          <p className="mt-2 text-base text-[#A7B9A8] max-w-xl mx-auto">
            {t('verify_cert.subtitle') ||
              'Official public registry for verified Green Household recognition certificates in Bengaluru.'}
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-[#0D4935]/80 rounded-3xl p-6 sm:p-8 shadow-card-dark border border-white/10 mb-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-[#A7B9A8] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder={t('verify_cert.input_placeholder') || 'Enter Certificate Number (e.g. GP-CERT-2026-...)'}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/15 bg-[#041B15] text-white placeholder-[#A7B9A8] text-sm font-mono focus:outline-none focus:border-[#D7FF35] focus:ring-1 focus:ring-[#D7FF35] transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !certInput.trim()}
              className="py-3.5 px-6 rounded-2xl bg-[#D7FF35] hover:bg-[#C4F020] disabled:opacity-50 text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-glow-lime disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {t('verify_cert.btn_verify') || 'Verify Certificate'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verification Result Card */}
        {hasSearched && verificationResult && (
          <div className="animate-fade-in">
            {verificationResult.is_valid ? (
              <div className="bg-[#0D4935]/80 rounded-3xl border border-white/10 shadow-card-dark p-6 sm:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-[#D7FF35] text-[#041B15] text-[11px] font-mono font-bold uppercase tracking-wider py-1.5 px-4 rounded-bl-2xl flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('verify_cert.badge_authentic') || 'Authentic Civic Record Verified'}
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#062B20] border border-white/10 flex items-center justify-center text-[#D7FF35]">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#D7FF35] uppercase tracking-wider font-mono">
                      Municipal Certificate of Recognition
                    </span>
                    <h3 className="text-xl font-bold text-white font-mono">
                      {verificationResult.certificate_number}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-[#062B20]/80 border border-white/5">
                    <span className="text-xs text-[#A7B9A8] block mb-1">
                      {t('verify_cert.recipient') || 'Recognised Household / Citizen'}
                    </span>
                    <span className="text-base font-bold text-white">
                      {verificationResult.masked_recipient || 'Civic Citizen'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#062B20]/80 border border-white/5">
                    <span className="text-xs text-[#A7B9A8] block mb-1">
                      {t('verify_cert.ward') || 'BBMP Ward & Zone'}
                    </span>
                    <span className="text-base font-bold text-white">
                      {verificationResult.ward_name} ({verificationResult.zone})
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#062B20]/80 border border-white/5">
                    <span className="text-xs text-[#A7B9A8] block mb-1">
                      {t('verify_cert.tier') || 'Green Score Tier'}
                    </span>
                    <span className="text-base font-bold text-[#D7FF35] flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-4 h-4" />
                      {verificationResult.score_tier || 'Gold Household'} ({verificationResult.green_score?.toFixed(1) || '85.0'} / 100)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#062B20]/80 border border-white/5">
                    <span className="text-xs text-[#A7B9A8] block mb-1">
                      {t('verify_cert.issued_on') || 'Date of Issue'}
                    </span>
                    <span className="text-base font-bold text-white flex items-center gap-1.5 font-mono">
                      <Calendar className="w-4 h-4 text-[#A7B9A8]" />
                      {verificationResult.issued_at
                        ? new Date(verificationResult.issued_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'November 2026'}
                    </span>
                  </div>
                </div>

                {/* DPDP Section 9 Compliance Notice */}
                <div className="p-4 rounded-2xl bg-[#062B20]/90 border border-white/10 flex items-start gap-3 text-xs text-[#A7B9A8]">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#D7FF35]" />
                  <span>
                    {t('verify_cert.dpdp_notice') ||
                      'DPDP Section 9 Compliance: In accordance with India’s Digital Personal Data Protection Act 2023, personal identifying details are masked on public records.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#0D4935]/80 rounded-3xl border border-red-500/40 shadow-card-dark p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">
                  {t('verify_cert.badge_invalid') || 'Invalid or Unknown Certificate'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                  {t('verify_cert.invalid_desc') ||
                    'The certificate identifier entered does not match any registered municipal recognition record.'}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-mono text-red-700 dark:text-red-300">
                  Searched: {certInput.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

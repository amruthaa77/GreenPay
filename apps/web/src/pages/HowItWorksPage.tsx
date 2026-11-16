import React from 'react';
import { QrCode, Scale, Award, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

interface HowItWorksProps {
  navigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksProps> = ({ navigate }) => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16 text-slate-900 dark:text-[#F4F7F0]">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">CITIZEN GUIDE &bull; BENGALURU</span>
        <h1 className="text-3xl sm:text-5xl font-light text-slate-900 dark:text-white tracking-tight">
          How GreenPay Works
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-slate-600 dark:text-[#A7B9A8] leading-relaxed font-light">
          A step-by-step transparent process connecting Bengaluru households with authorized municipal waste supervisors.
        </p>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Step 1 */}
        <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold">STEP 01</span>
            <QrCode className="w-6 h-6 text-emerald-700 dark:text-[#D7FF35]" />
          </div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-white">Generate Your Permanent QR ID</h2>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            Register using your electricity meter number. You are assigned a permanent GreenPay ID (e.g. <code className="text-emerald-700 dark:text-[#D7FF35]">GP-104928</code>) and a printable ID card. Affix this card near your doorstep or save it to your phone.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono">
            Requires BESCOM meter verification &bull; 18+ declaration
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold">STEP 02</span>
            <Scale className="w-6 h-6 text-emerald-700 dark:text-[#D7FF35]" />
          </div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-white">Source Segregation & Doorstep Scan</h2>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            Segregate dry recyclables cleanly into GreenPay's 8 approved streams (Aluminium, PET Bottles, Plastics, Cardboard, Glass, Textiles, and Mixed Paper). During scheduled collection rounds, the authorised field supervisor scans your permanent QR ID at your doorstep to initiate verified weighment.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono">
            Camera BarcodeDetector &bull; Read-only identity check
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold">STEP 03</span>
            <Award className="w-6 h-6 text-emerald-700 dark:text-[#D7FF35]" />
          </div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-white">Verified Weighment & Live Points</h2>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            The supervisor weighs segregated dry recyclables on calibrated digital scales. Green Points are calculated instantly from verified weight and official category rates (e.g. 22 GP/kg for Aluminium, 18 GP/kg for PET Bottles). Points credit immediately to your immutable ledger.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono">
            Points, NOT money &bull; Idempotency key prevents double-crediting
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-700 dark:text-[#D7FF35] font-semibold">STEP 04</span>
            <CheckCircle className="w-6 h-6 text-emerald-700 dark:text-[#D7FF35]" />
          </div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-white">Green Score & Circular Journey</h2>
          <p className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
            Your collection feeds into your explainable 0–100 Green Score. Follow the waste journey timeline from collection through sorting at ward DWCCs to final material recovery.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 dark:text-[#A7B9A8]/70 font-mono">
            Explainable formula &bull; 100% Landfill diversion target
          </div>
        </div>
      </div>

      {/* CTA Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-50 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 text-center space-y-6 shadow-sm dark:shadow-card-dark text-slate-900 dark:text-white">
        <h3 className="text-2xl font-light text-slate-900 dark:text-white">Ready to join your ward’s civic waste initiative?</h3>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] max-w-xl mx-auto">
          Free citizen registration takes under 2 minutes. Your doorstep collections will be verified transparently from tomorrow morning.
        </p>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="px-8 py-3.5 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-mono text-xs font-bold uppercase tracking-widest transition shadow-sm dark:shadow-glow-lime"
        >
          Create Citizen Account &rarr;
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { businessConfig } from '@greenpay/config';
import { Award, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">POLICY & POINT DISCLOSURE</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Refund & Green Credits Policy
        </h1>
        <p className="text-xs text-[#A7B9A8] font-mono">
          Last Updated: November 2026 &bull; GreenPay Civic Prototype
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-8 text-xs text-[#A7B9A8] leading-relaxed">
        
        {/* Core Financial Disclaimer */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-neutral-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Non-Monetary Point Classification & No Payments Disclosure</span>
          </div>
          <p className="leading-relaxed">
            <strong>Green Credits have NO cash value, are NOT money, and do NOT constitute a financial wallet or stored-value instrument under RBI guidelines.</strong> GreenPay does not collect payments, sell points, charge subscription fees, or conduct payment processing. <strong>Because nothing is sold or purchased, financial refunds do not apply.</strong>
          </p>
        </div>

        {/* Nature of Credits */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">1. Nature of Green Credits</h2>
          <p>
            Green Credits are civic recognition points awarded to households when waste is segregated at source and verified at the doorstep by an authorized supervisor.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#A7B9A8]/80">
            <li>Credits are computed transparently based on active rates (e.g. 10 credits/kg for clean dry waste).</li>
            <li>Credits cannot be redeemed for fiat currency (&yen;, $, &euro;, &#8377;), converted to cash, or transferred to third-party bank accounts.</li>
            <li>Credits are non-transferable between households.</li>
          </ul>
        </div>

        {/* Weighment Discrepancies & Dispute Redressal */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">2. Weighment Discrepancies & Audit Corrections</h2>
          <p>
            Because the GreenPay credit ledger is strictly append-only (enforced by database engine triggers preventing <code>UPDATE</code> and <code>DELETE</code>), past records are never overwritten.
          </p>
          <p>
            If a doorstep collection weight or category was recorded erroneously by a supervisor:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-[#A7B9A8]/80">
            <li>The citizen may submit a dispute through the Contact page or by notifying their ward supervisor within 7 calendar days of collection.</li>
            <li>Upon supervisor review and verification, an auditable <strong>reversing transaction</strong> (e.g. <code>is_reversal=true</code> with negative offsetting credits) is appended to the ledger.</li>
            <li>A corrected weighment entry is then logged, maintaining an unbroken municipal audit trail.</li>
          </ol>
        </div>

        {/* Contact */}
        <div className="pt-4 border-t border-white/10 text-[#A7B9A8] text-[11px]">
          For questions regarding credit ledger entries, contact{' '}
          <a href={`mailto:${businessConfig.contactEmail || 'contact@greenpay.blr'}`} className="text-[#D7FF35] underline">
            {businessConfig.contactEmail || 'contact@greenpay.blr'}
          </a>.
        </div>
      </div>
    </div>
  );
};

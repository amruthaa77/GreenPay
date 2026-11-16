import React from 'react';
import { ShieldCheck, AlertCircle, Award, Scale } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12 text-slate-900 dark:text-[#F4F7F0]">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">MISSION & MUNICIPAL TRANSPARENCY</span>
        <h1 className="text-3xl sm:text-5xl font-light text-slate-900 dark:text-white tracking-tight">
          About GreenPay
        </h1>
        <p className="text-base text-slate-600 dark:text-[#A7B9A8] font-light italic">
          "Waste responsibly. Track transparently. Earn sustainably."
        </p>
      </div>

      {/* Prominent Non-Affiliation Declaration Banner */}
      <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-neutral-200 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Independent Prototype Declaration & Legal Notice</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 dark:text-[#A7B9A8]">
          GreenPay is an independent civic research and technological prototype developed for Bengaluru’s solid waste ecosystem. <strong>GreenPay is NOT affiliated with, owned by, endorsed by, or an official agency of the Bruhat Bengaluru Mahanagara Palike (BBMP) or the Greater Bengaluru Authority (GBA).</strong> References to Bengaluru zones and wards exist strictly for civic research modeling and demonstration purposes.
        </p>
      </div>

      {/* Story & Problem Statement */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-6 text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">The Structural Bottleneck in Bengaluru Solid Waste</h2>
        <p>
          Bengaluru generates over 4,500 metric tonnes of municipal solid waste daily. While dedicated civic sanitation workers and municipal supervisors work diligently across 198+ wards, the doorstep collection process has historically suffered from:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-[#A7B9A8]/80">
          <li><strong className="text-slate-900 dark:text-white">Opaque collection tracking:</strong> Handover disputes between households and route vehicles without verifiable receipts.</li>
          <li><strong className="text-slate-900 dark:text-white">Contaminated dumping:</strong> Inadequate segregation at the household level burdens secondary collection points like Mandur and Mittaganahalli.</li>
          <li><strong className="text-slate-900 dark:text-white">Absence of transparent incentives:</strong> Citizens lack transparent feedback on how their personal segregation efforts divert waste from landfills.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white pt-4">The GreenPay Architecture</h2>
        <p>
          GreenPay anchors digital citizen identity to physical electricity meter numbers (stored encrypted and displayed masked). When field supervisors arrive at your doorstep, they scan your permanent QR ID and verify source-segregated materials.
        </p>
        <p>
          Segregate dry recyclables. Get them weighed. Earn Green Points. Redeem essential groceries. GreenPay focuses strictly on dry recyclable collection across 8 official categories (Aluminium & Metal, PET Bottles, Other Recyclable Plastics, Newspapers & Magazines, Cardboard, Glass Bottles, Textiles, and Mixed Paper). Organic kitchen waste and other non-dry streams are handled separately through municipal sanitation services and are not part of GreenPay's earning mechanism. Verified dry collections earn citizens <strong className="text-slate-900 dark:text-white">Green Points</strong> (non-monetary civic reward points redeemable for everyday grocery rations, NOT money, NOT a wallet, with zero payment processing) and feed an explainable 0–100 Green Score.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white pt-4">Our Honest-UX Code of Ethics</h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-[#A7B9A8]/80">
          <li><strong className="text-slate-900 dark:text-white">No dark patterns:</strong> No pre-ticked consent boxes, no confirm-shaming, no artificial countdowns.</li>
          <li><strong className="text-slate-900 dark:text-white">No unsupported claims:</strong> We never claim to be "#1" or "trusted by millions". Every stat shown originates from real DB records or is clearly labelled "demo data".</li>
          <li><strong className="text-slate-900 dark:text-white">Privacy by design:</strong> In compliance with the Digital Personal Data Protection (DPDP) Act 2023, data minimisation is enforced. Minors under 18 are blocked from registration per Section 9.</li>
          <li><strong className="text-slate-900 dark:text-white">Self-serve data rights:</strong> Citizens can export their complete data as JSON or delete their account at any time.</li>
        </ul>
      </div>
    </div>
  );
};

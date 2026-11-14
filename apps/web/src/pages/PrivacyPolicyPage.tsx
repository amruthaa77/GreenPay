import React from 'react';
import { businessConfig } from '@greenpay/config';
import { ShieldCheck, Mail, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">DATA PROTECTION & PRIVACY</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#A7B9A8] font-mono">
          Governed by India’s Digital Personal Data Protection (DPDP) Act 2023 &bull; Last Updated: November 2026
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-8 text-xs text-[#A7B9A8] leading-relaxed">
        
        {/* Intro */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">1. Introduction & Purpose</h2>
          <p>
            {businessConfig.legalName || 'GreenPay'} ("we", "us", "our") operates GreenPay as an independent civic prototype for transparent household waste weighment in Bengaluru. We are dedicated to respecting your privacy in strict compliance with the Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act, 2000.
          </p>
        </div>

        {/* What We Collect */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">2. What Data We Collect & Data Minimisation</h2>
          <p>
            We strictly enforce data minimisation. We collect only what is strictly necessary to anchor doorstep collections to physical premises:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#A7B9A8]/80">
            <li><strong>Electricity Meter Number:</strong> Collected to anchor collection records. Stored encrypted at rest using AES-256-GCM and displayed masked (e.g. BESCOM-***-4928).</li>
            <li><strong>Name / Household Identifier:</strong> To address receipts and display your Citizen ID card.</li>
            <li><strong>Ward Name:</strong> To aggregate ward-level collection analytics (Koramangala, Indiranagar, Jayanagar, Whitefield).</li>
            <li><strong>Password Hash:</strong> Stored strictly as salted bcrypt / argon2 hashes. Never stored in plaintext.</li>
            <li><strong>Email & Phone (Optional):</strong> Optional contact details for service notifications and optional digests.</li>
          </ul>
          <p className="text-[#A7B9A8]">
            <strong>What we DO NOT collect:</strong> We do NOT collect Aadhaar numbers, date of birth, financial bank details, GPS location tracking, or device fingerprints.
          </p>
        </div>

        {/* Lawful Basis & Consent */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">3. Lawful Basis & Unbundled Consent</h2>
          <p>
            All personal data is processed solely on the lawful basis of your affirmative, unbundled, free, and specific consent (DPDP Section 6). Terms of Service consent and optional notifications consent are kept strictly separated and never pre-ticked.
          </p>
        </div>

        {/* Minors Data */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">4. Protection of Minors (DPDP Act Section 9)</h2>
          <p>
            In accordance with Section 9 of the DPDP Act 2023, self-registration is strictly restricted to adults aged 18 and older. Registration attempts by individuals under 18 are blocked and no personal data is retained for blocked attempts.
          </p>
        </div>

        {/* User Rights & Pseudonymous Deletion */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">5. Your Statutory Rights (Access, Correction & Erasure)</h2>
          <p>Under the DPDP Act 2023, you have the following self-serve rights:</p>
          <ul className="list-disc pl-5 space-y-2 text-[#A7B9A8]/80">
            <li><strong>Right of Access & Portability:</strong> You can download a complete machine-readable JSON copy of your personal data and weighment history from your Account Settings at any time.</li>
            <li><strong>Right to Correction:</strong> You can update your contact preferences or report erroneous weighment records.</li>
            <li><strong>Right to Erasure (Account Deletion):</strong> When you execute self-serve account deletion, all personal identifiers (name, email, phone, encrypted meter number) are permanently scrubbed. To preserve immutable municipal waste auditing and ledger integrity, historical transaction quantities remain recorded under a pseudonymous reference (e.g. <code>ANON-&lt;UUID&gt;</code>).</li>
          </ul>
        </div>

        {/* Security & Retention */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">6. Security & Data Retention</h2>
          <p>
            We implement industry-standard encryption, double-submit CSRF tokens, strict httpOnly Secure SameSite cookies, and rate limiting. Data is retained only as long as your citizen account remains active.
          </p>
        </div>

        {/* Grievance Redressal */}
        <div className="space-y-3 p-4 rounded-xl bg-[#062B20]/90 border border-white/10">
          <h2 className="text-base font-semibold text-white">7. Grievance Redressal Officer (DPDP Act)</h2>
          <p className="text-[#A7B9A8]">
            If you have questions, grievances, or wish to exercise your data protection rights, please contact our designated Grievance Officer:
          </p>
          <div className="font-mono text-[#A7B9A8] space-y-1 pt-1">
            <div>Officer: {businessConfig.grievanceOfficerName || 'Grievance Redressal Officer'}</div>
            <div>Address: {businessConfig.registeredAddress || 'Bengaluru, Karnataka, India'}</div>
            <div>
              Email:{' '}
              <a href={`mailto:${businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}`} className="text-[#D7FF35] underline">
                {businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

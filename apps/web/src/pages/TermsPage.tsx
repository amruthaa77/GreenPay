import React from 'react';
import { businessConfig } from '@greenpay/config';
import { FileText, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">AGREEMENT & CITIZEN RESPONSIBILITIES</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-[#A7B9A8] font-mono">
          Last Updated: November 2026 &bull; GreenPay Civic Prototype
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-8 text-xs text-[#A7B9A8] leading-relaxed">
        
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By registering for an account or using the GreenPay platform, you agree to comply with and be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not access or use the platform.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">2. Scope of Service & Municipal Independence</h2>
          <p>
            GreenPay is an independent civic research and technological prototype designed for Bengaluru. <strong>GreenPay is NOT an official agency of, affiliated with, or operated by the Bruhat Bengaluru Mahanagara Palike (BBMP) or Greater Bengaluru Authority (GBA).</strong> Service availability is dependent on pilot ward operations.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">3. Citizen Eligibility & Truthful Segregation</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-[#A7B9A8]/80">
            <li>You must be at least 18 years of age to register for a household account.</li>
            <li>You agree to provide an accurate electricity meter number corresponding to your Bengaluru residence.</li>
            <li>You agree to segregate dry recyclables cleanly into GreenPay's 8 approved categories (Aluminium & Metal, PET Bottles, Other Recyclable Plastics, Newspapers & Magazines, Cardboard, Glass Bottles, Textiles, and Mixed Paper). Contamination with wet organic or hazardous substances into dry streams is strictly prohibited.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">4. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 text-[#A7B9A8]/80">
            <li>Interfere with or attempt to manipulate doorstep barcode scanning or weighment records.</li>
            <li>Submit fraudulent or duplicate collection claims.</li>
            <li>Probe, reverse-engineer, or attempt to circumvent authentication, CSRF protections, or database immutability triggers.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">5. Disclaimer of Warranties & Limitation of Liability</h2>
          <p>
            GreenPay is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. As an independent civic prototype, we are not liable for municipal service interruptions, collection truck delays, or route adjustments.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">6. Governing Law & Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India, and disputes shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.
          </p>
        </div>
      </div>
    </div>
  );
};

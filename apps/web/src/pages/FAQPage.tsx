import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

export const FAQPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: 'What are Green Credits? Are they money or a financial wallet?',
      a: 'No. Green Credits are strictly non-monetary civic reward points. They have zero cash value, cannot be purchased, cannot be transferred to a bank account, and GreenPay conducts no payment processing. They serve solely as civic engagement recognition.',
    },
    {
      q: 'Why do I need to register with my electricity meter number?',
      a: 'The electricity meter number anchors digital collection receipts to physical premises in Bengaluru. This prevents ghost collections and ensures that waste weighments accurately reflect doorstep handovers for that specific household.',
    },
    {
      q: 'Is my electricity meter number exposed to the public?',
      a: 'Never. In compliance with the Digital Personal Data Protection (DPDP) Act 2023, electricity meter numbers are symmetrically encrypted at rest (AES-256) and displayed in masked format (e.g., BESCOM-***-4928) across all interfaces.',
    },
    {
      q: 'Why is registration restricted to individuals aged 18 and older?',
      a: 'In accordance with Section 9 of India’s DPDP Act 2023, data processing for minors requires verifiable parental or guardian consent. To adhere strictly to data minimisation without collecting sensitive guardian identity documents, self-registration is limited to adults aged 18+.',
    },
    {
      q: 'Which waste earns Green Points?',
      a: 'GreenPay is exclusively a dry recyclable waste collection and reward platform. Green Points are earned strictly by handing over segregated dry recyclables across the 8 official categories: Aluminium & Metal (22 GP/kg), PET Bottles (18 GP/kg), Other Recyclable Plastics (15 GP/kg), Newspapers & Magazines (10 GP/kg), Cardboard (10 GP/kg), Glass Bottles (8 GP/kg), Textiles (8 GP/kg), and Mixed Paper (7 GP/kg). Organic kitchen waste and non-dry streams are handled through separate municipal services and are not part of GreenPay\'s earning mechanism.',
    },
    {
      q: 'How is the 0–100 Green Score calculated?',
      a: 'Your score is completely transparent and computed from three open components: Segregation Purity (up to 40 points), Collection Consistency (up to 30 points), and Landfill Diversion (up to 30 points). You can inspect your personal score breakdown directly on your citizen dashboard after logging in.',
    },
    {
      q: 'What happens if my doorstep weighment was recorded incorrectly?',
      a: 'Because our database ledger is append-only (database triggers physically prohibit UPDATE and DELETE), corrections cannot silently overwrite history. You can submit a dispute, and verified corrections are issued as auditable reversing transactions.',
    },
    {
      q: 'How do I download my permanent QR ID card?',
      a: 'Once registered and logged in, navigate to "My QR Card" in the menu. You can download a high-resolution printable ID card containing your GP-XXXXXX code, ward name, and QR barcode for your doorstep.',
    },
    {
      q: 'Can I export my data or delete my account?',
      a: 'Yes. GreenPay provides complete self-serve DPDP rights in your Account Settings. You can download a JSON export of all personal data, weighments, and credits, or permanently erase your account at any time.',
    },
  ];

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">QUESTIONS & ANSWERS</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="max-w-xl mx-auto text-sm text-[#A7B9A8] font-light">
          Everything you need to know about GreenPay doorstep verification, points, and civic privacy.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={faq.q}
              className="rounded-2xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF35]"
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A7B9A8] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#D7FF35]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-xs text-[#A7B9A8] leading-relaxed border-t border-white/5 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { businessConfig } from '@greenpay/config';
import { ShieldCheck, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

interface FooterProps {
  navigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate = () => {} }) => {
  const { openModal } = useCookieConsent();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-[#041B15] text-slate-600 dark:text-[#A7B9A8] border-t border-slate-200 dark:border-white/10 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3">
            <div className="font-mono text-sm tracking-[0.2em] font-semibold text-slate-900 dark:text-white uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#D7FF35]" />
              <span>GREENPAY / BLR</span>
            </div>
            <p className="text-slate-800 dark:text-white font-medium italic">
              "Waste responsibly. Track transparently. Earn sustainably."
            </p>
            <p className="text-slate-600 dark:text-[#A7B9A8] leading-relaxed text-[11px]">
              Independent civic software prototype designed to provide transparent household waste verification and explainable civic rewards in Bengaluru.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <div className="micro-label text-slate-900 dark:text-white font-semibold">Platform & Rewards</div>
            <ul className="space-y-2">
              <li>
                <button type="button" onClick={() => navigate('/how-it-works')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/catalog')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Grocery Rewards Catalogue
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  About & Municipal Independence
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/faq')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/qr-card')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Doorstep QR Identification
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div className="space-y-3">
            <div className="micro-label text-slate-900 dark:text-white font-semibold">Legal & DPDP 2023</div>
            <ul className="space-y-2">
              <li>
                <button type="button" onClick={() => navigate('/privacy')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Privacy Policy (DPDP Act)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/terms')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Terms of Service
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/refund-policy')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Credits & Redemptions Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/cookie-policy')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Cookie Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/accessibility')} className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition">
                  Accessibility Statement (WCAG 2.2 AA)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openModal}
                  className="text-emerald-700 dark:text-[#D7FF35] hover:underline transition font-medium"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Business & Grievance Contact */}
          <div className="space-y-3 text-[11px]">
            <div className="micro-label text-slate-900 dark:text-white font-semibold">Entity & Grievance Office</div>
            <div className="space-y-2 text-slate-600 dark:text-[#A7B9A8]">
              <div className="font-semibold text-slate-900 dark:text-white">
                {businessConfig.legalName || 'GreenPay Research Project'}
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                <span>{businessConfig.registeredAddress || 'Bengaluru, Karnataka, India'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a
                  href={`mailto:${businessConfig.contactEmail || 'contact@greenpay.blr'}`}
                  className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition"
                >
                  {businessConfig.contactEmail || 'contact@greenpay.blr'}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a
                  href={`tel:${businessConfig.contactPhone || '+918025534410'}`}
                  className="hover:text-emerald-700 dark:hover:text-[#D7FF35] transition"
                >
                  {businessConfig.contactPhone || '+91 80 2553 4410'}
                </a>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block">DPDP Grievance Officer:</span>
                <span className="text-slate-900 dark:text-white font-medium">{businessConfig.grievanceOfficerName || 'Grievance Redressal'}</span> (
                <a
                  href={`mailto:${businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}`}
                  className="text-emerald-700 dark:text-[#D7FF35] hover:underline"
                >
                  {businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}
                </a>
                )
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Non-Affiliation Notice */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/80 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A7B9A8] leading-relaxed text-[11px]">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-[#D7FF35]" />
            <span>Civic Prototype Non-Affiliation Declaration</span>
          </div>
          <p>
            GreenPay is an independent civic research and technological prototype for Bengaluru urban solid waste accountability. <strong>GreenPay is NOT affiliated with, authorized by, or an official agency of the Bruhat Bengaluru Mahanagara Palike (BBMP) or Greater Bengaluru Authority (GBA).</strong> All municipal ward statistics shown in this prototype are real database entries or explicitly marked demo data for civic research demonstration.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-neutral-400">
          <div>
            &copy; {currentYear} {businessConfig.legalName || 'GreenPay Project'}. All rights reserved. Made for Bengaluru.
          </div>
          <div className="flex items-center gap-6">
            <span>Points, NOT money. No payment processing.</span>
            <span>WCAG 2.2 AA Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

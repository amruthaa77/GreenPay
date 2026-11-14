import React from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { ShieldCheck, Cookie } from 'lucide-react';

export const CookiePolicyPage: React.FC = () => {
  const { openModal } = useCookieConsent();

  const cookiesList = [
    {
      name: 'gp_citizen_access',
      type: 'Cookie (httpOnly, Secure, SameSite=Lax)',
      category: 'Essential',
      purpose: 'Authenticates citizen requests and secures API communication.',
      duration: '15 minutes (rotating)',
    },
    {
      name: 'gp_citizen_refresh',
      type: 'Cookie (httpOnly, Secure, SameSite=Lax)',
      category: 'Essential',
      purpose: 'Enables automatic session refresh and token rotation without re-prompting login.',
      duration: '7 days',
    },
    {
      name: 'gp_citizen_csrf',
      type: 'Cookie (Secure, SameSite=Lax)',
      category: 'Essential',
      purpose: 'Double-submit CSRF protection token matching X-CSRF-Token header.',
      duration: '7 days',
    },
    {
      name: 'gp_admin_access',
      type: 'Cookie (httpOnly, Secure, SameSite=Lax)',
      category: 'Essential',
      purpose: 'Supervisor & Admin portal authentication scoped to administration boundaries.',
      duration: '15 minutes (rotating)',
    },
    {
      name: 'gp_admin_csrf',
      type: 'Cookie (Secure, SameSite=Lax)',
      category: 'Essential',
      purpose: 'CSRF token for supervisor and super-admin operations.',
      duration: '7 days',
    },
    {
      name: 'greenpay_cookie_consent_v1',
      type: 'localStorage',
      category: 'Preferences',
      purpose: 'Records your granular privacy choices (essential, preferences, analytics).',
      duration: 'Persistent (1 year)',
    },
    {
      name: 'greenpay_theme',
      type: 'localStorage',
      category: 'Preferences',
      purpose: 'Saves your dark / light theme preference.',
      duration: 'Persistent (1 year)',
    },
    {
      name: 'greenpay_lang',
      type: 'localStorage',
      category: 'Preferences',
      purpose: 'Saves your English or Kannada (ಕನ್ನಡ) interface preference.',
      duration: 'Persistent (1 year)',
    },
  ];

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">STORAGE INVENTORY & TRANSPARENCY</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Cookie & Storage Policy
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-[#A7B9A8] font-light">
          Complete transparent inventory of every cookie and browser storage key used by GreenPay. Zero third-party trackers.
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-8 text-xs text-[#A7B9A8] leading-relaxed">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#062B20]/90 border border-white/10">
          <div>
            <div className="font-semibold text-white">Manage Your Cookie Preferences</div>
            <p className="text-[11px] text-[#A7B9A8]">You can customize or revoke non-essential storage at any time.</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-glow-lime shrink-0"
          >
            Open Cookie Settings
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Full Cookie & Storage Inventory</h2>
          
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#062B20]/80">
            <table className="w-full text-left text-xs font-mono text-[#A7B9A8]">
              <thead className="border-b border-white/10 bg-[#062B20] text-[#A7B9A8] text-[11px] uppercase">
                <tr>
                  <th scope="col" className="p-3.5">Key Name</th>
                  <th scope="col" className="p-3.5">Mechanism</th>
                  <th scope="col" className="p-3.5">Category</th>
                  <th scope="col" className="p-3.5">Purpose</th>
                  <th scope="col" className="p-3.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cookiesList.map((c) => (
                  <tr key={c.name} className="hover:bg-white/5">
                    <td className="p-3.5 font-bold text-white">{c.name}</td>
                    <td className="p-3.5 text-[#A7B9A8] text-[11px]">{c.type}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30">
                        {c.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#A7B9A8] font-sans text-[11px]">{c.purpose}</td>
                    <td className="p-3.5 text-[#A7B9A8]">{c.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/10 text-[#A7B9A8] text-[11px]">
          <h3 className="font-semibold text-white">No Third-Party Advertising or Social Tracking</h3>
          <p>
            GreenPay does not embed Facebook Pixel, Google Ads, hotlinked tracking fonts, or third-party behavioral analytics. All fonts (Inter and Noto Sans Kannada) are self-hosted on our own origin.
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { businessConfig } from '@greenpay/config';
import { CheckCircle2, ShieldCheck, Eye, Keyboard, Globe } from 'lucide-react';

export const AccessibilityPage: React.FC = () => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12 text-slate-900 dark:text-[#F4F7F0]">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-emerald-700 dark:text-[#D7FF35]">UNIVERSAL CIVIC INCLUSION</span>
        <h1 className="text-3xl sm:text-5xl font-light text-slate-900 dark:text-white tracking-tight">
          Accessibility Statement
        </h1>
        <p className="text-xs text-slate-600 dark:text-[#A7B9A8] font-mono">
          WCAG 2.2 Level AA Conformance &bull; Tested with Axe-Core & Automated Contrast Unit Tests
        </p>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0D4935]/80 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-card-dark space-y-8 text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
        
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">1. Commitment to Civic Accessibility</h2>
          <p>
            Municipal software must be universally accessible to every resident of Bengaluru, regardless of physical ability, device, or primary language. GreenPay is designed and continuously audited to comply with the <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">2. Core Technical Measures Implemented</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <Keyboard className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Full Keyboard Navigation</span>
              </div>
              <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                Every CTA, dialog, tab, and form is fully navigable via Tab and Shift+Tab, with high-visibility 2px focus rings and Esc-to-close modals.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <Eye className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Verified Contrast Ratios</span>
              </div>
              <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                All text meets or exceeds &ge;4.5:1 contrast against backgrounds. UI elements and buttons exceed &ge;3.0:1 in both dark and light modes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <Globe className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Kannada Localization</span>
              </div>
              <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                Complete English and Kannada (ಕನ್ನಡ) interface with self-hosted Noto Sans Kannada font and dynamic <code>lang="kn"</code> switching.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-[#D7FF35]" />
                <span>Motion Sensitivity</span>
              </div>
              <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">
                Respects <code>prefers-reduced-motion</code>: 3D parallax and scroll transforms are cleanly disabled for users with vestibular sensitivities.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">3. Screen Reader & Landmark Standards</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-[#A7B9A8]">
            <li>Skip-to-main-content anchor at the top of every page.</li>
            <li>Single, logical <code>&lt;h1&gt;</code> per view with hierarchical heading structure.</li>
            <li>Forms use explicitly associated <code>&lt;label&gt;</code> tags and <code>aria-describedby</code> error announcements.</li>
            <li>Charts are paired with accessible data table alternatives.</li>
            <li>All interactive buttons meet minimum touch target dimensions &ge;44&times;44px.</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#062B20]/90 border border-slate-200 dark:border-white/10 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">Feedback & Accessibility Support</h3>
          <p className="text-slate-600 dark:text-[#A7B9A8] text-[11px]">
            If you encounter any accessibility barrier or have difficulty reading any component, please contact our team at{' '}
            <a href={`mailto:${businessConfig.contactEmail || 'contact@greenpay.blr'}`} className="text-emerald-700 dark:text-[#D7FF35] underline">
              {businessConfig.contactEmail || 'contact@greenpay.blr'}
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

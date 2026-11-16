import React, { useState } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { ShieldCheck, X } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const {
    hasConsented,
    isModalOpen,
    openModal,
    closeModal,
    acceptAll,
    rejectNonEssential,
    saveCustomPreferences,
    preferences,
  } = useCookieConsent();

  const [customPref, setCustomPref] = useState({
    preferences: preferences?.preferences ?? true,
    analytics: preferences?.analytics ?? false,
  });

  return (
    <>
      {/* Non-intrusive bottom banner if no choice made */}
      {!hasConsented && (
        <aside
          role="dialog"
          aria-label="Cookie and Privacy Consent Banner"
          aria-describedby="cookie-desc"
          className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6 bg-white/95 dark:bg-[#041B15]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white transition-colors duration-200"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-[#D7FF35]" aria-hidden="true" />
                <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-900 dark:text-white font-mono">
                  Privacy & Cookie Preferences
                </h2>
              </div>
              <p id="cookie-desc" className="text-xs text-slate-600 dark:text-[#A7B9A8] leading-relaxed">
                GreenPay uses essential cookies to secure your sessions and authenticate doorstep transactions. We do not use third-party advertising or cross-site trackers. You can choose whether to allow preference and analytics storage.
              </p>
            </div>

            {/* Equal Visual Prominence Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-mono font-medium uppercase tracking-wider text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#062B20] dark:hover:bg-[#0D4935] border border-slate-200 dark:border-white/15 transition"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={openModal}
                className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-mono font-medium uppercase tracking-wider text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#062B20] dark:hover:bg-[#0D4935] border border-slate-200 dark:border-white/15 transition"
              >
                Customise
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#0D4935] hover:bg-[#14543D] dark:text-[#041B15] dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] transition shadow-sm dark:shadow-glow-lime"
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Customise Modal (Also accessible from footer link) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeModal();
          }}
        >
          <div className="bg-white dark:bg-[#062B20] border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <h3 id="custom-modal-title" className="text-base font-semibold text-slate-900 dark:text-white">
                Customise Privacy & Storage Settings
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A7B9A8] dark:hover:text-white dark:hover:bg-white/5 transition"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-[#A7B9A8]">
              {/* Essential */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D4935]/60 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    Essential Security & Auth
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#D7FF35]/15 text-emerald-800 dark:text-[#D7FF35] border border-emerald-300 dark:border-[#D7FF35]/30">
                      Required
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-[#A7B9A8]">
                    Mandatory for secure authentication, CSRF double-submit tokens, and tamper-proof ledger requests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] accent-emerald-600 dark:accent-[#D7FF35] cursor-not-allowed opacity-75"
                />
              </div>

              {/* Preferences */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D4935]/60 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Interface Preferences</div>
                  <p className="mt-1 text-slate-600 dark:text-[#A7B9A8]">
                    Saves your chosen theme (dark/light) and preferred language (English/Kannada).
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="pref-toggle"
                  checked={customPref.preferences}
                  onChange={(e) => setCustomPref({ ...customPref, preferences: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] accent-emerald-600 dark:accent-[#D7FF35] focus:ring-emerald-500 dark:focus:ring-[#D7FF35] cursor-pointer"
                />
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D4935]/60 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Civic Waste Insights</div>
                  <p className="mt-1 text-slate-600 dark:text-[#A7B9A8]">
                    Aggregated anonymous metrics on ward segregation and system performance. No personal tracking.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="analytics-toggle"
                  checked={customPref.analytics}
                  onChange={(e) => setCustomPref({ ...customPref, analytics: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 dark:text-[#D7FF35] accent-emerald-600 dark:accent-[#D7FF35] focus:ring-emerald-500 dark:focus:ring-[#D7FF35] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 hover:text-slate-900 dark:text-[#A7B9A8] dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveCustomPreferences(customPref)}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#0D4935] hover:bg-[#14543D] dark:text-[#041B15] dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] transition shadow-sm dark:shadow-glow-lime"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

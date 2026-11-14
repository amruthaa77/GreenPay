import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { Menu, X, Globe, User as UserIcon, LogOut, QrCode, ShieldAlert, Calendar } from 'lucide-react';

import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentPath?: string;
  navigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath = '/', navigate = () => {} }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);

  // Authoritative Points Balance Synchronization for Citizen Header
  useEffect(() => {
    if (user) {
      api.citizen.getPointsBalance()
        .then((res) => {
          if (res && typeof res.current_balance === 'number') {
            setPointsBalance(res.current_balance);
          }
        })
        .catch(() => {});
    } else {
      setPointsBalance(null);
    }
  }, [user, currentPath]);

  // Close mobile menu on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        hamburgerBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* WCAG Skip to Content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 z-[100] px-4 py-2 bg-[#D7FF35] text-black font-semibold rounded-lg shadow-lg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 w-full bg-[#041B15]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Wordmark */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF35] rounded-lg p-1"
            aria-label="GreenPay Bengaluru Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#062B20] border border-[#D7FF35]/30 flex items-center justify-center group-hover:border-[#D7FF35] transition shadow-inner">
              <span className="text-[#D7FF35] font-bold text-xs tracking-tighter">GP</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase font-semibold tracking-[0.25em] text-white group-hover:text-[#D7FF35] transition">
                GREENPAY / BLR
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#A7B9A8]">
                Civic Prototype
              </span>
            </div>
          </button>

          {/* Centered Desktop Nav */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8">
            <button
              type="button"
              onClick={() => handleNav('/how-it-works')}
              className={`text-xs uppercase tracking-wider font-medium transition ${
                currentPath === '/how-it-works' ? 'text-[#D7FF35]' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {t('nav.how_it_works') || 'How It Works'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('/catalog')}
              className={`text-xs uppercase tracking-wider font-medium transition ${
                currentPath === '/catalog' ? 'text-[#D7FF35]' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {t('nav.rewards') || 'Grocery Rewards'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('/about')}
              className={`text-xs uppercase tracking-wider font-medium transition ${
                currentPath === '/about' ? 'text-[#D7FF35]' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {t('nav.about') || 'About'}
            </button>
            <button
              type="button"
              onClick={() => handleNav('/faq')}
              className={`text-xs uppercase tracking-wider font-medium transition ${
                currentPath === '/faq' ? 'text-[#D7FF35]' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {t('nav.faq') || 'FAQ'}
            </button>
          </nav>

          {/* Right Action: ThemeToggle, Language Switcher, Notifications & Auth CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* 3-way Theme Toggle (Light / Dark / System) */}
            <ThemeToggle />

            {/* Bilingual Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
              className="px-2.5 py-1.5 rounded-lg bg-[#062B20]/80 border border-white/10 hover:border-[#D7FF35]/40 text-xs font-mono flex items-center gap-1.5 text-[#A7B9A8] hover:text-white transition"
              aria-label={`Switch language to ${language === 'en' ? 'Kannada' : 'English'}`}
            >
              <Globe className="w-3.5 h-3.5 text-[#D7FF35]" aria-hidden="true" />
              <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* In-App Notification Bell */}
                <NotificationBell navigate={handleNav} />

                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#062B20]/80 border border-white/15 hover:border-[#D7FF35]/50 text-xs font-medium text-white flex items-center gap-2 transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#D7FF35]" />
                  <span>{user.name.split(' ')[0]}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#D7FF35]/15 text-[#D7FF35] border border-[#D7FF35]/30">
                    {pointsBalance !== null ? `${pointsBalance.toFixed(1)} GP` : `${user.green_score.toFixed(0)}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/qr-card')}
                  className="p-2 rounded-xl bg-[#062B20]/80 border border-white/10 hover:border-[#D7FF35]/40 text-[#A7B9A8] hover:text-white transition"
                  title="My QR ID Card"
                  aria-label="My QR ID Card"
                >
                  <QrCode className="w-4 h-4 text-[#D7FF35]" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/disputes')}
                  className="p-2 rounded-xl bg-[#062B20]/80 border border-white/10 hover:border-amber-500/30 text-[#A7B9A8] hover:text-white transition"
                  title={t('nav.disputes') || 'Disputes & Tickets'}
                  aria-label={t('nav.disputes') || 'Disputes & Tickets'}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/schedule')}
                  className="p-2 rounded-xl bg-[#062B20]/80 border border-white/10 hover:border-[#D7FF35]/40 text-[#A7B9A8] hover:text-white transition"
                  title={t('nav.schedule') || 'Collection Schedule'}
                  aria-label={t('nav.schedule') || 'Collection Schedule'}
                >
                  <Calendar className="w-4 h-4 text-[#D7FF35]" />
                </button>

                <button
                  type="button"
                  onClick={() => logout().then(() => handleNav('/'))}
                  className="p-2 rounded-xl bg-[#062B20]/80 border border-white/10 hover:border-rose-500/30 text-[#A7B9A8] hover:text-rose-400 transition"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNav('/login')}
                  className="px-3 py-1.5 text-xs uppercase tracking-wider text-neutral-300 hover:text-white transition"
                >
                  {t('nav.login') || 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/register')}
                  className="px-4 py-2 rounded-xl border border-[#D7FF35] text-[#D7FF35] hover:bg-[#D7FF35] hover:text-black font-semibold text-xs uppercase tracking-wider transition shadow-glow-lime"
                >
                  {t('nav.register') || 'Register'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
              className="p-2 rounded-lg bg-[#0D4935]/80 border border-white/10 text-xs font-mono text-neutral-300"
              aria-label="Toggle language"
            >
              {language === 'en' ? 'ಕನ್ನಡ' : 'EN'}
            </button>
            {user && <NotificationBell navigate={handleNav} />}
            <button
              ref={hamburgerBtnRef}
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[#0D4935]/80 border border-white/10 text-white min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF35]"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with Focus Trap */}
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-b border-white/10 bg-[#041B15]/98 px-4 pt-3 pb-6 space-y-4 shadow-2xl backdrop-blur-lg"
          >
            <nav className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => handleNav('/')}
                className="text-left py-2.5 text-sm uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => handleNav('/how-it-works')}
                className="text-left py-2.5 text-sm uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => handleNav('/catalog')}
                className="text-left py-2.5 text-sm uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                Grocery Rewards
              </button>
              <button
                type="button"
                onClick={() => handleNav('/about')}
                className="text-left py-2.5 text-sm uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                About & Non-Affiliation
              </button>
              <button
                type="button"
                onClick={() => handleNav('/faq')}
                className="text-left py-2.5 text-sm uppercase tracking-wider text-neutral-300 hover:text-white"
              >
                FAQ
              </button>
            </nav>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('/dashboard')}
                    className="w-full py-3 rounded-xl bg-[#062B20]/90 border border-white/10 hover:border-[#D7FF35]/30 text-center text-sm font-semibold text-white transition"
                  >
                    Citizen Dashboard ({pointsBalance !== null ? `${pointsBalance.toFixed(1)} GP` : `${user.green_score.toFixed(0)} Pts`})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/qr-card')}
                    className="w-full py-3 rounded-xl bg-[#062B20]/90 border border-white/10 hover:border-[#D7FF35]/30 text-center text-sm font-semibold text-[#D7FF35] transition"
                  >
                    Download QR Card ({user.greenpay_id})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/disputes')}
                    className="w-full py-3 rounded-xl bg-[#062B20]/90 border border-white/10 hover:border-amber-400/30 text-center text-sm font-semibold text-amber-300 transition"
                  >
                    Disputes & Problem Tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/schedule')}
                    className="w-full py-3 rounded-xl bg-[#062B20]/90 border border-white/10 hover:border-[#D7FF35]/30 text-center text-sm font-semibold text-[#A7B9A8] transition"
                  >
                    {t('nav.schedule') || 'Collection Schedule'}
                  </button>

                  <button
                    type="button"
                    onClick={() => logout().then(() => handleNav('/'))}
                    className="w-full py-2.5 text-center text-xs text-rose-400"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('/login')}
                    className="w-full py-3 rounded-xl bg-[#062B20]/90 border border-white/10 text-center text-sm font-semibold text-white transition"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('/register')}
                    className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider text-center transition shadow-glow-lime"
                  >
                    Register Citizen Account
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

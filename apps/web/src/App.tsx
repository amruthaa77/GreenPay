import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Pages
import { LandingPage } from './pages/LandingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { GreenScoreExplainedPage } from './pages/GreenScoreExplainedPage';
import { WardsPage } from './pages/WardsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { AccessibilityPage } from './pages/AccessibilityPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { CitizenQRPage } from './pages/CitizenQRPage';
import { WasteHistoryPage } from './pages/WasteHistoryPage';
import { CreditsLedgerPage } from './pages/CreditsLedgerPage';
import { CitizenSettingsPage } from './pages/CitizenSettingsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DisputesPage } from './pages/DisputesPage';
import { SchedulePage } from './pages/SchedulePage';
import { RedemptionCataloguePage } from './pages/RedemptionCataloguePage';
import { PublicCertificateVerifyPage } from './pages/PublicCertificateVerifyPage';
import { NotFoundPage } from './pages/NotFoundPage';


const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'GreenPay | Transparent Household Waste Tracking in Bengaluru',
    description: 'Independent civic platform for transparent doorstep waste collection and explainable Green Scores in Bengaluru.',
  },
  '/how-it-works': {
    title: 'How It Works | GreenPay Bengaluru',
    description: 'Understand the step-by-step verified collection process from doorstep weighment to immutable civic credit recording.',
  },
  '/green-score': {
    title: 'Green Score Simulator & Formula | GreenPay Bengaluru',
    description: 'Explore our explainable 0–100 Green Score model: segregation quality, collection regularity, and volume balance.',
  },
  '/wards': {
    title: 'Bengaluru Wards Waste Statistics | GreenPay Demo Data',
    description: 'Simulated ward-level collection volume, segregation percentages, and municipal tracking across Koramangala, Indiranagar, Jayanagar, and Whitefield.',
  },
  '/about': {
    title: 'About GreenPay | Municipal Independence & Verification',
    description: 'GreenPay is an independent prototype civic technology project. Not affiliated with BBMP or GBA.',
  },
  '/contact': {
    title: 'Contact & Grievance Redressal | GreenPay',
    description: 'Get in touch with the GreenPay team or reach our designated DPDP Act Data Protection Officer.',
  },
  '/faq': {
    title: 'Frequently Asked Questions | GreenPay Bengaluru',
    description: 'Detailed answers regarding Green Credits, electricity meter identity binding, QR cards, and privacy rights.',
  },
  '/login': {
    title: 'Citizen Login | GreenPay',
    description: 'Log in with your electricity meter number and password to access your Green Score and collection ledger.',
  },
  '/register': {
    title: 'Citizen Registration | GreenPay',
    description: 'Register your household with your electricity meter number for verified doorstep waste collections.',
  },
  '/privacy': {
    title: 'Privacy Policy (DPDP Act 2023) | GreenPay',
    description: 'Transparent disclosure of personal data processing, encryption, pseudonymised erasure, and citizen rights.',
  },
  '/terms': {
    title: 'Terms of Service | GreenPay',
    description: 'Terms governing participation in the GreenPay civic waste collection and points recognition platform.',
  },
  '/refund-policy': {
    title: 'Civic Points & Refund Policy | GreenPay',
    description: 'Green Credits are non-monetary civic points. No monetary transactions, wallet deposits, or refunds.',
  },
  '/cookie-policy': {
    title: 'Cookie Policy & Consent Inventory | GreenPay',
    description: 'Granular cookie breakdown for technical security, privacy preferences, and session tokens.',
  },
  '/accessibility': {
    title: 'Accessibility Statement (WCAG 2.2 AA) | GreenPay',
    description: 'Our commitment to inclusive, accessible design adhering strictly to WCAG 2.2 Level AA standards.',
  },
  '/dashboard': {
    title: 'Citizen Dashboard | GreenPay',
    description: 'Inspect your live Green Score breakdown, verified collection receipts, and append-only Green Credits.',
  },
  '/qr-card': {
    title: 'Permanent Citizen QR ID Card | GreenPay',
    description: 'High-contrast permanent citizen QR code card for doorstep supervisor verification.',
  },
  '/history': {
    title: 'Verified Waste Collection History | GreenPay',
    description: 'Detailed audit trail of all supervisor-verified household waste collections.',
  },
  '/credits': {
    title: 'Green Credits Ledger | GreenPay',
    description: 'Append-only immutable transaction log of all civic credits earned and auditable reversals.',
  },
  '/settings': {
    title: 'Citizen Settings & DPDP Controls | GreenPay',
    description: 'Email preference centre, DPDP data export (JSON), and pseudonymised account erasure.',
  },
  '/forgot-password': {
    title: 'Forgot Password | GreenPay Bengaluru',
    description: 'Request password reset instructions for your GreenPay account.',
  },
  '/reset-password': {
    title: 'Reset Password | GreenPay Bengaluru',
    description: 'Create a new secure password for your GreenPay account.',
  },
  '/notifications': {
    title: 'Notification Centre | GreenPay Bengaluru',
    description: 'Audit log of doorstep collections, score calculations, and security notices.',
  },
  '/disputes': {
    title: 'Disputes & Tickets | GreenPay Bengaluru',
    description: 'File, inspect, and resolve weighment disputes and missed collection tickets.',
  },
  '/schedule': {
    title: 'Ward Collection Schedules & Calendar | GreenPay',
    description: 'Check verified doorstep waste collection schedules, time windows, and download iCal subscriptions.',
  },
  '/rewards': {
    title: 'Grocery Rewards Catalogue | GreenPay Bengaluru',
    description: 'Redeem verified Green Points for essential grocery staples: Rice, Toor Dal, Sunflower Cooking Oil, Sugar, and Iodized Salt.',
  },
  '/catalog': {
    title: 'Grocery Rewards Catalogue | GreenPay Bengaluru',
    description: 'Redeem verified Green Points for essential grocery staples: Rice, Toor Dal, Sunflower Cooking Oil, Sugar, and Iodized Salt.',
  },
  '/redeem': {
    title: 'Grocery Rewards Catalogue | GreenPay Bengaluru',
    description: 'Redeem verified Green Points for essential grocery staples: Rice, Toor Dal, Sunflower Cooking Oil, Sugar, and Iodized Salt.',
  },
  '/verify-certificate': {
    title: 'Certificate Verification | GreenPay Bengaluru',
    description: 'Official public registry for verified Green Household recognition certificates in Bengaluru.',
  },
};


export const App: React.FC = () => {
  const { user, loading, backendError, retryAuth } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync with browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update Page Title and Meta Tags (Amendment #5)
  useEffect(() => {
    const meta = PAGE_META[currentPath] || {
      title: 'GreenPay Bengaluru',
      description: 'Independent civic platform for transparent household waste tracking in Bengaluru.',
    };
    document.title = meta.title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', meta.description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', meta.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', meta.description);
  }, [currentPath]);

  // Protected route check
  const protectedRoutes = ['/dashboard', '/qr-card', '/history', '/credits', '/settings', '/notifications', '/disputes', '/schedule'];
  const isProtected = protectedRoutes.includes(currentPath);

  // If user is accessing a protected route and auth is still resolving, show loader with guaranteed safety timeout
  if (isProtected && loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#D7FF35] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#A7B9A8]">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is trying to access a protected route and backend service is unreachable, show retry view
  if (isProtected && !user && backendError) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0]">
        <Navbar currentPath={currentPath} navigate={navigate} />
        <main id="main-content" className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#0D4935] border border-amber-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">Service Temporarily Unavailable</h2>
            <p className="text-xs text-[#A7B9A8] leading-relaxed">
              {backendError}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => retryAuth()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-glow-lime"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#A7B9A8] hover:text-white text-xs font-medium transition"
              >
                Return to Home
              </button>
            </div>
          </div>
        </main>
        <Footer navigate={navigate} />
      </div>
    );
  }

  // Redirect unauthenticated user trying to access protected route to Login
  if (isProtected && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0]">
        <Navbar currentPath={currentPath} navigate={navigate} />
        <main id="main-content" className="flex-1">
          <LoginPage navigate={navigate} />
        </main>
        <Footer navigate={navigate} />
      </div>
    );
  }

  // Render appropriate view
  const renderContent = () => {
    if (currentPath.startsWith('/verify-certificate')) {
      const parts = currentPath.split('/');
      const certParam = parts.length > 2 && parts[2] ? parts[2] : (new URLSearchParams(window.location.search).get('code') || '');
      return <PublicCertificateVerifyPage initialCode={certParam} navigate={navigate} />;
    }

    switch (currentPath) {
      case '/':
        return <LandingPage navigate={navigate} />;
      case '/how-it-works':
        return <HowItWorksPage navigate={navigate} />;
      case '/green-score':
        return <GreenScoreExplainedPage />;
      case '/wards':
        return <WardsPage />;
      case '/about':
        return <AboutPage />;
      case '/contact':
        return <ContactPage />;
      case '/faq':
        return <FAQPage />;
      case '/login':
        return <LoginPage navigate={navigate} />;
      case '/register':
        return <RegisterPage navigate={navigate} />;
      case '/forgot-password':
        return <ForgotPasswordPage navigate={navigate} />;
      case '/reset-password':
        return <ResetPasswordPage navigate={navigate} />;
      case '/privacy':
        return <PrivacyPolicyPage />;
      case '/terms':
        return <TermsPage />;
      case '/refund-policy':
        return <RefundPolicyPage />;
      case '/cookie-policy':
        return <CookiePolicyPage />;
      case '/accessibility':
        return <AccessibilityPage />;
      case '/dashboard':
        return <CitizenDashboard navigate={navigate} />;
      case '/qr-card':
        return <CitizenQRPage />;
      case '/history':
        return <WasteHistoryPage />;
      case '/credits':
        return <CreditsLedgerPage />;
      case '/settings':
        return <CitizenSettingsPage navigate={navigate} />;
      case '/notifications':
        return <NotificationsPage navigate={navigate} />;
      case '/disputes':
        return <DisputesPage navigate={navigate} />;
      case '/schedule':
        return <SchedulePage navigate={navigate} />;
      case '/rewards':
      case '/catalog':
      case '/redeem':
        return <RedemptionCataloguePage navigate={navigate} />;
      default:
        return <NotFoundPage navigate={navigate} />;

    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0] font-sans selection:bg-[#D7FF35]/30 selection:text-[#041B15] transition-colors duration-200">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <main id="main-content" className="flex-1">
        {renderContent()}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminNavbar } from './components/AdminNavbar';

// Admin & Supervisor pages
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { SupervisorPortalPage } from './pages/SupervisorPortalPage';
import { WardAnalyticsPage } from './pages/WardAnalyticsPage';
import { SupervisorInvitesPage } from './pages/SupervisorInvitesPage';
import { RewardSchedulePage } from './pages/RewardSchedulePage';
import { AnomalyReviewPage } from './pages/AnomalyReviewPage';
import { PredictiveForecastPage } from './pages/PredictiveForecastPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AdminForgotPasswordPage } from './pages/AdminForgotPasswordPage';
import { AdminResetPasswordPage } from './pages/AdminResetPasswordPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { DisputesPage } from './pages/DisputesPage';
import { WardSchedulePage } from './pages/WardSchedulePage';
import { SupervisorManagementPage } from './pages/SupervisorManagementPage';
import { CitizenManagementPage } from './pages/CitizenManagementPage';
import { CollectionManagementPage } from './pages/CollectionManagementPage';

export const App: React.FC = () => {
  const { user, loading, isSuperAdmin, isSupervisor } = useAdminAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Browser back / forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public unauthenticated routes render immediately
  if (currentPath === '/accept-invite') {
    return <AcceptInvitePage navigate={navigate} />;
  }

  if (currentPath === '/forgot-password') {
    return <AdminForgotPasswordPage navigate={navigate} />;
  }

  if (currentPath.startsWith('/reset-password')) {
    return <AdminResetPasswordPage navigate={navigate} />;
  }

  // If resolving stored session on administrative views
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#D7FF35] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-500 dark:text-[#A7B9A8]">Checking GreenPay credentials...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> show Login page
  if (!user) {
    return <AdminLoginPage navigate={navigate} />;
  }

  // Content selector
  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return isSuperAdmin ? <WardAnalyticsPage /> : <SupervisorPortalPage />;
      case '/supervisor':
        return <SupervisorPortalPage />;
      case '/analytics':
        return isSuperAdmin ? <WardAnalyticsPage /> : <SupervisorPortalPage />;
      case '/citizens':
        return isSuperAdmin ? <CitizenManagementPage /> : <SupervisorPortalPage />;
      case '/collections':
        return isSuperAdmin ? <CollectionManagementPage /> : <SupervisorPortalPage />;
      case '/supervisors':
        return isSuperAdmin ? <SupervisorManagementPage /> : <SupervisorPortalPage />;
      case '/invites':
        return isSuperAdmin ? <SupervisorInvitesPage /> : <SupervisorPortalPage />;
      case '/rewards':
        return isSuperAdmin ? <RewardSchedulePage /> : <SupervisorPortalPage />;
      case '/anomalies':
        return isSuperAdmin ? <AnomalyReviewPage /> : <SupervisorPortalPage />;
      case '/forecast':
        return isSuperAdmin ? <PredictiveForecastPage /> : <SupervisorPortalPage />;
      case '/audit-logs':
      case '/audit':
        return isSuperAdmin ? <AuditLogsPage /> : <SupervisorPortalPage />;
      case '/disputes':
        return <DisputesPage />;
      case '/schedules':
        return <WardSchedulePage />;
      case '/settings':
        return <AdminSettingsPage />;
      default:
        return isSuperAdmin ? <WardAnalyticsPage /> : <SupervisorPortalPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F0] dark:bg-[#041B15] text-[#062B20] dark:text-[#F4F7F0] font-sans selection:bg-[#D7FF35]/30 selection:text-[#041B15] transition-colors duration-200">
      <AdminNavbar
        currentPath={currentPath}
        navigate={navigate}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        } flex flex-col min-h-screen`}
      >
        <main id="main-content" className="flex-1 w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

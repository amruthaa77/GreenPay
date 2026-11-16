import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { offlineQueue } from '../services/offlineQueue';
import {
  ShieldCheck,
  Scale,
  BarChart3,
  Mail,
  Award,
  AlertTriangle,
  TrendingUp,
  FileText,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertOctagon,
  Menu,
  X,
  ShieldAlert,
  Calendar,
  Users,
  UserCheck,
  Layers,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface AdminNavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  onOpenConflicts?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  isActive: (currentPath: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'weighment',
    label: 'Weighment',
    path: '/supervisor',
    icon: Scale,
    isActive: (p) => p === '/supervisor',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/analytics',
    icon: BarChart3,
    superAdminOnly: true,
    isActive: (p) => p === '/analytics' || p === '/',
  },
  {
    id: 'citizens',
    label: 'Citizens',
    path: '/citizens',
    icon: UserCheck,
    superAdminOnly: true,
    isActive: (p) => p === '/citizens',
  },
  {
    id: 'collections',
    label: 'Collections',
    path: '/collections',
    icon: Layers,
    superAdminOnly: true,
    isActive: (p) => p === '/collections',
  },
  {
    id: 'supervisors',
    label: 'Supervisors',
    path: '/supervisors',
    icon: Users,
    superAdminOnly: true,
    isActive: (p) => p === '/supervisors',
  },
  {
    id: 'invites',
    label: 'Invites',
    path: '/invites',
    icon: Mail,
    superAdminOnly: true,
    isActive: (p) => p === '/invites',
  },
  {
    id: 'rewards',
    label: 'Reward Rules',
    path: '/rewards',
    icon: Award,
    superAdminOnly: true,
    isActive: (p) => p === '/rewards',
  },
  {
    id: 'anomalies',
    label: 'Anomalies',
    path: '/anomalies',
    icon: AlertTriangle,
    superAdminOnly: true,
    isActive: (p) => p === '/anomalies',
  },
  {
    id: 'forecast',
    label: 'Forecast',
    path: '/forecast',
    icon: TrendingUp,
    superAdminOnly: true,
    isActive: (p) => p === '/forecast',
  },
  {
    id: 'audit',
    label: 'Audit',
    path: '/audit-logs',
    icon: FileText,
    superAdminOnly: true,
    isActive: (p) => p === '/audit-logs' || p === '/audit',
  },
  {
    id: 'disputes',
    label: 'Disputes',
    path: '/disputes',
    icon: ShieldAlert,
    isActive: (p) => p === '/disputes',
  },
  {
    id: 'schedules',
    label: 'Schedules',
    path: '/schedules',
    icon: Calendar,
    isActive: (p) => p === '/schedules',
  },
  {
    id: 'security',
    label: 'Security',
    path: '/settings',
    icon: ShieldCheck,
    isActive: (p) => p === '/settings',
  },
];

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  currentPath,
  navigate,
  onOpenConflicts,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout, isSuperAdmin } = useAdminAuth();
  const [syncState, setSyncState] = useState(offlineQueue.getSyncState());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  useEffect(() => {
    return offlineQueue.subscribe(() => {
      setSyncState(offlineQueue.getSyncState());
    });
  }, []);

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP & TABLET FIXED VERTICAL SIDEBAR              */}
      {/* ======================================================== */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-white dark:bg-[#041B15] border-r border-slate-200 dark:border-white/10 select-none transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        aria-label="Admin Navigation Sidebar"
      >
        {/* Top Section: Branding, Logo & Super Admin Badge */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNav(isSuperAdmin ? '/analytics' : '/supervisor')}
              className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-[#D7FF35] rounded-xl group transition min-w-0"
              title="GreenPay Operations"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#062B20] border border-emerald-500/30 dark:border-[#D7FF35]/30 flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-600 dark:group-hover:border-[#D7FF35]/60 transition">
                <span className="text-[#0D4935] dark:text-[#D7FF35] font-bold text-sm tracking-tighter">GP</span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-xs uppercase font-bold tracking-[0.18em] text-slate-900 dark:text-white truncate">
                    GREENPAY / OPS
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8] font-mono tracking-wider truncate">
                    MUNICIPAL GOVERNANCE
                  </span>
                </div>
              )}
            </button>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              className={`p-1.5 rounded-lg text-slate-500 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition shrink-0 ${
                isCollapsed ? 'mx-auto mt-2' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4 text-emerald-600 dark:text-[#D7FF35]" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Role Badge (Expanded view only) */}
          {!isCollapsed && (
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isSuperAdmin
                    ? 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {isSuperAdmin
                  ? 'SUPER ADMIN'
                  : user?.profile?.ward_name
                  ? `SUPERVISOR • ${user.profile.ward_name}`
                  : 'FIELD SUPERVISOR'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items List (Scrollable) */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar"
          aria-label="Main Navigation"
        >
          {visibleNavItems.map((item) => {
            const active = item.isActive(currentPath);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.path)}
                title={item.label}
                className={`w-full flex items-center transition-all group ${
                  isCollapsed
                    ? 'justify-center p-2.5 rounded-xl'
                    : 'gap-3 px-3 py-2.5 rounded-xl text-xs font-medium'
                } ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold shadow-sm dark:bg-[#0D4935] dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                    : 'text-slate-600 dark:text-[#A7B9A8] hover:bg-slate-100 dark:hover:bg-[#062B20]/80 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-emerald-700 dark:text-[#D7FF35]' : 'text-slate-500 dark:text-[#A7B9A8] group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#D7FF35] shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section: Sync Status, User Info, Sign Out */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2.5 shrink-0 bg-slate-50/80 dark:bg-[#041B15]">
          {/* Conflict Alert (if any) */}
          {syncState.rejectedCount > 0 && onOpenConflicts && (
            <button
              type="button"
              onClick={onOpenConflicts}
              className={`w-full rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 animate-pulse ${
                isCollapsed ? 'p-2' : 'px-3 py-1.5'
              }`}
              title="View sync conflicts"
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && <span>{syncState.rejectedCount} Conflicts</span>}
            </button>
          )}

          {/* Online / Offline / Sync Status Indicator */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5 text-[11px] font-mono">
              <div className="flex items-center gap-2 min-w-0">
                {syncState.isOnline ? (
                  syncState.pendingCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => offlineQueue.syncPending()}
                      className="text-blue-600 dark:text-blue-300 flex items-center gap-1.5 hover:underline"
                      title="Click to sync pending items"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                      />
                      <span>Syncing ({syncState.pendingCount})</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-[#D7FF35]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-[#D7FF35] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-[#D7FF35]"></span>
                      </span>
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="font-semibold">Online</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Offline ({syncState.pendingCount})</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8]">v2.4</span>
            </div>
          ) : (
            <div
              className="flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-[#062B20]/60 border border-slate-200 dark:border-white/5 text-[11px]"
              title={syncState.isOnline ? 'System Online' : `Offline (${syncState.pendingCount})`}
            >
              {syncState.isOnline ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-[#D7FF35] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600 dark:bg-[#D7FF35]"></span>
                </span>
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
          )}

          {/* User Profile Info (Expanded view) */}
          {!isCollapsed && user && (
            <div className="px-2 py-1 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-[#0D4935] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-[#D7FF35] shrink-0">
                {(user.profile?.name?.[0] || user.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {user.profile?.name || (isSuperAdmin ? 'Super Admin' : 'Field Supervisor')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8] font-mono truncate">
                  {user.email || user.greenpay_id}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:hover:bg-red-500/15 dark:hover:text-red-300 text-slate-700 dark:text-[#A7B9A8] border border-slate-200 hover:border-red-300 dark:border-white/5 dark:hover:border-red-500/30 text-xs font-medium transition ${
              isCollapsed ? 'p-2' : 'px-3 py-2'
            }`}
            title="Log out and wipe offline queue"
            aria-label="Log out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE HEADER BAR (< md)                             */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 w-full h-14 bg-white/95 dark:bg-[#041B15]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleNav(isSuperAdmin ? '/analytics' : '/supervisor')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#062B20] border border-emerald-500/30 dark:border-[#D7FF35]/30 flex items-center justify-center">
            <span className="text-[#0D4935] dark:text-[#D7FF35] font-bold text-xs tracking-tighter">GP</span>
          </div>
          <span className="font-mono text-xs uppercase font-bold tracking-[0.18em] text-slate-900 dark:text-white">
            GREENPAY / OPS
          </span>
        </button>

        <div className="flex items-center gap-2">
          {/* Online badge */}
          {syncState.isOnline ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#D7FF35]" />
              <span>Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 text-[10px] font-mono">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </span>
          )}

          {/* Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE SLIDE-OVER DRAWER WITH BACKDROP               */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#041B15] border-r border-slate-200 dark:border-white/10 flex flex-col h-full z-10 shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#062B20] border border-emerald-500/30 dark:border-[#D7FF35]/30 flex items-center justify-center">
                  <span className="text-[#0D4935] dark:text-[#D7FF35] font-bold text-xs tracking-tighter">GP</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xs uppercase font-bold tracking-[0.18em] text-slate-900 dark:text-white">
                    GREENPAY / OPS
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-[#A7B9A8] font-mono">MUNICIPAL GOVERNANCE</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#A7B9A8] hover:text-slate-900 dark:hover:text-white"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Pill inside drawer */}
            <div className="px-4 pt-3 pb-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isSuperAdmin
                    ? 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-[#D7FF35]/15 dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {isSuperAdmin
                  ? 'SUPER ADMIN'
                  : user?.profile?.ward_name
                  ? `SUPERVISOR • ${user.profile.ward_name}`
                  : 'FIELD SUPERVISOR'}
              </span>
            </div>

            {/* Nav items list inside drawer */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {visibleNavItems.map((item) => {
                const active = item.isActive(currentPath);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 dark:bg-[#0D4935] dark:text-[#D7FF35] dark:border-[#D7FF35]/30'
                        : 'text-slate-600 dark:text-[#A7B9A8] hover:bg-slate-100 dark:hover:bg-[#062B20]/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700 dark:text-[#D7FF35]' : 'text-slate-500 dark:text-[#A7B9A8]'}`}
                    />
                    <span className="truncate">{item.label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#D7FF35]" />}
                  </button>
                );
              })}
            </div>

            {/* Bottom status & logout in drawer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 space-y-3 bg-slate-50 dark:bg-[#041B15]">
              {user && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-[#0D4935] border border-emerald-300 dark:border-[#D7FF35]/30 flex items-center justify-center text-xs font-bold text-emerald-800 dark:text-[#D7FF35] shrink-0">
                    {(user.profile?.name?.[0] || user.email?.[0] || 'A').toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {user.profile?.name || (isSuperAdmin ? 'Super Admin' : 'Field Supervisor')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#A7B9A8] font-mono truncate">
                      {user.email || user.greenpay_id}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:hover:bg-red-500/15 dark:hover:text-red-300 text-slate-700 dark:text-[#A7B9A8] text-xs font-medium transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

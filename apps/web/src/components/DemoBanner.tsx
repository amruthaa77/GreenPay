import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, LogOut, ShieldCheck } from 'lucide-react';

interface DemoBannerProps {
  navigate?: (path: string) => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ navigate }) => {
  const { isDemo, user, logout } = useAuth();

  if (!isDemo && !user?.is_demo) {
    return null;
  }

  const handleExit = async () => {
    await logout();
    if (navigate) {
      navigate('/login');
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div
      role="region"
      aria-label="Demonstration Mode Banner"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs backdrop-blur-sm z-50 sticky top-0"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="p-1 rounded bg-amber-400 text-black font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
            <FlaskConical className="w-3.5 h-3.5" />
            Demo Mode
          </span>
          <span className="font-medium text-amber-100">
            {user ? `Logged in as ${user.name} (${user.greenpay_id || 'Citizen'})` : 'Academic Demonstration Session'}
          </span>
          <span className="hidden md:inline text-amber-300/70 text-[11px]">
            — Isolated demo environment. Real citizen records and production credentials are protected.
          </span>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border border-amber-400/40 text-[11px] font-medium transition"
        >
          <LogOut className="w-3 h-3" />
          <span>Exit Demo</span>
        </button>
      </div>
    </div>
  );
};

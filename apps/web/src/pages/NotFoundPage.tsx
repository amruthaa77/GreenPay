import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  navigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundProps> = ({ navigate }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-6 text-slate-900 dark:text-[#F4F7F0]">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#062B20] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-700 dark:text-[#D7FF35] font-mono text-2xl font-bold shadow-sm dark:shadow-glow-lime-sm">
        404
      </div>
      <h1 className="text-3xl sm:text-5xl font-light text-slate-900 dark:text-white tracking-tight">
        Page Not Found
      </h1>
      <p className="max-w-md text-xs sm:text-sm text-slate-600 dark:text-[#A7B9A8] font-light leading-relaxed">
        The requested civic route does not exist or has been relocated within the Bengaluru GreenPay network.
      </p>
      <div className="pt-2 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-[#0D4935] hover:bg-[#14543D] text-white dark:bg-[#D7FF35] dark:hover:bg-[#C4F020] dark:text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-sm dark:shadow-glow-lime flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};

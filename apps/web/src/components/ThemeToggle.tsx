import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = resolvedTheme === 'dark';

  const label = isDark
    ? (t('theme.light') || 'Light Theme')
    : (t('theme.dark') || 'Dark Theme');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 p-2 rounded-xl transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF35] ${
        isDark
          ? 'bg-[#062B20]/80 hover:bg-[#0D4935] text-[#D7FF35] border-white/10 hover:border-[#D7FF35]/40 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-amber-600 border-slate-300 hover:border-emerald-600/40 shadow-sm'
      } ${className}`}
      title={isDark ? `Switch to ${label}` : `Switch to ${label}`}
      aria-label={isDark ? `Switch to ${label}` : `Switch to ${label}`}
      data-testid="theme-toggle"
    >
      <span className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 rotate-0 scale-100" />
        )}
      </span>
      {showLabel && (
        <span className="text-xs font-mono font-medium truncate">
          {label}
        </span>
      )}
    </button>
  );
};

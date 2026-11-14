import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light', label: t('theme.light') || 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: t('theme.dark') || 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: 'system', label: t('theme.system') || 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  const currentIcon =
    themeMode === 'light' ? (
      <Sun className="w-4 h-4 text-amber-400" />
    ) : themeMode === 'dark' ? (
      <Moon className="w-4 h-4 text-[#D7FF35]" />
    ) : (
      <Monitor className="w-4 h-4 text-sky-400" />
    );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-[#062B20]/80 border border-white/10 hover:border-[#D7FF35]/40 text-[#A7B9A8] hover:text-white transition flex items-center justify-center min-w-[36px] min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF35]"
        aria-label={`Current theme: ${themeMode}. Click to switch theme.`}
        aria-expanded={isOpen}
      >
        {currentIcon}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-36 rounded-xl bg-[#062B20] border border-white/10 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              role="menuitem"
              onClick={() => {
                setThemeMode(opt.mode);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-xs flex items-center gap-2.5 transition text-left ${
                themeMode === opt.mode
                  ? 'bg-[#D7FF35]/15 text-[#D7FF35] font-medium'
                  : 'text-[#A7B9A8] hover:bg-white/5 hover:text-white'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

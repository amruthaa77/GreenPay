import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CookiePreferences {
  essential: boolean; // Always true
  preferences: boolean; // Theme, language
  analytics: boolean; // Civic usage statistics
  timestamp: string;
}

interface CookieConsentContextType {
  preferences: CookiePreferences | null;
  hasConsented: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveCustomPreferences: (prefs: { preferences: boolean; analytics: boolean }) => void;
}

const STORAGE_KEY = 'greenpay_cookie_consent_v1';

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const CookieConsentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(true); // default true until checked
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
        setHasConsented(true);
      } else {
        setHasConsented(false);
      }
    } catch {
      setHasConsented(false);
    }
  }, []);

  const saveToStorage = (prefs: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setHasConsented(true);
    setIsModalOpen(false);
  };

  const acceptAll = () => {
    saveToStorage({
      essential: true,
      preferences: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    });
  };

  const rejectNonEssential = () => {
    saveToStorage({
      essential: true,
      preferences: false,
      analytics: false,
      timestamp: new Date().toISOString(),
    });
  };

  const saveCustomPreferences = (custom: { preferences: boolean; analytics: boolean }) => {
    saveToStorage({
      essential: true,
      preferences: custom.preferences,
      analytics: custom.analytics,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <CookieConsentContext.Provider
      value={{
        preferences,
        hasConsented,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        acceptAll,
        rejectNonEssential,
        saveCustomPreferences,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = (): CookieConsentContextType => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { CookieBanner } from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <CookieConsentProvider>
            <App />
            <CookieBanner />
          </CookieConsentProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

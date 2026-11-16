/**
 * GreenPay API Client for Citizen Web App
 * Supports automatic credentials (httpOnly cookies) and CSRF double-submit token.
 */

// Resolve and normalize API_BASE URL:
// 1. Strip trailing slashes
// 2. Ensure /api/v1 prefix is appended if user provided bare domain (e.g. https://...onrender.com)
const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').trim();
const trimmedBase = rawBase.replace(/\/+$/, '');
const API_BASE = trimmedBase.endsWith('/api/v1') ? trimmedBase : `${trimmedBase}/api/v1`;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getCsrfToken(): string {
  return getCookie('gp_citizen_csrf') || localStorage.getItem('gp_citizen_csrf') || '';
}

export function setStoredCsrfToken(token: string) {
  if (token) {
    localStorage.setItem('gp_citizen_csrf', token);
  }
}

export function getAccessToken(): string {
  return localStorage.getItem('greenpay_access_token') || '';
}

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem('greenpay_access_token', token);
  } else {
    localStorage.removeItem('greenpay_access_token');
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Setup abort controller for guaranteed timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller's signal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  // Attach Bearer token for cross-origin and local authentication reliability
  const accessToken = getAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // State-modifying requests send CSRF double-submit header
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Includes httpOnly cookies
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Connection timed out after ${Math.round(timeoutMs / 1000)}s. GreenPay server did not respond.`);
    }
    throw new Error(err.message || 'Network request failed. Please check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Only attempt refresh if there was previously a token or user session
    const hadPreviousSession = Boolean(getAccessToken() || localStorage.getItem('greenpay_citizen_user'));
    if (hadPreviousSession) {
      try {
        const refreshController = new AbortController();
        const refreshTimer = setTimeout(() => refreshController.abort(), 5000);
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: refreshController.signal,
        });
        clearTimeout(refreshTimer);

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.csrf_token) {
            setStoredCsrfToken(refreshData.csrf_token);
          }
          if (refreshData.access_token) {
            setAccessToken(refreshData.access_token);
          }
          // Retry original request with same options
          return request<T>(endpoint, options);
        }
      } catch {
        // Refresh failed, clear session
        setAccessToken(null);
        localStorage.removeItem('greenpay_citizen_user');
      }
    }
  }

  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  auth: {
    register: async (payload: any) => {
      const res = await request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.csrf_token) setStoredCsrfToken(res.csrf_token);
      if (res.access_token) setAccessToken(res.access_token);
      return res;
    },
    login: async (meter_number_or_email: string, password: string) => {
      const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ meter_number_or_email, password }),
      });
      if (res.csrf_token) setStoredCsrfToken(res.csrf_token);
      if (res.access_token) setAccessToken(res.access_token);
      return res;
    },
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        setAccessToken(null);
        localStorage.removeItem('gp_citizen_csrf');
        localStorage.removeItem('greenpay_citizen_user');
        localStorage.removeItem('greenpay_user');
      }
    },
    refresh: () => request('/auth/refresh', { method: 'POST' }),
  },
  citizen: {
    getProfile: () => request<any>('/citizen/profile'),
    getGreenScore: () => request<any>('/citizen/green-score'),
    getWasteHistory: (limit = 20, offset = 0) =>
      request<any[]>(`/citizen/waste-history?limit=${limit}&offset=${offset}`),
    getCollections: (limit = 20, offset = 0) =>
      request<any[]>(`/citizen/collections?limit=${limit}&offset=${offset}`),
    getCollectionDetail: (id: string) =>
      request<any>(`/citizen/collections/${id}`),
    getEarningHistory: (limit = 20, offset = 0) =>
      request<any[]>(`/citizen/earning-history?limit=${limit}&offset=${offset}`),
    getDryWasteCategories: () =>
      request<any[]>('/waste/categories'),
    getCreditsLedger: (limit = 20, offset = 0) =>
      request<any[]>(`/citizen/credits-ledger?limit=${limit}&offset=${offset}`),
    updateEmailPreferences: (email_marketing_opt_in: boolean) =>
      request('/citizen/email-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ email_marketing_opt_in }),
      }),
    exportData: () => request<any>('/citizen/export-data'),
    deleteAccount: (confirmation: string) =>
      request('/citizen/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation }),
      }),
    sendPhoneOtp: (phone_number: string, sms_consent = true) =>
      request<any>('/citizen/phone/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone_number, sms_consent }),
      }),
    verifyPhoneOtp: (otp: string) =>
      request<any>('/citizen/phone/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp }),
      }),
    getNotifications: (limit = 30) => request<any[]>(`/citizen/notifications?limit=${limit}`),
    markNotificationRead: (id: string) => request(`/citizen/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => request('/citizen/notifications/read-all', { method: 'POST' }),
    getNotificationPreferences: () => request<any>('/citizen/notification-preferences'),
    updateNotificationPreferences: (preferences: any) =>
      request('/citizen/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferences }),
      }),
    getSessions: () => request<any[]>('/citizen/sessions'),
    revokeSession: (session_id: string) =>
      request(`/citizen/sessions/${session_id}/revoke`, { method: 'POST' }),
    getDisputes: () => request<any[]>('/citizen/disputes'),
    getDispute: (id: string) => request<any>(`/citizen/disputes/${id}`),
    createDispute: (formData: FormData) =>
      request<any>('/citizen/disputes', {
        method: 'POST',
        body: formData,
      }),
    createDisputeJson: (payload: any) =>
      request<any>('/citizen/disputes/json', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    respondToDispute: (id: string, response_text: string) =>
      request<any>(`/citizen/disputes/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response_text }),
      }),
    getDisputePhotoUrl: (id: string) => `${API_BASE}/citizen/disputes/${id}/photo`,
    getSchedule: () => request<any>('/citizen/schedule'),
    getIcsDownloadUrl: () => `${API_BASE}/citizen/schedule/export-ics`,
    getPointsBalance: () => request<any>('/citizen/points-balance'),
    getRedemptionCatalogue: () => request<any>('/citizen/redemptions/catalogue'),
    redeemItem: (payload: { item_id: string; custom_amount?: number; donor_name?: string; idempotency_key?: string }) =>
      request<any>('/citizen/redemptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getRedemptionHistory: () => request<any[]>('/citizen/redemptions/history'),
    getCertificatePdfUrl: (certNum: string) => `${API_BASE}/citizen/redemptions/certificate/${certNum}/pdf`,
    getWardFunds: () => request<any[]>('/citizen/redemptions/ward-funds'),
  },

  public: {
    getWardAnalytics: () => request<any>('/admin/analytics/wards'),
    verifyCertificate: (certNum: string) => request<any>(`/public/verify-certificate/${certNum}`),
    getPublicWardFunds: () => request<any[]>('/public/ward-funds'),
    getOpenDataWards: () => request<{ disclaimer: string; threshold: string; data: any[] }>('/public/open-data/wards'),
    getOpenDataMonthlyTrends: (wardId?: string) =>
      request<{ disclaimer: string; trends: any[] }>(`/public/open-data/monthly-trends${wardId ? `?ward_id=${wardId}` : ''}`),
    getOpenDataCsvUrl: () => `${API_BASE}/public/open-data/download-csv`,
  },
};

export const apiClient = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }).then((data) => ({ data })),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }).then((data) => ({ data })),
  patch: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }).then((data) => ({ data })),
  delete: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }).then((data) => ({ data })),
};


/**
 * GreenPay Admin & Supervisor API Client
 * Strict isolation: Uses gp_admin_access cookie and gp_admin_csrf token (Amendment #4).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function getAdminCsrfToken(): string {
  return getCookie('gp_admin_csrf') || localStorage.getItem('gp_admin_csrf') || '';
}

export function setStoredAdminCsrfToken(token: string) {
  if (token) {
    localStorage.setItem('gp_admin_csrf', token);
  }
}

export function getAdminAccessToken(): string {
  return localStorage.getItem('greenpay_admin_access_token') || '';
}

export function setAdminAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem('greenpay_admin_access_token', token);
  } else {
    localStorage.removeItem('greenpay_admin_access_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Attach Bearer token for cross-origin and local authentication reliability
  const accessToken = getAdminAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
    const csrfToken = getAdminCsrfToken();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errorJson = await response.json();
      errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail || errorJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const adminApi = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<any>('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ meter_number_or_email: email, password }),
      });
      if (res.csrf_token) setStoredAdminCsrfToken(res.csrf_token);
      if (res.access_token) setAdminAccessToken(res.access_token);
      return res;
    },
    acceptInvite: async (payload: { invite_token: string; name: string; password: string; phone_number?: string }) => {
      const res = await request<any>('/auth/supervisor-accept-invite', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.csrf_token) setStoredAdminCsrfToken(res.csrf_token);
      if (res.access_token) setAdminAccessToken(res.access_token);
      return res;
    },
    challenge2FA: async (temp_token: string, totp_code?: string, recovery_code?: string) => {
      const res = await request<any>('/auth/admin/2fa-challenge', {
        method: 'POST',
        body: JSON.stringify({ temp_token, totp_code, recovery_code }),
      });
      if (res.csrf_token) setStoredAdminCsrfToken(res.csrf_token);
      if (res.access_token) setAdminAccessToken(res.access_token);
      return res;
    },
    forgotPassword: (identifier: string) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier, portal: 'admin' }),
      }),
    resetPassword: (token: string, new_password: string) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password }),
      }),
    getMe: () => request<any>('/auth/me'),
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        setAdminAccessToken(null);
        localStorage.removeItem('gp_admin_csrf');
        localStorage.removeItem('greenpay_admin_user');
      }
    },
  },
  supervisor: {
    lookupCitizen: (greenpayId: string) =>
      request<any>(`/supervisor/lookup-citizen/${encodeURIComponent(greenpayId)}`),
    activateCitizen: (greenpayId: string) =>
      request<any>(`/supervisor/activate-citizen/${encodeURIComponent(greenpayId)}`, {
        method: 'POST',
      }),
    previewWeighment: (payload: { wet_kg: number; dry_kg: number; hazardous_kg: number; ewaste_kg: number }) =>
      request<any>('/supervisor/preview-weighment', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logWeighment: (payload: {
      greenpay_id: string;
      wet_kg: number;
      dry_kg: number;
      hazardous_kg: number;
      ewaste_kg: number;
      idempotency_key?: string;
      notes?: string;
    }) =>
      request<any>('/supervisor/waste', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    syncOffline: (entries: any[]) =>
      request<{ synced: any[]; rejected: any[] }>('/supervisor/sync-offline', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      }),
  },
  admin: {
    getInvites: () => request<any[]>('/admin/invites'),
    createInvite: (payload: { email: string; name: string; assigned_ward_name: string }) =>
      request<any>('/admin/invites', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getRewardSchedules: () => request<any[]>('/admin/reward-schedules'),
    createRewardSchedule: (payload: {
      rates?: Record<string, number>;
      wet_rate?: number;
      dry_rate?: number;
      hazardous_rate?: number;
      ewaste_rate?: number;
      change_reason: string;
    }) =>
      request<any>('/admin/reward-schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getDryWasteCategories: () => request<any[]>('/admin/dry-waste-categories'),
    updateDryWasteCategory: (
      id: string,
      payload: { rate_per_kg?: number; is_active?: boolean; change_reason?: string }
    ) =>
      request<any>(`/admin/dry-waste-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    getWardAnalytics: () => request<{ wards: any[]; disclaimer: string }>('/admin/analytics/wards'),
    getAnomalies: (statusFilter?: string) => {
      const q = statusFilter ? `?status_filter=${statusFilter}` : '';
      return request<any[]>(`/admin/anomalies${q}`);
    },
    reviewAnomaly: (anomalyId: string, payload: { status: 'VERIFIED_LEGITIMATE' | 'DISMISSED'; review_notes: string }) =>
      request<any>(`/admin/anomalies/${anomalyId}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getForecast: (wardName?: string) => {
      const q = wardName ? `?ward_name=${encodeURIComponent(wardName)}` : '';
      return request<any>(`/admin/forecast${q}`);
    },
    getAuditLogs: (limit = 50, offset = 0) =>
      request<any[]>(`/admin/audit-logs?limit=${limit}&offset=${offset}`),
    enrol2FA: () => request<{ secret: string; otpauth_url: string }>('/admin/2fa/enrol', { method: 'POST' }),
    verify2FA: (code: string) =>
      request<{ is_enabled: boolean; recovery_codes: string[] }>('/admin/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    get2FAStatus: () => request<{ is_enabled: boolean; enrolled_at: string | null }>('/admin/2fa/status'),
    disable2FA: () => request('/admin/2fa/disable', { method: 'POST' }),
    getSessions: () => request<any[]>('/admin/sessions'),
    revokeSession: (sessionId: string) =>
      request(`/admin/sessions/${sessionId}/revoke`, { method: 'POST' }),
    revokeAllSessions: () => request('/admin/sessions/revoke-all', { method: 'POST' }),
    getDisputes: (params?: { ward_id?: string; category?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.ward_id) sp.set('ward_id', params.ward_id);
      if (params?.category) sp.set('category', params.category);
      if (params?.status) sp.set('status', params.status);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<any[]>(`/admin/disputes${qs}`);
    },
    getDispute: (id: string) => request<any>(`/admin/disputes/${id}`),
    resolveDispute: (id: string, decision: string, resolution_notes: string, points_adjustment = 0.0) =>
      request<any>(`/admin/disputes/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision, resolution_notes, points_adjustment }),
      }),
    autoConfirmWeighments: () => request<any>('/admin/disputes/auto-confirm', { method: 'POST' }),
    getDisputePhotoUrl: (id: string) => `${API_BASE}/admin/disputes/${id}/photo`,
    getWards: () => request<any[]>('/admin/wards'),
    getWardSchedules: (wardId: string) => request<any>(`/admin/wards/${wardId}/schedules`),
    createWardSchedule: (wardId: string, payload: any) =>
      request<any>(`/admin/wards/${wardId}/schedules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateWardSchedule: (scheduleId: string, payload: any) =>
      request<any>(`/admin/schedules/${scheduleId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteWardSchedule: (scheduleId: string) =>
      request<any>(`/admin/schedules/${scheduleId}`, {
        method: 'DELETE',
      }),
    createWardOverride: (wardId: string, payload: any) =>
      request<any>(`/admin/wards/${wardId}/overrides`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteWardOverride: (overrideId: string) =>
      request<any>(`/admin/overrides/${overrideId}`, {
        method: 'DELETE',
      }),
    getWardIcsUrl: (wardId: string) => `${API_BASE}/admin/wards/${wardId}/schedule/ics`,
    getRedemptionItems: () => request<any[]>('/admin/redemptions/items'),
    createRedemptionItem: (payload: any) =>
      request<any>('/admin/redemptions/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateRedemptionItem: (itemId: string, payload: {
      credit_cost?: number;
      stock_remaining?: number;
      stock_limit?: number;
      is_active?: boolean;
      title?: string;
      description?: string;
      badge_text?: string;
      change_reason?: string;
    }) =>
      request<any>(`/admin/redemptions/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    addPartnerCoupons: (itemId: string, coupon_codes: string[]) =>
      request<any>(`/admin/redemptions/items/${itemId}/coupons`, {
        method: 'POST',
        body: JSON.stringify({ coupon_codes }),
      }),
    getRedemptionTransactions: (limit = 50) =>
      request<any[]>(`/admin/redemptions/transactions?limit=${limit}`),
    getSupervisors: () => request<any[]>('/admin/supervisors'),
    updateSupervisorStatus: (id: string, payload: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string }) =>
      request<any>(`/admin/supervisors/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    reassignSupervisorWard: (id: string, payload: { ward_id: string; reason?: string }) =>
      request<any>(`/admin/supervisors/${id}/ward`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getWardExportCsvUrl: (wardId: string) => `${API_BASE}/admin/wards/${wardId}/export-csv`,
    getWardExportPdfUrl: (wardId: string) => `${API_BASE}/admin/wards/${wardId}/export-pdf`,
    getDashboardStats: (period = 'all') =>
      request<any>(`/admin/dashboard/stats?period=${period}`),
    getCategoryRateHistory: () =>
      request<any[]>('/admin/dry-waste-categories/history'),
    getCitizens: (params?: { search?: string; ward_id?: string; status?: string; limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.ward_id) sp.set('ward_id', params.ward_id);
      if (params?.status) sp.set('status', params.status);
      if (params?.limit) sp.set('limit', String(params.limit));
      if (params?.offset) sp.set('offset', String(params.offset));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ total: number; citizens: any[] }>(`/admin/citizens${qs}`);
    },
    getCitizenDetail: (citizenId: string) =>
      request<any>(`/admin/citizens/${citizenId}`),
    updateCitizenStatus: (citizenId: string, payload: { status: string; reason?: string }) =>
      request<any>(`/admin/citizens/${citizenId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getAdminCollections: (params?: {
      ward_id?: string;
      supervisor_id?: string;
      citizen_id?: string;
      category_code?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    }) => {
      const sp = new URLSearchParams();
      if (params?.ward_id) sp.set('ward_id', params.ward_id);
      if (params?.supervisor_id) sp.set('supervisor_id', params.supervisor_id);
      if (params?.citizen_id) sp.set('citizen_id', params.citizen_id);
      if (params?.category_code) sp.set('category_code', params.category_code);
      if (params?.status) sp.set('status', params.status);
      if (params?.date_from) sp.set('date_from', params.date_from);
      if (params?.date_to) sp.set('date_to', params.date_to);
      if (params?.limit) sp.set('limit', String(params.limit));
      if (params?.offset) sp.set('offset', String(params.offset));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ total: number; collections: any[] }>(`/admin/collections${qs}`);
    },
    createSupervisor: (payload: {
      name: string;
      email: string;
      password: string;
      ward_id: string;
      staff_id?: string;
      phone_number?: string;
    }) =>
      request<any>('/admin/supervisors', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateSupervisorStaffId: (supervisorId: string, payload: { staff_id: string; reason?: string }) =>
      request<any>(`/admin/supervisors/${supervisorId}/staff-id`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },
};

export const api = adminApi;



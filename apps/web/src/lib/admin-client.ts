import {
  AdminDropDetail,
  AdminDropListItem,
  AbuseReport,
  AbuseReportStatus,
  BlockedSource,
  AuditLogEvent,
  SystemHealthMetrics,
  StorageMetrics,
  TelemetryStatistics,
} from '@n1/shared';

function getAdminApiBaseUrl(): string {
  if (
    process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PUBLIC_API_URL !== 'http://localhost:5000' &&
    process.env.NEXT_PUBLIC_API_URL !== 'http://127.0.0.1:5000'
  ) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://n1-api.onrender.com';
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
}

const ADMIN_TOKEN_KEY = 'n1_admin_token';
const ADMIN_USER_KEY = 'n1_admin_username';

export class AdminApiError extends Error {
  code: string;
  details?: Array<{ field?: string; issue: string }>;

  constructor(message: string, code = 'ADMIN_ERROR', details?: Array<{ field?: string; issue: string }>) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.details = details;
  }
}

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getStoredAdminUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_USER_KEY);
}

export function storeAdminSession(token: string, username: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, username);
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getAdminApiBaseUrl()}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const token = getStoredAdminToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const error = json?.error;
    throw new AdminApiError(
      error?.message || `HTTP ${response.status} - Request failed`,
      error?.code || `HTTP_${response.status}`,
      error?.details
    );
  }

  return json.data as T;
}

// ==========================================
// Authentication APIs
// ==========================================

export async function adminLogin(
  username: string,
  password: string
): Promise<{ token: string; username: string; expiresAt: string }> {
  const data = await adminRequest<{ token: string; username: string; expiresAt: string }>(
    '/api/admin/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }
  );
  storeAdminSession(data.token, data.username);
  return data;
}

export async function getAdminSession(): Promise<{ username: string; role: string }> {
  return adminRequest<{ username: string; role: string }>('/api/admin/auth/me');
}

export async function adminLogout(): Promise<void> {
  try {
    await adminRequest('/api/admin/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network error on logout
  } finally {
    clearAdminSession();
  }
}

// ==========================================
// Drops Moderation APIs
// ==========================================

export interface ListDropsParams {
  status?: string;
  type?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface ListDropsResponse {
  drops: AdminDropListItem[];
  total: number;
  limit: number;
  skip: number;
}

export async function listAdminDrops(params: ListDropsParams = {}): Promise<ListDropsResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.skip) query.set('skip', String(params.skip));

  const qs = query.toString();
  return adminRequest<ListDropsResponse>(`/api/admin/drops${qs ? `?${qs}` : ''}`);
}

export async function getAdminDrop(code: string): Promise<AdminDropDetail> {
  return adminRequest<AdminDropDetail>(`/api/admin/drops/${encodeURIComponent(code)}`);
}

export async function deleteAdminDrop(code: string, reason?: string): Promise<{ message: string }> {
  return adminRequest<{ message: string }>(`/api/admin/drops/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

// ==========================================
// Abuse Reports APIs
// ==========================================

export async function listAbuseReports(status?: string): Promise<AbuseReport[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return adminRequest<AbuseReport[]>(`/api/admin/reports${query}`);
}

export async function updateAbuseReport(
  id: string,
  data: { status: AbuseReportStatus; resolutionNotes?: string }
): Promise<AbuseReport> {
  return adminRequest<AbuseReport>(`/api/admin/reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function submitAbuseReport(
  dropCode: string,
  data: { reason: string; description?: string }
): Promise<{ message: string }> {
  const url = `${getAdminApiBaseUrl()}/api/drop/${encodeURIComponent(dropCode)}/report`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    const error = json?.error;
    throw new AdminApiError(
      error?.message || 'Failed to submit abuse report',
      error?.code || 'REPORT_ERROR'
    );
  }
  return json.data;
}

// ==========================================
// Blocked Sources APIs
// ==========================================

export async function listBlockedSources(): Promise<BlockedSource[]> {
  return adminRequest<BlockedSource[]>('/api/admin/blocked-sources');
}

export async function blockSource(data: {
  ipHash: string;
  reason: string;
  durationHours?: number;
}): Promise<BlockedSource> {
  return adminRequest<BlockedSource>('/api/admin/blocked-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function unblockSource(ipHash: string): Promise<{ message: string }> {
  return adminRequest<{ message: string }>(`/api/admin/blocked-sources/${encodeURIComponent(ipHash)}`, {
    method: 'DELETE',
  });
}

// ==========================================
// System Health & Storage & Stats APIs
// ==========================================

export async function getSystemHealth(): Promise<SystemHealthMetrics> {
  return adminRequest<SystemHealthMetrics>('/api/admin/system/health');
}

export async function getStorageMetrics(): Promise<StorageMetrics> {
  return adminRequest<StorageMetrics>('/api/admin/system/storage');
}

export async function getTelemetryStats(): Promise<TelemetryStatistics> {
  return adminRequest<TelemetryStatistics>('/api/admin/system/stats');
}

// ==========================================
// Audit Logs API
// ==========================================

export interface QueryAuditLogsParams {
  severity?: string;
  eventType?: string;
  limit?: number;
  skip?: number;
}

export interface QueryAuditLogsResponse {
  logs: AuditLogEvent[];
  total: number;
  limit: number;
  skip: number;
}

export async function getAuditLogs(params: QueryAuditLogsParams = {}): Promise<QueryAuditLogsResponse> {
  const query = new URLSearchParams();
  if (params.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params.eventType && params.eventType !== 'all') query.set('eventType', params.eventType);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.skip) query.set('skip', String(params.skip));

  const qs = query.toString();
  return adminRequest<QueryAuditLogsResponse>(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`);
}

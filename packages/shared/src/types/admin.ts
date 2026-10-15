export interface AdminSession {
  token: string;
  username: string;
  expiresAt: string;
}

export interface AdminDropFile {
  id: string;
  originalName: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  checksum: string;
}

export interface AdminDropDetail {
  id: string;
  code: string;
  type: 'text' | 'file';
  textContent: string | null;
  totalSizeBytes: number;
  fileCount: number;
  hasPassword: boolean;
  viewLimit: number | null;
  viewCount: number;
  burnAfterReading: boolean;
  status: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  ipHash: string;
  files: AdminDropFile[];
}

export interface AdminDropListItem {
  id: string;
  code: string;
  type: 'text' | 'file';
  totalSizeBytes: number;
  fileCount: number;
  hasPassword: boolean;
  viewCount: number;
  viewLimit: number | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export type AbuseReportReason =
  | 'malware'
  | 'phishing'
  | 'copyright'
  | 'illegal'
  | 'harassment'
  | 'spam'
  | 'other';

export type AbuseReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface AbuseReport {
  id: string;
  dropCode: string;
  reason: AbuseReportReason;
  description: string;
  reporterIpHash: string;
  status: AbuseReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface BlockedSource {
  id: string;
  ipHash: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export type AuditLogSeverity = 'info' | 'warn' | 'security' | 'critical';

export interface AuditLogEvent {
  id: string;
  eventType: string;
  severity: AuditLogSeverity;
  adminUser: string;
  targetId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipHash?: string;
  timestamp: string;
}

export interface SystemHealthMetrics {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  nodeVersion: string;
  database: {
    status: string;
    latencyMs: number;
  };
  worker: {
    active: boolean;
    intervalSeconds: number;
  };
}

export interface StorageMetrics {
  totalSizeBytes: number;
  fileCount: number;
  rootPathMasked: string;
}

export interface TelemetryStatistics {
  totalDropsCreated: number;
  activeDropsCount: number;
  expiredDropsCount: number;
  burnedDropsCount: number;
  totalViewsCount: number;
  textDropsCount: number;
  fileDropsCount: number;
  totalBytesStored: number;
  totalAbuseReports: number;
  pendingAbuseReports: number;
  blockedSourcesCount: number;
}

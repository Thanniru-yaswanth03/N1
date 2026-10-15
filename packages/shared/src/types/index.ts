import { AllowedExtension } from '../constants/index.js';

export type DropType = 'files' | 'text';
export type DropModelType = 'text' | 'file';

export type DropStatus =
  'ACTIVE' | 'PASSWORD_LOCKED' | 'EXPIRED' | 'VIEW_LIMIT_REACHED' | 'BURNED' | 'MANUALLY_DELETED';

export type DropModelStatus = 'active' | 'expired' | 'burned' | 'deleted';

/**
 * Core Drop Data Model Interface
 * Matching MongoDB Drop document schema
 */
export interface IDrop {
  _id?: string;
  code: string;
  type: DropModelType;
  textContent: string | null;
  totalSizeBytes: number;
  fileCount: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  passwordHash: string | null;
  viewLimit: number | null;
  viewCount: number;
  burnAfterReading: boolean;
  ownerDeleteTokenHash: string;
  ipHash: string;
  status: DropModelStatus;
}

/**
 * Core DropFile Data Model Interface
 * Matching MongoDB DropFile document schema
 */
export interface IDropFile {
  _id?: string;
  dropId: string;
  originalName: string;
  storedName: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  filePath: string;
  checksum: string;
  createdAt: Date;
}

export interface StoredFileMeta {
  id: string;
  originalName: string;
  sanitizedName: string;
  extension: AllowedExtension;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksumSha256?: string;
  createdAt: string;
}

export interface DropEntity {
  id: string;
  code: string;
  type: DropType;
  status: DropStatus;
  textContent?: string;
  files: StoredFileMeta[];
  totalSizeBytes: number;
  fileCount: number;
  hasPassword: boolean;
  burnAfterReading: boolean;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  isPurged: boolean;
}

export interface DropCreateResult {
  code: string;
  shareUrl: string;
  redirectUrl: string;
  deletionToken: string;
  dropType: DropType;
  expiresAt: string;
  fileCount: number;
  totalSizeBytes: number;
  burnAfterReading: boolean;
  isPasswordProtected: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export interface HealthCheckData {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database?: {
    connected: boolean;
    name?: string;
  };
  storage?: {
    driver: string;
    healthy: boolean;
  };
}

export * from './board.js';
export * from './duel.js';
export * from './admin.js';

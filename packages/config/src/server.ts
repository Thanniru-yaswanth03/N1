/**
 * N1 Server Configuration & Environment Defaults
 * 100% Zero-Cost Local Defaults
 */

export const SERVER_DEFAULTS = {
  PORT: 5000,
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:5000',
  STORAGE_DRIVER: 'local' as const,
  LOCAL_STORAGE_PATH: './storage/drops',
  MONGODB_URI: 'mongodb://localhost:27017/n1_drop',
  CLEANUP_INTERVAL_SECONDS: 60,
  TOMBSTONE_RETENTION_SECONDS: 86400,
  RATE_LIMIT: {
    WINDOW_MS: 60_000,
    MAX_REQUESTS: 120,
    UPLOAD_WINDOW_MS: 15 * 60_000,
    UPLOAD_MAX: 15,
    UNLOCK_WINDOW_MS: 5 * 60_000,
    UNLOCK_MAX: 5,
  },
} as const;

export type StorageDriver = 'local' | 's3';

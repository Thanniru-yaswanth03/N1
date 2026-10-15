import dotenv from 'dotenv';
import path from 'node:path';
import { SERVER_DEFAULTS } from '@n1/config';

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export interface ApiEnv {
  NODE_ENV: string;
  PORT: number;
  CLIENT_URL: string;
  API_URL: string;
  STORAGE_DRIVER: 'local' | 's3';
  LOCAL_STORAGE_PATH: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  ADMIN_API_KEY: string;
  CLEANUP_INTERVAL_SECONDS: number;
  TOMBSTONE_RETENTION_SECONDS: number;
}

export const env: ApiEnv = {
  NODE_ENV: process.env['NODE_ENV'] || SERVER_DEFAULTS.NODE_ENV,
  PORT: Number(process.env['PORT']) || SERVER_DEFAULTS.PORT,
  CLIENT_URL: process.env['CLIENT_URL'] || SERVER_DEFAULTS.CLIENT_URL,
  API_URL: process.env['API_URL'] || SERVER_DEFAULTS.API_URL,
  STORAGE_DRIVER:
    (process.env['STORAGE_DRIVER'] as 'local' | 's3') || SERVER_DEFAULTS.STORAGE_DRIVER,
  LOCAL_STORAGE_PATH: process.env['LOCAL_STORAGE_PATH'] || SERVER_DEFAULTS.LOCAL_STORAGE_PATH,
  MONGODB_URI: process.env['MONGODB_URI'] || SERVER_DEFAULTS.MONGODB_URI,
  JWT_SECRET: process.env['JWT_SECRET'] || 'dev_fallback_secret_for_n1_drop_key_32chars_zero_cost',
  ADMIN_USERNAME: process.env['ADMIN_USERNAME'] || 'admin',
  ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] || 'N1SecureAdminPassword2026!',
  ADMIN_API_KEY: process.env['ADMIN_API_KEY'] || 'n1_admin_secret_api_key_32chars_zero_cost_secure',
  CLEANUP_INTERVAL_SECONDS:
    Number(process.env['CLEANUP_INTERVAL_SECONDS']) || SERVER_DEFAULTS.CLEANUP_INTERVAL_SECONDS,
  TOMBSTONE_RETENTION_SECONDS:
    Number(process.env['TOMBSTONE_RETENTION_SECONDS']) ||
    SERVER_DEFAULTS.TOMBSTONE_RETENTION_SECONDS,
};

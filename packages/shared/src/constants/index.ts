/**
 * N1 Platform Canonical Constants
 * Strictly adheres to specifications in PRODUCT_SPEC.md
 */

export const MAX_FILES_PER_DROP = 10;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_TOTAL_DROP_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_TEXT_CHARACTERS = 10_000;

export const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'zip',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const EXPIRY_PRESETS = ['15m', '1h', '6h', '24h', '7d'] as const;
export type ExpiryPreset = (typeof EXPIRY_PRESETS)[number];

export const EXPIRY_DURATIONS_MS: Record<ExpiryPreset, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

export const SHORT_CODE_LENGTH = 6;
export const DELETION_TOKEN_BYTES = 32;

export * from './board-templates.js';
export * from './duel-categories.js';

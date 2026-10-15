import path from 'node:path';
import crypto from 'node:crypto';

export class PathTraversalError extends Error {
  constructor(message: string = 'Path traversal attempt detected') {
    super(message);
    this.name = 'PathTraversalError';
  }
}

// Windows reserved system filenames
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

/**
 * Sanitizes a client-provided filename.
 * Strips path traversal sequences, control characters, null bytes, and forbidden characters.
 * Guarantees a safe filename that will never escape directories or collide with reserved device names.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  let clean = filename;

  // 1. Decode URI components safely if encoded (e.g. %00, %2e%2e)
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep as is if decode fails
  }

  // 2. Strip null bytes, control characters (0x00-0x1F, 0x7F)
  // eslint-disable-next-line no-control-regex
  clean = clean.replace(/[\x00-\x1f\x7f]/g, '');

  // 3. Remove leading/trailing directory paths and traversal patterns (e.g. ../, ..\)
  clean = path.basename(clean);
  clean = clean.replace(/\.\.+[/\\]?/g, '');

  // 4. Remove forbidden filesystem characters (< > : " / \ | ? *)
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');

  // 5. Trim leading/trailing dots and spaces
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');

  // 6. Separate basename and extension
  const ext = path.extname(clean);
  let base = path.basename(clean, ext);

  // 7. Check if basename matches Windows reserved names
  if (WINDOWS_RESERVED_NAMES.has(base.toUpperCase())) {
    base = `safe_${base}`;
  }

  // 8. If empty after sanitization, provide fallback
  if (!base) {
    base = 'unnamed_file';
  }

  // 9. Enforce max filename length (255 characters total)
  const maxBaseLength = Math.max(1, 255 - ext.length);
  const truncatedBase = base.slice(0, maxBaseLength);

  return `${truncatedBase}${ext}`;
}

/**
 * Validates that a target relative path stays strictly within the authorized base directory.
 * Throws PathTraversalError if any escaping sequence (../, symbolic tricks, etc.) is detected.
 */
export function validatePathSafety(baseDir: string, relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.includes('\0')) {
    throw new PathTraversalError('Access denied: Invalid relative path component.');
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);

  // Target must strictly start with resolvedBase + separator (or equal baseDir)
  const isInside =
    resolvedTarget === resolvedBase || resolvedTarget.startsWith(`${resolvedBase}${path.sep}`);

  if (!isInside) {
    throw new PathTraversalError(
      `Access denied: Target path escapes root storage directory.`
    );
  }

  return resolvedTarget;
}

/**
 * Returns true if a path is safe and strictly inside baseDir.
 */
export function isPathSafe(baseDir: string, relativePath: string): boolean {
  try {
    validatePathSafety(baseDir, relativePath);
    return true;
  } catch {
    return false;
  }
}

export interface GeneratedStorageKey {
  storageKey: string;
  storedName: string;
  folder: string;
}

/**
 * Generates an isolated, non-predictable synthetic storage key for an uploaded file.
 * Structure: drops/YYYY-MM/{UUIDv4}.bin
 * Never exposes the client's original filename to disk.
 */
export function generateStorageKey(extension: string = 'bin'): GeneratedStorageKey {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const folder = `drops/${year}-${month}`;

  const cleanExt = extension.replace(/^\./, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const uuid = crypto.randomUUID();
  const storedName = `${uuid}.${cleanExt}`;
  const storageKey = `${folder}/${storedName}`;

  return {
    storageKey,
    storedName,
    folder,
  };
}

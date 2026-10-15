import path from 'node:path';
import { ALLOWED_EXTENSIONS, AllowedExtension } from '@n1/shared';

// Dangerous executable extensions that must never appear in double extensions
const DANGEROUS_EXTENSIONS = new Set([
  'php',
  'php3',
  'php4',
  'php5',
  'phtml',
  'exe',
  'bat',
  'cmd',
  'sh',
  'bash',
  'ps1',
  'vbs',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'py',
  'pl',
  'cgi',
  'jar',
  'war',
  'jsp',
  'asp',
  'aspx',
  'msi',
  'com',
  'scr',
  'hta',
  'svg', // Avoid SVG XML script execution / XSS
]);

/**
 * Mapping of allowed extensions to canonical MIME types.
 */
export const EXTENSION_MIME_MAP: Record<AllowedExtension, string[]> = {
  jpg: ['image/jpeg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain', 'text/plain; charset=utf-8'],
  zip: [
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
    'application/x-compressed',
    'application/octet-stream', // Some clients send generic octet-stream for zip
  ],
};

/**
 * Checks if an extension is on the approved whitelist.
 */
export function isExtensionAllowed(ext: string): ext is AllowedExtension {
  const clean = ext.replace(/^\./, '').toLowerCase().trim();
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(clean);
}

/**
 * Checks if a filename contains dangerous double extensions (e.g. exploit.php.png or invoice.pdf.exe).
 */
export function hasDangerousDoubleExtension(filename: string): boolean {
  if (!filename) return false;

  const parts = filename.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return false;

  const lastPart = parts[parts.length - 1];

  // Case 1: Trailing executable/script disguised with an allowed inner extension (e.g. invoice.pdf.exe)
  if (lastPart && DANGEROUS_EXTENSIONS.has(lastPart)) {
    for (let i = 1; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part && (ALLOWED_EXTENSIONS as readonly string[]).includes(part)) {
        return true;
      }
    }
  }

  // Case 2: Intermediate executable/script disguised with an allowed trailing extension (e.g. exploit.php.png)
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part && DANGEROUS_EXTENSIONS.has(part)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates whether the supplied MIME type matches the allowed extension.
 */
export function isValidMimeForExtension(extension: string, mimeType: string): boolean {
  const cleanExt = extension.replace(/^\./, '').toLowerCase().trim();
  if (!isExtensionAllowed(cleanExt)) return false;

  const allowedMimes = EXTENSION_MIME_MAP[cleanExt];
  if (!allowedMimes) return false;

  const cleanMime = mimeType.toLowerCase().split(';')[0]?.trim() || '';
  return allowedMimes.some((m) => m.toLowerCase().split(';')[0]?.trim() === cleanMime);
}

/**
 * Returns the primary canonical MIME type for an extension.
 */
export function getCanonicalMime(extension: string): string {
  const cleanExt = extension.replace(/^\./, '').toLowerCase().trim();
  if (isExtensionAllowed(cleanExt)) {
    return EXTENSION_MIME_MAP[cleanExt][0] || 'application/octet-stream';
  }
  return 'application/octet-stream';
}

export interface FileMetadataValidationResult {
  valid: boolean;
  extension: string;
  canonicalMime: string;
  error?: string;
}

/**
 * High-level gate validating filename extension, double extension checks, and client MIME.
 */
export function validateFileMetadata(
  originalFilename: string,
  clientMimeType: string
): FileMetadataValidationResult {
  const ext = path.extname(originalFilename).replace(/^\./, '').toLowerCase();

  if (!ext) {
    return {
      valid: false,
      extension: '',
      canonicalMime: 'application/octet-stream',
      error: 'File must have a valid extension',
    };
  }

  if (!isExtensionAllowed(ext)) {
    return {
      valid: false,
      extension: ext,
      canonicalMime: 'application/octet-stream',
      error: `Extension .${ext} is not allowed. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (hasDangerousDoubleExtension(originalFilename)) {
    return {
      valid: false,
      extension: ext,
      canonicalMime: 'application/octet-stream',
      error: 'Dangerous double extension detected',
    };
  }

  if (!isValidMimeForExtension(ext, clientMimeType)) {
    return {
      valid: false,
      extension: ext,
      canonicalMime: getCanonicalMime(ext),
      error: `MIME type '${clientMimeType}' does not match extension .${ext}`,
    };
  }

  return {
    valid: true,
    extension: ext,
    canonicalMime: getCanonicalMime(ext),
  };
}

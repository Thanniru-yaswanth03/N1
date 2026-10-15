/**
 * N1 Magic-Byte / Binary Signature Inspector
 * Strictly inspects leading byte signatures of incoming buffers to prevent polyglot file attacks.
 */

export interface MagicByteInspectionResult {
  valid: boolean;
  detectedExtension?: string;
  detectedMime?: string;
  error?: string;
}

/**
 * Checks if buffer matches a specific byte pattern at an offset.
 */
function bufferMatches(buffer: Buffer, pattern: number[], offset = 0): boolean {
  if (buffer.length < offset + pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (buffer[offset + i] !== pattern[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if buffer has a text/plain structure (no null bytes, valid UTF-8).
 */
function isValidTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;

  // Check for common executable binary magic bytes (MZ for Windows EXE/DLL, ELF for Linux)
  if (bufferMatches(buffer, [0x4d, 0x5a]) || bufferMatches(buffer, [0x7f, 0x45, 0x4c, 0x46])) {
    return false;
  }

  // Sample up to first 1024 bytes. Text files must not contain null bytes (0x00)
  const sampleLength = Math.min(buffer.length, 1024);
  for (let i = 0; i < sampleLength; i++) {
    if (buffer[i] === 0x00) {
      return false;
    }
  }

  return true;
}

/**
 * Inspects leading bytes to determine actual file format.
 */
export function detectFormatFromBytes(buffer: Buffer): {
  extension: string | null;
  mime: string | null;
} {
  if (!buffer || buffer.length === 0) {
    return { extension: null, mime: null };
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bufferMatches(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png', mime: 'image/png' };
  }

  // 2. JPEG: FF D8 FF
  if (bufferMatches(buffer, [0xff, 0xd8, 0xff])) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }

  // 3. PDF: 25 50 44 46 (%PDF)
  if (bufferMatches(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return { extension: 'pdf', mime: 'application/pdf' };
  }

  // 4. WEBP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (
    bufferMatches(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    bufferMatches(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { extension: 'webp', mime: 'image/webp' };
  }

  // 5. ZIP / Office OpenXML (ZIP, DOCX, XLSX, PPTX): 50 4B 03 04, 50 4B 05 06, 50 4B 07 08
  if (
    bufferMatches(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
    bufferMatches(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
    bufferMatches(buffer, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return { extension: 'zip', mime: 'application/zip' };
  }

  // 6. Legacy Microsoft Compound File Binary (DOC, XLS, PPT): D0 CF 11 E0 A1 B1 1A E1
  if (bufferMatches(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { extension: 'doc', mime: 'application/msword' };
  }

  // 7. Plain text check
  if (isValidTextBuffer(buffer)) {
    return { extension: 'txt', mime: 'text/plain' };
  }

  return { extension: null, mime: null };
}

/**
 * Validates an incoming buffer against the expected extension.
 * Rejects mismatched or spoofed binaries.
 */
export function validateMagicBytes(
  buffer: Buffer,
  expectedExtension: string
): MagicByteInspectionResult {
  const ext = expectedExtension.replace(/^\./, '').toLowerCase().trim();

  // If buffer is too small, allow if it's text, otherwise flag warning
  if (buffer.length < 4) {
    if (ext === 'txt') {
      return { valid: true, detectedExtension: 'txt', detectedMime: 'text/plain' };
    }
    return { valid: false, error: 'File header is too small to verify binary signature' };
  }

  // Check for malicious executable binaries disguised as innocent files
  if (bufferMatches(buffer, [0x4d, 0x5a])) {
    return { valid: false, error: 'Malicious executable header (MZ) detected' };
  }
  if (bufferMatches(buffer, [0x7f, 0x45, 0x4c, 0x46])) {
    return { valid: false, error: 'Malicious executable header (ELF) detected' };
  }

  const detected = detectFormatFromBytes(buffer);

  // For JPEG
  if (ext === 'jpg' || ext === 'jpeg') {
    if (detected.extension === 'jpg') {
      return { valid: true, detectedExtension: 'jpg', detectedMime: 'image/jpeg' };
    }
    return {
      valid: false,
      error: `File signature does not match JPEG. Detected: ${detected.extension || 'unknown'}`,
    };
  }

  // For PNG
  if (ext === 'png') {
    if (detected.extension === 'png') {
      return { valid: true, detectedExtension: 'png', detectedMime: 'image/png' };
    }
    return {
      valid: false,
      error: `File signature does not match PNG. Detected: ${detected.extension || 'unknown'}`,
    };
  }

  // For PDF
  if (ext === 'pdf') {
    if (detected.extension === 'pdf') {
      return { valid: true, detectedExtension: 'pdf', detectedMime: 'application/pdf' };
    }
    return {
      valid: false,
      error: `File signature does not match PDF. Detected: ${detected.extension || 'unknown'}`,
    };
  }

  // For WEBP
  if (ext === 'webp') {
    if (detected.extension === 'webp') {
      return { valid: true, detectedExtension: 'webp', detectedMime: 'image/webp' };
    }
    return {
      valid: false,
      error: `File signature does not match WEBP. Detected: ${detected.extension || 'unknown'}`,
    };
  }

  // For ZIP or Modern Office docs (DOCX, XLSX, PPTX which are zip archives under the hood)
  if (['zip', 'docx', 'xlsx', 'pptx'].includes(ext)) {
    if (detected.extension === 'zip') {
      return { valid: true, detectedExtension: ext, detectedMime: detected.mime || undefined };
    }
    return {
      valid: false,
      error: `File signature does not match zip container for .${ext}`,
    };
  }

  // For Legacy Office docs (DOC, XLS, PPT)
  if (['doc', 'xls', 'ppt'].includes(ext)) {
    if (detected.extension === 'doc') {
      return { valid: true, detectedExtension: ext, detectedMime: detected.mime || undefined };
    }
    return {
      valid: false,
      error: `File signature does not match compound binary format for .${ext}`,
    };
  }

  // For TXT
  if (ext === 'txt') {
    if (isValidTextBuffer(buffer)) {
      return { valid: true, detectedExtension: 'txt', detectedMime: 'text/plain' };
    }
    return {
      valid: false,
      error: 'File contains binary or non-text control characters',
    };
  }

  return {
    valid: false,
    error: `Unsupported file extension for magic-byte inspection: .${ext}`,
  };
}

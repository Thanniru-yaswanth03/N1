import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  generateDropCode,
  isValidDropCode,
  generateDeletionToken,
  hashToken,
  hashIp,
  timingSafeEqual,
  verifyDeletionToken,
  hashPassword,
  verifyPassword,
  PasswordSecurityError,
  sanitizeFilename,
  validatePathSafety,
  isPathSafe,
  PathTraversalError,
  generateStorageKey,
  isExtensionAllowed,
  hasDangerousDoubleExtension,
  isValidMimeForExtension,
  validateFileMetadata,
  validateMagicBytes,
  detectFormatFromBytes,
} from '../src/security/index.js';

describe('N1 Security Foundation Unit Tests', () => {
  // ── 1. Cryptographically Secure Drop Code Generator ────────────────────────
  describe('1. Drop Code Generator', () => {
    it('generates a 6-character uppercase alphanumeric code', () => {
      const code = generateDropCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('strictly excludes ambiguous characters (0, O, 1, I)', () => {
      // Generate 200 random codes to test distribution and ambiguous exclusion
      for (let i = 0; i < 200; i++) {
        const code = generateDropCode();
        expect(code).not.toContain('0');
        expect(code).not.toContain('O');
        expect(code).not.toContain('1');
        expect(code).not.toContain('I');
        expect(isValidDropCode(code)).toBe(true);
      }
    });

    it('correctly validates valid and invalid Drop codes', () => {
      expect(isValidDropCode('ABCDEF')).toBe(true);
      expect(isValidDropCode('234567')).toBe(true);
      expect(isValidDropCode('MGS538')).toBe(true);

      // Rejects ambiguous characters
      expect(isValidDropCode('ABCDE0')).toBe(false); // contains 0
      expect(isValidDropCode('ABCDEO')).toBe(false); // contains O
      expect(isValidDropCode('ABCDE1')).toBe(false); // contains 1
      expect(isValidDropCode('ABCDEI')).toBe(false); // contains I

      // Rejects invalid length or characters
      expect(isValidDropCode('SHORT')).toBe(false);
      expect(isValidDropCode('TOOLONG')).toBe(false);
      expect(isValidDropCode('ABC-DE')).toBe(false);
      expect(isValidDropCode('')).toBe(false);
    });
  });

  // ── 2. Owner Deletion Token & Constant-Time Verification ──────────────────
  describe('2. Owner Deletion Token & Constant-Time Hashing', () => {
    it('generates a 64-character hexadecimal deletion token (256 bits)', () => {
      const token = generateDeletionToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('hashes token deterministically using SHA-256', () => {
      const token = 'a'.repeat(64);
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it('verifies valid deletion token in constant time', () => {
      const rawToken = generateDeletionToken();
      const storedHash = hashToken(rawToken);

      expect(verifyDeletionToken(rawToken, storedHash)).toBe(true);
      expect(verifyDeletionToken('invalid_token', storedHash)).toBe(false);
    });

    it('performs constant-time string comparison safely', () => {
      expect(timingSafeEqual('secure_secret_token_123', 'secure_secret_token_123')).toBe(true);
      expect(timingSafeEqual('secure_secret_token_123', 'wrong_token')).toBe(false);
      expect(timingSafeEqual('short', 'longer_string_here')).toBe(false);
    });

    it('hashes IP addresses for privacy-preserving rate limiting', () => {
      const ipHash1 = hashIp('192.168.1.100', 'salt');
      const ipHash2 = hashIp('192.168.1.100', 'salt');
      expect(ipHash1).toHaveLength(64);
      expect(ipHash1).toBe(ipHash2);
      expect(ipHash1).not.toContain('192.168');
    });
  });

  // ── 3. Password Hashing & Verification ─────────────────────────────────────
  describe('3. Password Hashing & Verification Service', () => {
    it('hashes password with bcrypt and verifies correctly', async () => {
      const password = 'SuperSecretPassphrase!2026';
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
      expect(hash).not.toContain(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword123', hash);
      expect(isInvalid).toBe(false);
    });

    it('rejects empty passwords', async () => {
      await expect(hashPassword('')).rejects.toThrow(PasswordSecurityError);
      await expect(hashPassword('   ')).rejects.toThrow(PasswordSecurityError);
    });

    it('rejects passwords exceeding 128 characters', async () => {
      const tooLong = 'a'.repeat(129);
      await expect(hashPassword(tooLong)).rejects.toThrow(PasswordSecurityError);
    });

    it('handles malformed hash verification gracefully without throwing', async () => {
      const result = await verifyPassword('password', 'malformed_non_bcrypt_hash');
      expect(result).toBe(false);
    });
  });

  // ── 4. Filename Sanitization & Path Traversal Protection ───────────────────
  describe('4. Filename Sanitization & Path Traversal Protection', () => {
    it('strips directory traversal sequences from filenames', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('../../../../secret.pdf')).toBe('secret.pdf');
    });

    it('strips control characters and null bytes', () => {
      expect(sanitizeFilename('image\0.png')).toBe('image.png');
      expect(sanitizeFilename('exploit\x00\x1f.pdf')).toBe('exploit.pdf');
    });

    it('removes forbidden characters (< > : " | ? *)', () => {
      expect(sanitizeFilename('file<name>:test"photo|doc?foo*bar.jpg')).toBe(
        'file_name__test_photo_doc_foo_bar.jpg'
      );
    });

    it('extracts filename from nested directory paths', () => {
      expect(sanitizeFilename('uploads/images/nested\\photo.png')).toBe('photo.png');
    });

    it('prefixes Windows reserved device names to prevent OS crashes', () => {
      expect(sanitizeFilename('CON.txt')).toBe('safe_CON.txt');
      expect(sanitizeFilename('NUL.png')).toBe('safe_NUL.png');
      expect(sanitizeFilename('prn.pdf')).toBe('safe_prn.pdf');
      expect(sanitizeFilename('com1.dat')).toBe('safe_com1.dat');
    });

    it('handles empty or blank filenames gracefully with safe fallback', () => {
      expect(sanitizeFilename('')).toBe('unnamed_file');
      expect(sanitizeFilename('   ')).toBe('unnamed_file');
      expect(sanitizeFilename('.')).toBe('unnamed_file');
      expect(sanitizeFilename('..')).toBe('unnamed_file');
    });

    it('truncates excessively long filenames while preserving extension', () => {
      const longName = `${'a'.repeat(300)}.pdf`;
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.pdf')).toBe(true);
    });

    it('validates that paths do not escape the authorized base directory', () => {
      const baseDir = path.resolve('storage/drops');

      // Valid relative path
      expect(() => validatePathSafety(baseDir, '2026-09/file.bin')).not.toThrow();
      expect(isPathSafe(baseDir, '2026-09/file.bin')).toBe(true);

      // Traversal attacks escaping baseDir
      expect(() => validatePathSafety(baseDir, '../../outside.txt')).toThrow(PathTraversalError);
      expect(isPathSafe(baseDir, '../../outside.txt')).toBe(false);
      expect(isPathSafe(baseDir, '../..')).toBe(false);
      expect(isPathSafe(baseDir, '/etc/passwd')).toBe(false);
    });

    it('generates non-predictable synthetic storage keys', () => {
      const { storageKey, storedName, folder } = generateStorageKey('png');
      expect(storageKey).toMatch(/^drops\/\d{4}-\d{2}\/[a-f0-9-]+\.png$/);
      expect(storedName).toMatch(/^[a-f0-9-]+\.png$/);
      expect(folder).toMatch(/^drops\/\d{4}-\d{2}$/);
    });
  });

  // ── 5. Extension Whitelist & Double Extension Detection ─────────────────────
  describe('5. Extension Whitelist & MIME Validation', () => {
    it('accepts allowed extensions', () => {
      const valid = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'];
      valid.forEach((ext) => {
        expect(isExtensionAllowed(ext)).toBe(true);
        expect(isExtensionAllowed(`.${ext}`)).toBe(true);
        expect(isExtensionAllowed(ext.toUpperCase())).toBe(true);
      });
    });

    it('rejects disallowed and dangerous extensions', () => {
      const dangerous = ['exe', 'php', 'sh', 'bat', 'cmd', 'js', 'py', 'svg', 'html', 'apk', 'iso'];
      dangerous.forEach((ext) => {
        expect(isExtensionAllowed(ext)).toBe(false);
      });
    });

    it('detects dangerous double extensions', () => {
      expect(hasDangerousDoubleExtension('photo.php.jpg')).toBe(true);
      expect(hasDangerousDoubleExtension('document.exe.pdf')).toBe(true);
      expect(hasDangerousDoubleExtension('test.js.png')).toBe(true);
      expect(hasDangerousDoubleExtension('invoice.vbs.docx')).toBe(true);

      // Harmless dots in filename
      expect(hasDangerousDoubleExtension('my.cool.photo.jpg')).toBe(false);
      expect(hasDangerousDoubleExtension('annual.report.2026.pdf')).toBe(false);
    });

    it('validates MIME types matching allowed extensions', () => {
      expect(isValidMimeForExtension('png', 'image/png')).toBe(true);
      expect(isValidMimeForExtension('jpg', 'image/jpeg')).toBe(true);
      expect(isValidMimeForExtension('pdf', 'application/pdf')).toBe(true);
      expect(isValidMimeForExtension('zip', 'application/zip')).toBe(true);

      // Mismatched MIME
      expect(isValidMimeForExtension('png', 'application/x-php')).toBe(false);
      expect(isValidMimeForExtension('pdf', 'text/html')).toBe(false);
    });

    it('validates complete file metadata via validateFileMetadata', () => {
      // Valid file
      const validResult = validateFileMetadata('presentation.pdf', 'application/pdf');
      expect(validResult.valid).toBe(true);
      expect(validResult.extension).toBe('pdf');
      expect(validResult.canonicalMime).toBe('application/pdf');

      // Invalid extension
      const invalidExt = validateFileMetadata('script.php', 'application/x-php');
      expect(invalidExt.valid).toBe(false);
      expect(invalidExt.error).toContain('not allowed');

      // Double extension
      const doubleExt = validateFileMetadata('safe.php.png', 'image/png');
      expect(doubleExt.valid).toBe(false);
      expect(doubleExt.error).toContain('double extension');

      // Mismatched MIME
      const mimeMismatch = validateFileMetadata('photo.jpg', 'application/x-executable');
      expect(mimeMismatch.valid).toBe(false);
    });
  });

  // ── 6. Magic-Byte Binary Signature Validation ─────────────────────────────
  describe('6. Magic-Byte & Binary Signature Inspection', () => {
    it('detects PNG binary signatures', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const result = validateMagicBytes(pngHeader, 'png');
      expect(result.valid).toBe(true);
      expect(result.detectedExtension).toBe('png');
    });

    it('detects JPEG binary signatures', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const result = validateMagicBytes(jpegHeader, 'jpg');
      expect(result.valid).toBe(true);
      expect(result.detectedExtension).toBe('jpg');
    });

    it('detects PDF binary signatures (%PDF)', () => {
      const pdfHeader = Buffer.from('%PDF-1.7 header stream content');
      const result = validateMagicBytes(pdfHeader, 'pdf');
      expect(result.valid).toBe(true);
      expect(result.detectedExtension).toBe('pdf');
    });

    it('detects WEBP binary signatures (RIFF....WEBP)', () => {
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // Size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const result = validateMagicBytes(webpHeader, 'webp');
      expect(result.valid).toBe(true);
      expect(result.detectedExtension).toBe('webp');
    });

    it('detects ZIP and Office OpenXML signatures (PK..)', () => {
      const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x08]);
      expect(validateMagicBytes(zipHeader, 'zip').valid).toBe(true);
      expect(validateMagicBytes(zipHeader, 'docx').valid).toBe(true);
      expect(validateMagicBytes(zipHeader, 'xlsx').valid).toBe(true);
      expect(validateMagicBytes(zipHeader, 'pptx').valid).toBe(true);
    });

    it('detects valid UTF-8 plain text buffers', () => {
      const textBuffer = Buffer.from('Hello world! Confidential notes on N1 drop.');
      const result = validateMagicBytes(textBuffer, 'txt');
      expect(result.valid).toBe(true);
      expect(result.detectedExtension).toBe('txt');
    });

    it('rejects Windows MZ executable disguised as PDF or JPEG', () => {
      const exeDisguised = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ header
      const pdfCheck = validateMagicBytes(exeDisguised, 'pdf');
      expect(pdfCheck.valid).toBe(false);
      expect(pdfCheck.error).toContain('executable');

      const jpgCheck = validateMagicBytes(exeDisguised, 'jpg');
      expect(jpgCheck.valid).toBe(false);
      expect(jpgCheck.error).toContain('executable');
    });

    it('rejects Linux ELF binary disguised as image', () => {
      const elfDisguised = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]); // ELF header
      const pngCheck = validateMagicBytes(elfDisguised, 'png');
      expect(pngCheck.valid).toBe(false);
      expect(pngCheck.error).toContain('executable');
    });

    it('rejects mismatched binary signatures (e.g. JPEG buffer renamed to .png)', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = validateMagicBytes(jpegHeader, 'png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match PNG');
    });

    it('detectFormatFromBytes identifies formats accurately', () => {
      const pdf = Buffer.from('%PDF-1.4');
      expect(detectFormatFromBytes(pdf).extension).toBe('pdf');

      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectFormatFromBytes(png).extension).toBe('png');
    });
  });
});

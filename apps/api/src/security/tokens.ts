import crypto from 'node:crypto';

/**
 * Unambiguous 32-character base charset.
 * Explicitly excludes: '0', 'O', '1', 'I'
 * 32 characters = 2^5 bits (uniform distribution without modulo bias)
 */
export const UNAMBIGUOUS_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const DROP_CODE_LENGTH = 6;
export const DELETION_TOKEN_BYTES = 32;

/**
 * Generates a cryptographically secure 6-character uppercase alphanumeric Drop code.
 * Excludes ambiguous characters (0, O, 1, I).
 */
export function generateDropCode(length: number = DROP_CODE_LENGTH): string {
  if (length <= 0) {
    throw new Error('Code length must be greater than 0');
  }

  // 32 characters means 5 bits per character.
  // Generate random bytes and map to charset
  const bytes = crypto.randomBytes(length);
  let code = '';

  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte === undefined) continue;
    // Mask with 0x1F (31) to pick an index between 0 and 31
    const charIndex = byte & 0x1f;
    code += UNAMBIGUOUS_CHARSET[charIndex];
  }

  return code;
}

/**
 * Validates whether a given code adheres to the unambiguous Drop code format.
 */
export function isValidDropCode(code: string, length: number = DROP_CODE_LENGTH): boolean {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== length) return false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (!char || !UNAMBIGUOUS_CHARSET.includes(char)) {
      return false;
    }
  }

  return true;
}

/**
 * Generates a cryptographically secure 32-byte owner deletion token (64 hex characters).
 */
export function generateDeletionToken(): string {
  return crypto.randomBytes(DELETION_TOKEN_BYTES).toString('hex');
}

/**
 * Hashes a token using SHA-256 for secure database storage.
 * Raw deletion tokens are never stored in plaintext.
 */
export function hashToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Hashes an IP address using SHA-256 with optional salt for privacy-preserving rate limiting.
 */
export function hashIp(ip: string, salt = ''): string {
  if (!ip) return '';
  return crypto.createHash('sha256').update(`${salt}:${ip.trim()}`).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Safely compares two strings in fixed time regardless of length mismatches.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Verifies a raw deletion token against a stored SHA-256 hash using constant-time comparison.
 */
export function verifyDeletionToken(rawToken: string, storedHash: string): boolean {
  if (!rawToken || !storedHash) return false;
  const computedHash = hashToken(rawToken);
  return timingSafeEqual(computedHash, storedHash);
}

/**
 * Creates a cryptographically signed, stateless unlock token for a password-protected drop.
 * Structure: base64url(payload).hmacSignature
 */
export function createUnlockToken(
  code: string,
  dropExpiresAt: Date,
  secret: string
): string {
  const now = Date.now();
  // Valid for 1 hour or until drop expires (whichever is earlier)
  const maxTtlMs = 60 * 60 * 1000;
  const exp = Math.min(now + maxTtlMs, dropExpiresAt.getTime());

  const payload = JSON.stringify({ code: code.toUpperCase().trim(), exp });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(b64Payload)
    .digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifies that an unlock token is authentic, untampered, unexpired, and matches the requested Drop code.
 */
export function verifyUnlockToken(
  token: string,
  expectedCode: string,
  secret: string
): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [b64Payload, signature] = parts;
  if (!b64Payload || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(b64Payload)
    .digest('base64url');

  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const jsonStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    if (parsed.code !== expectedCode.toUpperCase().trim()) {
      return false;
    }

    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

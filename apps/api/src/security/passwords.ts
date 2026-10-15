import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 1;

export class PasswordSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordSecurityError';
  }
}

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 * Enforces length boundaries to prevent bcrypt DoS.
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string') {
    throw new PasswordSecurityError('Password must be a string');
  }

  const trimmed = password.trim();

  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordSecurityError('Password cannot be empty');
  }

  if (trimmed.length > MAX_PASSWORD_LENGTH) {
    throw new PasswordSecurityError(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  return bcrypt.hash(trimmed, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash in constant time.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  try {
    return await bcrypt.compare(password.trim(), hash);
  } catch {
    return false;
  }
}

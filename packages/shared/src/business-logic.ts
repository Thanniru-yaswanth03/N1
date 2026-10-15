/**
 * N1 Business Logic: Reward Calculations, Eligibility Rules, and Referral Logic
 */

export interface DuelRewardOptions {
  basePoints?: number;
  timeElapsedMs: number;
  timeLimitMs: number;
  streakCount: number;
  isCorrect: boolean;
}

export interface DuelRewardResult {
  isCorrect: boolean;
  basePoints: number;
  timeBonus: number;
  streakMultiplier: number;
  totalReward: number;
}

/**
 * Calculates duel quiz rewards with dynamic time decay and streak multipliers.
 */
export function calculateDuelReward(options: DuelRewardOptions): DuelRewardResult {
  const {
    basePoints = 100,
    timeElapsedMs,
    timeLimitMs,
    streakCount,
    isCorrect,
  } = options;

  if (!isCorrect) {
    return {
      isCorrect: false,
      basePoints: 0,
      timeBonus: 0,
      streakMultiplier: 1.0,
      totalReward: 0,
    };
  }

  // Time bonus: up to 50 points if answered in under 20% of the limit, decaying linearly to 0
  const clampedElapsed = Math.max(0, Math.min(timeElapsedMs, timeLimitMs));
  const remainingFraction = Math.max(0, (timeLimitMs - clampedElapsed) / timeLimitMs);
  const timeBonus = Math.round(remainingFraction * 50);

  // Streak multiplier: 1.0x (0-1), 1.25x (2), 1.5x (3-4), 2.0x (5+)
  let streakMultiplier = 1.0;
  if (streakCount >= 5) {
    streakMultiplier = 2.0;
  } else if (streakCount >= 3) {
    streakMultiplier = 1.5;
  } else if (streakCount >= 2) {
    streakMultiplier = 1.25;
  }

  const subtotal = basePoints + timeBonus;
  const totalReward = Math.round(subtotal * streakMultiplier);

  return {
    isCorrect: true,
    basePoints,
    timeBonus,
    streakMultiplier,
    totalReward,
  };
}

export interface ReferralTierResult {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  bonusPoints: number;
  badge: string;
  nextTierRemaining: number;
}

/**
 * Calculates referral rewards and tiered milestone bonuses for sharing drops/duel rooms.
 */
export function calculateReferralReward(referralCount: number): ReferralTierResult {
  const count = Math.max(0, referralCount);

  if (count >= 25) {
    return {
      tier: 'PLATINUM',
      bonusPoints: 2500,
      badge: 'Drop Ambassador',
      nextTierRemaining: 0,
    };
  }
  if (count >= 10) {
    return {
      tier: 'GOLD',
      bonusPoints: 1000,
      badge: 'Power Sharer',
      nextTierRemaining: 25 - count,
    };
  }
  if (count >= 3) {
    return {
      tier: 'SILVER',
      bonusPoints: 300,
      badge: 'Community Contributor',
      nextTierRemaining: 10 - count,
    };
  }
  return {
    tier: 'BRONZE',
    bonusPoints: count * 50,
    badge: 'Initiate Sharer',
    nextTierRemaining: 3 - count,
  };
}

export interface DropEligibilityOptions {
  status: string;
  expiresAt: Date | string;
  maxViews?: number | null;
  viewCount?: number;
}

export interface DropEligibilityResult {
  eligible: boolean;
  reason?: 'EXPIRED' | 'VIEW_LIMIT_REACHED' | 'BURNED' | 'DELETED' | 'INACTIVE';
}

/**
 * Evaluates whether a drop is eligible to be viewed or accessed by a recipient.
 */
export function checkDropEligibility(options: DropEligibilityOptions): DropEligibilityResult {
  const { status, expiresAt, maxViews, viewCount = 0 } = options;

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'deleted') {
    return { eligible: false, reason: 'DELETED' };
  }
  if (normalizedStatus === 'burned') {
    return { eligible: false, reason: 'BURNED' };
  }
  if (normalizedStatus === 'expired') {
    return { eligible: false, reason: 'EXPIRED' };
  }
  if (normalizedStatus === 'view_limit_reached') {
    return { eligible: false, reason: 'VIEW_LIMIT_REACHED' };
  }

  // Check TTL timestamp
  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime) || Date.now() >= expiryTime) {
    return { eligible: false, reason: 'EXPIRED' };
  }

  // Check view limits
  if (typeof maxViews === 'number' && maxViews > 0 && viewCount >= maxViews) {
    return { eligible: false, reason: 'VIEW_LIMIT_REACHED' };
  }

  if (normalizedStatus !== 'active' && normalizedStatus !== 'password_locked') {
    return { eligible: false, reason: 'INACTIVE' };
  }

  return { eligible: true };
}

export interface ClaimEligibilityOptions {
  dropStatus: string;
  burnAfterReading: boolean;
  alreadyClaimed: boolean;
  isExpired: boolean;
}

export interface ClaimEligibilityResult {
  canClaim: boolean;
  reason?: 'ALREADY_CLAIMED' | 'NOT_A_BURN_DROP' | 'DROP_EXPIRED' | 'INVALID_STATUS';
}

/**
 * Evaluates claim eligibility for single-use burn-after-reading drops to prevent duplicate claims.
 */
export function checkClaimEligibility(options: ClaimEligibilityOptions): ClaimEligibilityResult {
  const { dropStatus, burnAfterReading, alreadyClaimed, isExpired } = options;

  if (isExpired || dropStatus.toLowerCase() === 'expired') {
    return { canClaim: false, reason: 'DROP_EXPIRED' };
  }
  if (!burnAfterReading) {
    return { canClaim: false, reason: 'NOT_A_BURN_DROP' };
  }
  if (alreadyClaimed || dropStatus.toLowerCase() === 'burned') {
    return { canClaim: false, reason: 'ALREADY_CLAIMED' };
  }
  if (dropStatus.toLowerCase() !== 'active') {
    return { canClaim: false, reason: 'INVALID_STATUS' };
  }

  return { canClaim: true };
}

export interface ReferralValidationOptions {
  referralCode: string;
  currentDropCode?: string;
}

export interface ReferralValidationResult {
  valid: boolean;
  normalizedCode?: string;
  error?: 'INVALID_FORMAT' | 'SELF_REFERRAL' | 'EMPTY_CODE';
}

/**
 * Validates referral / tracking codes, preventing self-referral and format abuse.
 */
export function validateReferralCode(options: ReferralValidationOptions): ReferralValidationResult {
  const { referralCode, currentDropCode } = options;

  if (!referralCode || typeof referralCode !== 'string' || referralCode.trim().length === 0) {
    return { valid: false, error: 'EMPTY_CODE' };
  }

  const normalized = referralCode.trim().toUpperCase();

  // Codes must be exactly 6 uppercase alphanumeric characters
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  // Prevent self-referral
  if (currentDropCode && normalized === currentDropCode.trim().toUpperCase()) {
    return { valid: false, error: 'SELF_REFERRAL' };
  }

  return {
    valid: true,
    normalizedCode: normalized,
  };
}
